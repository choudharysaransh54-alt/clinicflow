const Patient = require('../models/Patient');
const logger = require('../config/logger');

const VALID_TRANSITIONS = {
  registered: ['waiting_general'],
  waiting_general: ['waiting_doctor', 'no_show', 'removed'],
  waiting_doctor: ['with_doctor', 'no_show', 'removed'],
  with_doctor: ['transferred', 'completed', 'removed'],
  transferred: ['waiting_doctor'],
  no_show: ['waiting_general'],
  removed: [], // Terminal state
  completed: [], // Terminal state
};

exports.transitionPatient = async (patientId, toStatus, actor, options = {}) => {
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new Error('Patient not found');
  }

  const allowedTransitions = VALID_TRANSITIONS[patient.status] || [];
  if (!allowedTransitions.includes(toStatus)) {
    throw new Error(`Invalid transition from ${patient.status} to ${toStatus}`);
  }

  const updateData = {
    $set: { status: toStatus },
    $push: {
      auditLog: {
        fromStatus: patient.status,
        toStatus: toStatus,
        actorId: actor.id,
        actorRole: actor.role,
        note: options.note || '',
        timestamp: new Date(),
      },
    },
  };

  if (options.doctorId) {
    updateData.$set.assignedDoctor = options.doctorId;
  }
  if (toStatus === 'with_doctor') {
    updateData.$set.consultationStartAt = new Date();
  }
  if (toStatus === 'completed') {
    updateData.$set.completedAt = new Date();
  }

  if (toStatus === 'transferred' && options.fromDoctorId && options.toDoctorId) {
    updateData.$push.transferHistory = {
      fromDoctor: options.fromDoctorId,
      toDoctor: options.toDoctorId,
      reason: options.note || 'No reason provided',
      transferredAt: new Date(),
    };
  }

  // Atomic update to guard against concurrent updates
  const updatedPatient = await Patient.findOneAndUpdate(
    { _id: patientId, status: patient.status },
    updateData,
    { new: true }
  ).populate('assignedDoctor', 'name specialty');

  if (!updatedPatient) {
    throw new Error('Concurrent update conflict');
  }

  logger.info(`Patient ${patientId} transitioned to ${toStatus} by ${actor.role} ${actor.id}`);
  return updatedPatient;
};
