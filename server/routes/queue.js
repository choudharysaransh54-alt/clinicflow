const express = require('express');
const { body, validationResult } = require('express-validator');
const { requireRole, authenticate, optionalAuthenticate } = require('../middleware/auth');
const StateService = require('../services/StateService');
const RedisQueueService = require('../services/RedisQueueService');
const AIService = require('../services/AIService');
const Patient = require('../models/Patient');
const Staff = require('../models/Staff');
const Shift = require('../models/Shift');
const SmsService = require('../services/SmsService');
const logger = require('../config/logger');

const router = express.Router();
const noShowTimeouts = new Map();

// Helper for socket.io instances
const getIo = (req) => req.app.get('io');

// Fetch patient documents from DB in the order given by Redis
async function getPatientsInOrder(patientIds) {
  if (!patientIds || patientIds.length === 0) return [];
  const patients = await Patient.find({ _id: { $in: patientIds } }).populate('assignedDoctor', 'name specialty');
  // Reorder to match Redis
  const orderMap = new Map(patientIds.map((id, index) => [id, index]));
  return patients.sort((a, b) => orderMap.get(a._id.toString()) - orderMap.get(b._id.toString()));
}

router.post(
  '/register',
  optionalAuthenticate,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('phone').notEmpty().withMessage('Phone is required'),
    body('age').isNumeric().withMessage('Age must be a number'),
    body('priority').optional().isNumeric(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      let { name, phone, age, reason, priority = 0 } = req.body;
      
      const ticketId = `T-${Math.floor(1000 + Math.random() * 9000)}`;

      // Step 5: AI Auto-Priority Scorer
      let aiScreening = null;
      if (reason) {
        try {
          aiScreening = await AIService.screenSymptoms(reason);
          aiScreening.screenedAt = new Date();
          
          if (aiScreening.urgency === '🔴 High') {
            priority += 10;
          } else if (aiScreening.urgency === '🟡 Medium') {
            priority += 5;
          }
        } catch (aiError) {
          logger.error(`AI Screening failed for reason "${reason}": ${aiError.message}`);
        }
      }

      const patient = await Patient.create({
        ticketId,
        name,
        phone,
        age,
        reason,
        priority,
        status: 'registered',
        aiScreening
      });

      const actor = req.user || { id: 'patient_self', role: 'patient' };
      const updatedPatient = await StateService.transitionPatient(patient._id, 'waiting_general', actor);
      await RedisQueueService.addToQueue('queue:general', updatedPatient._id, priority);

      getIo(req)?.to('admin').emit('queue:general:updated');
      
      res.status(201).json({ patient: updatedPatient });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/general', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const patientIds = await RedisQueueService.getFullQueue('queue:general');
    const patients = await getPatientsInOrder(patientIds);
    res.json({ patients });
  } catch (error) {
    next(error);
  }
});

router.get('/doctor/:doctorId', authenticate, requireRole('admin', 'doctor'), async (req, res, next) => {
  try {
    const patientIds = await RedisQueueService.getFullQueue(`queue:doctor:${req.params.doctorId}`);
    const waitingPatients = await getPatientsInOrder(patientIds);
    
    // Also fetch the patient(s) currently in consultation with this doctor
    const withDoctorPatients = await Patient.find({ 
      assignedDoctor: req.params.doctorId, 
      status: 'with_doctor' 
    }).populate('assignedDoctor', 'name specialty');
    
    // Put currently consulting patients at the top of the list
    const allPatients = [...withDoctorPatients, ...waitingPatients];
    
    // Fetch patients treated today by this doctor
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedPatients = await Patient.find({
      assignedDoctor: req.params.doctorId,
      status: 'completed',
      completedAt: { $gte: today }
    }).sort({ completedAt: -1 }).limit(10);
    
    res.json({ patients: allPatients, completedPatients });
  } catch (error) {
    next(error);
  }
});


