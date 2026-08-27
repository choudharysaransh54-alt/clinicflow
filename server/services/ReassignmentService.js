const Patient = require('../models/Patient');
const Staff = require('../models/Staff');
const Shift = require('../models/Shift');
const StateService = require('./StateService');
const RedisQueueService = require('./RedisQueueService');
const SmsService = require('./SmsService');
const logger = require('../config/logger');

class ReassignmentService {
  /**
   * Called when a doctor's shift ends.
   * Finds all patients waiting for this doctor and reassigns them if another doctor of the same specialty is online.
   * @param {string} offlineDoctorId 
   * @param {object} io - Socket.io instance
   */
  static async handleDoctorOffline(offlineDoctorId, io) {
    try {
      const offlineDoctor = await Staff.findById(offlineDoctorId);
      if (!offlineDoctor || offlineDoctor.role !== 'doctor') return;

      const queueKey = `queue:doctor:${offlineDoctorId}`;
      const patientIds = await RedisQueueService.getFullQueue(queueKey);
      
      if (patientIds.length === 0) return; // No one to reassign

      const specialty = offlineDoctor.specialty || 'General';

      // Find all active shifts for doctors with the same specialty
      const now = new Date();
      const activeShifts = await Shift.find({
        startTime: { $lte: now },
        endTime: { $gte: now }
      }).populate('staffId');

      const onlineDoctors = activeShifts
        .map(shift => shift.staffId)
        .filter(doc => doc && doc.role === 'doctor' && doc.specialty === specialty && doc._id.toString() !== offlineDoctorId.toString());

      if (onlineDoctors.length === 0) {
        logger.info(`Doctor ${offlineDoctor.name} went offline. No alternative doctors available for specialty: ${specialty}. Patients remain in queue.`);
        
        // Find next future shift for this specialty to send in SMS
        const nextShift = await Shift.findOne({
          startTime: { $gt: now },
          department: specialty
        }).sort({ startTime: 1 });

        // Notify all waiting patients that their doctor is offline and no replacements are available
        for (const patientId of patientIds) {
          const patient = await Patient.findById(patientId);
          if (patient && patient.phone && patient.status === 'waiting_doctor') {
            let message = `ClinicFlow: Dr. ${offlineDoctor.name} has gone offline. `;
            if (nextShift) {
              const timeString = new Date(nextShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              message += `The next available doctor for ${specialty} will be online at ${timeString}. Your place in line is saved.`;
            } else {
              message += `There are no upcoming shifts scheduled for ${specialty} today. Please check with the receptionist.`;
            }
            const idempotencyKey = `offline-${offlineDoctorId}-${patientId}`;
            try {
              await SmsService.sendNotification(patient.phone, message, { idempotencyKey });
            } catch (err) {}
          }
        }
        
        return; // Next available shift logic is handled dynamically in the status API
      }

      // Find the online doctor with the shortest queue
      let selectedDoctorId = null;
      let minQueueLength = Infinity;

      for (const doc of onlineDoctors) {
        const len = await RedisQueueService.getQueueLength(`queue:doctor:${doc._id}`);
        if (len < minQueueLength) {
          minQueueLength = len;
          selectedDoctorId = doc._id.toString();
        }
      }

      if (!selectedDoctorId) return;

      logger.info(`Reassigning ${patientIds.length} patients from offline doctor ${offlineDoctor.name} to doctor ${selectedDoctorId}`);

      for (const patientId of patientIds) {
        const patient = await Patient.findById(patientId);
        if (!patient || patient.status !== 'waiting_doctor') continue;

        patient.assignedDoctor = selectedDoctorId;
        patient.transferHistory.push({
          fromDoctor: offlineDoctorId,
          toDoctor: selectedDoctorId,
          reason: 'Auto-reassigned due to doctor going offline',
          transferredAt: now
        });
        patient.auditLog.push({
          fromStatus: 'waiting_doctor',
          toStatus: 'waiting_doctor',
          actorId: 'system',
          actorRole: 'system',
          note: 'Auto-reassigned due to doctor offline',
          timestamp: now
        });
        await patient.save();

        await RedisQueueService.removeFromQueue(queueKey, patientId);
        await RedisQueueService.addToQueue(`queue:doctor:${selectedDoctorId}`, patientId, patient.priority);

        // Emit updates
        if (io) {
          io.to(`doctor:${offlineDoctorId}`).emit('queue:doctor:updated');
          io.to(`doctor:${selectedDoctorId}`).emit('queue:doctor:updated');
          io.to('admin').emit('queue:admin:updated');
          io.to(`patient:${patientId}`).emit('patient:status_changed', { status: 'waiting_doctor' });
        }

        // Send SMS notification
        if (patient.phone) {
          const selectedDoc = onlineDoctors.find(d => d._id.toString() === selectedDoctorId);
          const docName = selectedDoc ? selectedDoc.name : 'another specialist';
          const message = `ClinicFlow: Dr. ${offlineDoctor.name} went offline. You have been seamlessly transferred to Dr. ${docName}. Your queue status is updated!`;
          const idempotencyKey = `transfer-${offlineDoctorId}-${selectedDoctorId}-${patientId}`;
          try {
            await SmsService.sendNotification(patient.phone, message, { idempotencyKey });
          } catch (err) {}
        }
      }
    } catch (error) {
      logger.error('Error in ReassignmentService: ' + error.message);
    }
  }
}

module.exports = ReassignmentService;
