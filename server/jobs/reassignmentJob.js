const Patient = require('../models/Patient');
const Shift = require('../models/Shift');
const Staff = require('../models/Staff');
const RedisQueueService = require('../services/RedisQueueService');
const StateService = require('../services/StateService');
const SmsService = require('../services/SmsService');
let ioInstance = null;
const logger = require('../config/logger');

async function checkAndReassignPatients() {
  try {
    const now = new Date();
    
    // Find all patients waiting for a specific doctor
    const waitingPatients = await Patient.find({ status: 'waiting_doctor' }).populate('assignedDoctor');
    logger.info(`Reassignment job running: Found ${waitingPatients.length} waiting patients.`);

    for (const patient of waitingPatients) {
      if (!patient.assignedDoctor) continue; // Should not happen, but safeguard

      // Check if the assigned doctor has an active shift
      const activeShift = await Shift.findOne({
        staffId: patient.assignedDoctor._id,
        startTime: { $lte: now },
        endTime: { $gte: now }
      });

      // If doctor is still on shift, patient is fine.
      if (activeShift) continue;

      logger.info(`Doctor ${patient.assignedDoctor.name} went off-shift while Patient ${patient.ticketId} is waiting. Initiating reassignment...`);
      
      const doctorSpecialty = patient.assignedDoctor.specialty;
      
      // 1. Find other active doctors with the same specialty
      const otherActiveShifts = await Shift.find({
        staffId: { $ne: patient.assignedDoctor._id },
        startTime: { $lte: now },
        endTime: { $gte: now }
      }).populate('staffId');

      const matchingDoctors = otherActiveShifts
        .filter(shift => shift.staffId && shift.staffId.role === 'doctor' && shift.staffId.specialty === doctorSpecialty)
        .map(shift => shift.staffId);

      const io = ioInstance; // Use injected io

      // 2. Reassign logic
      if (matchingDoctors.length > 0) {
        // Find the matching doctor with the shortest queue
        let bestDoctor = null;
        let shortestQueueLen = Infinity;

        for (const doc of matchingDoctors) {
          const queueLen = await RedisQueueService.getQueueLength(`queue:doctor:${doc._id}`);
          if (queueLen < shortestQueueLen) {
            shortestQueueLen = queueLen;
            bestDoctor = doc;
          }
        }

        // Reassign the patient to the best doctor
        
        // Remove from old queue
        await RedisQueueService.removeFromQueue(`queue:doctor:${patient.assignedDoctor._id}`, patient._id);
        
        // Add to new queue
        await RedisQueueService.addToQueue(`queue:doctor:${bestDoctor._id}`, patient._id, patient.priority);
        
        // Update database explicitly since status stays 'waiting_doctor' but doctor changes
        patient.assignedDoctor = bestDoctor._id;
        patient.auditLog.push({
          fromStatus: 'waiting_doctor',
          toStatus: 'waiting_doctor',
          actorId: 'system',
          actorRole: 'system',
          note: `Auto-reassigned from ${patient.assignedDoctor.name} to ${bestDoctor.name} due to shift end.`,
          timestamp: new Date()
        });
        await patient.save();

        logger.info(`Successfully reassigned Patient ${patient.ticketId} to Doctor ${bestDoctor.name}`);

        // Dispatch notifications
        if (io) {
          io.to(`doctor:${bestDoctor._id}`).emit('queue:doctor:updated');
          io.to(`patient:${patient._id}`).emit('patient:status_changed');
        }

        // Send SMS
        await SmsService.sendNotification(patient.phone, `Your previous doctor is no longer available. We have seamlessly reassigned you to Dr. ${bestDoctor.name}. You are #${shortestQueueLen + 1} in their queue.`);
      
      } else {
        // 3. Fallback: No matching doctors available. Return to general queue.
        logger.warn(`No active doctors with specialty ${doctorSpecialty} found. Returning Patient ${patient.ticketId} to general queue.`);
        
        // We bypass the strict StateService valid transitions for this emergency fallback
        await RedisQueueService.removeFromQueue(`queue:doctor:${patient.assignedDoctor._id}`, patient._id);
        await RedisQueueService.addToQueue('queue:general', patient._id, patient.priority);
        
        const previousDoctorName = patient.assignedDoctor.name;
        patient.status = 'waiting_general';
        patient.assignedDoctor = null;
        patient.auditLog.push({
          fromStatus: 'waiting_doctor',
          toStatus: 'waiting_general',
          actorId: 'system',
          actorRole: 'system',
          note: `Auto-returned to general queue. No doctors available for specialty ${doctorSpecialty} after ${previousDoctorName} went off-shift.`,
          timestamp: new Date()
        });
        await patient.save();

        if (io) {
          io.emit('queue:admin:updated');
          io.to(`patient:${patient._id}`).emit('patient:status_changed');
        }

        // Send SMS
        await SmsService.sendNotification(patient.phone, `Dr. ${previousDoctorName} is no longer available. You have been returned to the general waiting queue for reassignment. Please speak to the receptionist if you have questions.`);
      }
    }
  } catch (error) {
    logger.error(`Error in checkAndReassignPatients job: ${error.message}`);
  }
}

let jobInterval = null;

function startReassignmentJob(io, intervalMs = 60000) {
  ioInstance = io;
  if (jobInterval) clearInterval(jobInterval);
  jobInterval = setInterval(checkAndReassignPatients, intervalMs);
  logger.info(`Reassignment job started (runs every ${intervalMs / 1000}s)`);
}

function stopReassignmentJob() {
  if (jobInterval) {
    clearInterval(jobInterval);
    jobInterval = null;
    logger.info('Reassignment job stopped');
  }
}

module.exports = {
  checkAndReassignPatients,
  startReassignmentJob,
  stopReassignmentJob
};