router.post('/assign', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { patientId, doctorId } = req.body;
    const patient = await Patient.findById(patientId);
    
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    
    const updatedPatient = await StateService.transitionPatient(patientId, 'waiting_doctor', req.user, { doctorId });
    await RedisQueueService.removeFromQueue('queue:general', patientId);
    await RedisQueueService.addToQueue(`queue:doctor:${doctorId}`, patientId, updatedPatient.priority);

    getIo(req)?.to('admin').emit('queue:general:updated');
    getIo(req)?.to(`doctor:${doctorId}`).emit('queue:doctor:updated');

    res.json({ patient: updatedPatient });
  } catch (error) {
    next(error);
  }
});

router.post('/call/:patientId', authenticate, requireRole('admin', 'doctor'), async (req, res, next) => {
  try {
    const patientId = req.params.patientId;
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const doctorId = patient.assignedDoctor;

    const updatedPatient = await StateService.transitionPatient(patientId, 'with_doctor', req.user);
    await RedisQueueService.removeFromQueue(`queue:doctor:${doctorId}`, patientId);

    getIo(req)?.to(`patient:${patientId}`).emit('patient:status_changed', { status: 'with_doctor' });
    getIo(req)?.to(`doctor:${doctorId}`).emit('queue:doctor:updated');
    getIo(req)?.to('admin').emit('queue:admin:updated');

    // Send SMS with idempotency key
    const message = `Hello ${updatedPatient.name}, it's your turn! Please proceed to the consultation room.`;
    const idempotencyKey = `call-${patientId}-${Date.now()}`;
    // Assuming SmsService supports idempotencyKey as a 3rd arg in options
    try {
      await SmsService.sendNotification(updatedPatient.phone, message, { idempotencyKey });
    } catch (err) {
      logger.error(`SMS failure for ${patientId}: ${err.message}`);
    }

    // No-show logic
    const timeout = setTimeout(async () => {
      try {
        const checkPatient = await Patient.findById(patientId);
        if (checkPatient?.status === 'with_doctor') {
          // They are still with the doctor, not a no-show
          return;
        }
        
        // Timeout reached, mark as no-show
        checkPatient.missedCalls += 1;
        await checkPatient.save();
        
        const newPriority = Math.max(0, checkPatient.priority - 1);
        
        await StateService.transitionPatient(patientId, 'no_show', { id: 'system', role: 'system' });
        await StateService.transitionPatient(patientId, 'waiting_doctor', { id: 'system', role: 'system', doctorId: checkPatient.assignedDoctor });
        
        await RedisQueueService.addToQueue(`queue:doctor:${checkPatient.assignedDoctor}`, patientId, newPriority);
        
        getIo(req)?.to(`doctor:${checkPatient.assignedDoctor}`).emit('queue:doctor:updated', { type: 'no_show_requeued' });
        getIo(req)?.to('admin').emit('queue:admin:updated');
      } catch (err) {
        logger.error(`No-show timeout error for patient ${patientId}: ${err.message}`);
      }
    }, 5 * 60 * 1000);

    noShowTimeouts.set(patientId.toString(), timeout);

    res.json({ patient: updatedPatient });
  } catch (error) {
    next(error);
  }
});

router.post('/transfer', authenticate, requireRole('admin', 'doctor'), async (req, res, next) => {
  try {
    const { patientId, toDoctorId, reason, priority = 0 } = req.body;
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const fromDoctorId = patient.assignedDoctor;

    await StateService.transitionPatient(patientId, 'transferred', req.user, { note: reason, fromDoctorId, toDoctorId });
    await RedisQueueService.removeFromQueue(`queue:doctor:${fromDoctorId}`, patientId);
    
    const updatedPatient = await StateService.transitionPatient(patientId, 'waiting_doctor', req.user, { doctorId: toDoctorId });
    await RedisQueueService.addToQueue(`queue:doctor:${toDoctorId}`, patientId, priority);

    getIo(req)?.to(`doctor:${fromDoctorId}`).emit('queue:doctor:updated');
    getIo(req)?.to(`doctor:${toDoctorId}`).emit('queue:doctor:updated');
    getIo(req)?.to('admin').emit('queue:admin:updated');

    const message = `Hello ${patient.name}, you have been transferred.`;
    const idempotencyKey = `transfer-${patientId}-${toDoctorId}`;
    try {
      await SmsService.sendNotification(patient.phone, message, { idempotencyKey });
    } catch (err) {}

    res.json({ patient: updatedPatient });
  } catch (error) {
    next(error);
  }
});


router.post('/complete/:patientId', authenticate, requireRole('admin', 'doctor'), async (req, res, next) => {
  try {
    const patientId = req.params.patientId;
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    // Clear timeout if patient was with doctor
    if (noShowTimeouts.has(patientId.toString())) {
      clearTimeout(noShowTimeouts.get(patientId.toString()));
      noShowTimeouts.delete(patientId.toString());
    }

    const updatedPatient = await StateService.transitionPatient(patientId, 'completed', req.user);

    // Update Doctor's avgConsultationMinutes
    if (updatedPatient.assignedDoctor && updatedPatient.consultationStartAt) {
      const durationMs = updatedPatient.completedAt - updatedPatient.consultationStartAt;
      const durationMinutes = Math.round(durationMs / 60000);
      
      const doctor = await Staff.findById(updatedPatient.assignedDoctor);
      if (doctor && doctor.role === 'doctor' && durationMinutes > 0) {
        // Rolling average (alpha = 0.2 for simplicity)
        doctor.avgConsultationMinutes = Math.round((doctor.avgConsultationMinutes * 0.8) + (durationMinutes * 0.2));
        await doctor.save();
      }
    }

    getIo(req)?.to(`patient:${patientId}`).emit('patient:status_changed', { status: 'completed' });
    getIo(req)?.to('admin').emit('queue:admin:updated');
    if (updatedPatient.assignedDoctor) {
      getIo(req)?.to(`doctor:${updatedPatient.assignedDoctor}`).emit('queue:doctor:updated');
    }

    res.json({ patient: updatedPatient });
  } catch (error) {
    next(error);
  }
});

router.post('/clear/:patientId', authenticate, requireRole('admin', 'doctor'), async (req, res, next) => {
  try {
    const patientId = req.params.patientId;
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    // Clear timeout if patient was with doctor
    if (noShowTimeouts.has(patientId.toString())) {
      clearTimeout(noShowTimeouts.get(patientId.toString()));
      noShowTimeouts.delete(patientId.toString());
    }

    // Determine which queue the patient is currently in based on their status and remove them
    if (patient.status === 'waiting_general') {
      await RedisQueueService.removeFromQueue('queue:general', patient._id);
    } else if (patient.status === 'waiting_doctor' && patient.assignedDoctor) {
      await RedisQueueService.removeFromQueue(`queue:doctor:${patient.assignedDoctor}`, patient._id);
    }

    const updatedPatient = await StateService.transitionPatient(patientId, 'removed', req.user, { note: 'Manually cleared by doctor' });

    getIo(req)?.to(`patient:${patientId}`).emit('patient:status_changed', { status: 'removed' });
    getIo(req)?.to('admin').emit('queue:admin:updated');
    if (updatedPatient.assignedDoctor) {
      getIo(req)?.to(`doctor:${updatedPatient.assignedDoctor}`).emit('queue:doctor:updated');
    }

    // Notify patient via SMS
    const message = `Hello ${updatedPatient.name}, your queue ticket has been cancelled by the clinic. Please speak to the receptionist if this was a mistake.`;
    const idempotencyKey = `clear-${patientId}-${Date.now()}`;
    try {
      await SmsService.sendNotification(updatedPatient.phone, message, { idempotencyKey });
    } catch (err) {
      logger.error(`SMS failure for ${patientId}: ${err.message}`);
    }

    res.json({ patient: updatedPatient });
  } catch (error) {
    next(error);
  }
});

router.get('/load', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const now = new Date();
    // Get all shifts for doctors active right now
    const activeShifts = await Shift.find({
      startTime: { $lte: now },
      endTime: { $gte: now }
    }).populate('staffId');

    const doctors = [];
    const seen = new Set();
    for (const shift of activeShifts) {
      if (shift.staffId && shift.staffId.role === 'doctor') {
        const id = shift.staffId._id.toString();
        if (!seen.has(id)) {
          seen.add(id);
          doctors.push(shift.staffId);
        }
      }
    }

    const load = await Promise.all(doctors.map(async (doc) => {
      const queueLength = await RedisQueueService.getQueueLength(`queue:doctor:${doc._id}`);
      return {
        doctor: { id: doc._id, name: doc.name, specialty: doc.specialty },
        queueLength,
        isAvailable: true // Since they are on shift, they are available
      };
    }));
    res.json({ load });
  } catch (error) {
    next(error);
  }
});

router.get('/status/:ticketId', async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ ticketId: req.params.ticketId }).populate('assignedDoctor', 'name specialty');
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    
    let position = 0;
    
    // Determine which queue the patient is currently in based on their status
    if (patient.status === 'waiting_general') {
      position = await RedisQueueService.getPosition('queue:general', patient._id);
    } else if (patient.status === 'waiting_doctor' && patient.assignedDoctor) {
      position = await RedisQueueService.getPosition(`queue:doctor:${patient.assignedDoctor._id}`, patient._id);
    }

    // Convert to plain object and inject position dynamically
    const patientObj = patient.toObject();
    patientObj.position = position;

    // Step 7: Predictive Wait Time (AI)
    if (position >= 0) {
      let avgMins = 8;
      if (patient.assignedDoctor && patient.assignedDoctor.avgConsultationMinutes) {
        avgMins = patient.assignedDoctor.avgConsultationMinutes;
      }
      patientObj.aiWaitMessage = await AIService.estimateWaitTime(position, avgMins);
    } else if (position === 1 || patient.status === 'with_doctor') {
      patientObj.aiWaitMessage = "It's your turn! The doctor is ready for you.";
    }

    // Check if the assigned doctor is offline
    if (patient.status === 'waiting_doctor' && patient.assignedDoctor) {
      const now = new Date();
      const activeShift = await Shift.findOne({
        staffId: patient.assignedDoctor._id,
        startTime: { $lte: now },
        endTime: { $gte: now }
      });
      
      if (!activeShift) {
        patientObj.doctorOffline = true;
        // Find next future shift for this specialty
        const specialty = patient.assignedDoctor.specialty || 'General';
        const nextShift = await Shift.findOne({
          startTime: { $gt: now },
          department: specialty
        }).sort({ startTime: 1 });
        
        if (nextShift) {
          patientObj.nextAvailableTime = nextShift.startTime;
        }
      }
    }

    res.json({ patient: patientObj });
  } catch (error) {
    next(error);
  }
});

router.post('/leave/:ticketId', async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ ticketId: req.params.ticketId });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    
    if (['with_doctor', 'completed', 'removed'].includes(patient.status)) {
      return res.status(400).json({ error: 'Cannot leave queue at this stage' });
    }

    const actor = { id: 'patient_self', role: 'patient' };
    
    // Remove from Redis queue based on current status
    if (patient.status === 'waiting_general') {
      await RedisQueueService.removeFromQueue('queue:general', patient._id);
      getIo(req)?.to('admin').emit('queue:general:updated');
    } else if (patient.status === 'waiting_doctor' && patient.assignedDoctor) {
      await RedisQueueService.removeFromQueue(`queue:doctor:${patient.assignedDoctor}`, patient._id);
      getIo(req)?.to(`doctor:${patient.assignedDoctor}`).emit('queue:doctor:updated');
      getIo(req)?.to('admin').emit('queue:admin:updated');
    }

    await StateService.transitionPatient(patient._id, 'removed', actor);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
