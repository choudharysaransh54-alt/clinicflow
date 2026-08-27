const { v4: uuidv4 } = require('uuid');
const Patient = require('../models/Patient');

const QUEUE_KEY_STD = 'clinicflow:queue:standard';
const QUEUE_KEY_SNR = 'clinicflow:queue:senior';
const CALLED_KEY = 'clinicflow:called';

const SENIOR_AGE_CUTOFF = 65;

class QueueService {
  /**
   * @param {import('ioredis').Redis} redisClient
   */
  constructor(redisClient) {
    this.redis = redisClient;
  }

  /**
   * Add a patient to the queue.
   */
  async addPatient({ name, reason, phone, age }) {
    const ticketId = uuidv4();
    const queueType = age >= SENIOR_AGE_CUTOFF ? 'senior' : 'standard';
    const queueKey = queueType === 'senior' ? QUEUE_KEY_SNR : QUEUE_KEY_STD;

    // Get current queue length for position
    const position = await this.redis.llen(queueKey);

    // Save to MongoDB first
    const patient = await Patient.create({
      ticketId,
      name,
      reason,
      phone: phone || '',
      age,
      queueType,
      status: 'waiting',
      position: position + 1,
      joinedAt: new Date(),
    });

    // Push to Redis queue
    await this.redis.rpush(queueKey, ticketId);

    logger.info(`➕ Patient joined (${queueType}): ${name} (${ticketId}) at position ${position + 1}`);

    return patient.toJSON();
  }

  /**
   * Call the next patient in a specific queue.
   */
  async callNext(queueType) {
    const queueKey = queueType === 'senior' ? QUEUE_KEY_SNR : QUEUE_KEY_STD;
    
    // Pop from front of the specified queue
    const ticketId = await this.redis.lpop(queueKey);

    if (!ticketId) {
      return { success: false, message: `${queueType} queue is empty` };
    }

    // Store the currently-called patient
    await this.redis.set(CALLED_KEY, ticketId);

    // Update MongoDB
    const patient = await Patient.findOneAndUpdate(
      { ticketId },
      { status: 'called', calledAt: new Date() },
      { new: true }
    );

    if (!patient) {
      logger.error(`⚠️  Patient ${ticketId} not found in MongoDB during callNext`);
      return { success: false, message: 'Patient not found' };
    }

    // Reindex positions for remaining patients
    await this._reindexPositions(queueType);

    logger.info(`📣 Called patient: ${patient.name} (${ticketId})`);

    return { success: true, patient: patient.toJSON() };
  }

  /**
   * Mark a patient as completed.
   */
  async completePatient(ticketId) {
    const patient = await Patient.findOneAndUpdate(
      { ticketId },
      { status: 'completed', completedAt: new Date() },
      { new: true }
    );

    if (!patient) {
      return { success: false, message: 'Patient not found' };
    }

    // Clear currently-called if this was the called patient
    const calledId = await this.redis.get(CALLED_KEY);
    if (calledId === ticketId) {
      await this.redis.del(CALLED_KEY);
    }

    // Also remove from both queues if somehow still there
    await this.redis.lrem(QUEUE_KEY_STD, 0, ticketId);
    await this.redis.lrem(QUEUE_KEY_SNR, 0, ticketId);

    logger.info(`✅ Completed patient: ${patient.name} (${ticketId})`);

    return { success: true, patient: patient.toJSON() };
  }

  /**
   * Remove a patient from the queue (e.g., no-show).
   */
  async removePatient(ticketId) {
    // Remove from both Redis queues to be safe
    await this.redis.lrem(QUEUE_KEY_STD, 0, ticketId);
    await this.redis.lrem(QUEUE_KEY_SNR, 0, ticketId);

    // Clear currently-called if this was the called patient
    const calledId = await this.redis.get(CALLED_KEY);
    if (calledId === ticketId) {
      await this.redis.del(CALLED_KEY);
    }

    // Update MongoDB
    const patient = await Patient.findOneAndUpdate(
      { ticketId },
      { status: 'removed' },
      { new: true }
    );

    if (!patient) {
      return { success: false, message: 'Patient not found' };
    }

    // Reindex positions
    await this._reindexPositions(patient.queueType);

    logger.info(`🗑️  Removed patient: ${patient.name} (${ticketId})`);

    return { success: true, patient: patient.toJSON() };
  }

  /**
   * Get the full current queue state.
   */
  async getQueue() {
    try {
      // Get ordered ticket IDs from Redis
      const stdIds = await this.redis.lrange(QUEUE_KEY_STD, 0, -1);
      const snrIds = await this.redis.lrange(QUEUE_KEY_SNR, 0, -1);
      const allIds = [...stdIds, ...snrIds];

      const calledPatient = await this._getCalledPatient();
      const stats = await this._getStats();

      if (allIds.length === 0) {
        return { standard: [], senior: [], called: calledPatient, stats };
      }

      // Fetch full patient data from MongoDB in queue order
      const patients = await Patient.find({ ticketId: { $in: allIds } });

      // Sort Standard
      const stdMap = new Map(stdIds.map((id, idx) => [id, idx]));
      const standard = patients
        .filter(p => p.queueType === 'standard' && p.status === 'waiting')
        .sort((a, b) => (stdMap.get(a.ticketId) ?? 999) - (stdMap.get(b.ticketId) ?? 999))
        .map(p => p.toJSON());

      // Sort Senior
      const snrMap = new Map(snrIds.map((id, idx) => [id, idx]));
      const senior = patients
        .filter(p => p.queueType === 'senior' && p.status === 'waiting')
        .sort((a, b) => (snrMap.get(a.ticketId) ?? 999) - (snrMap.get(b.ticketId) ?? 999))
        .map(p => p.toJSON());

      return { standard, senior, called: calledPatient, stats };
    } catch (error) {
      logger.error('Error fetching queue from Redis, falling back to MongoDB:', error.message);
      return this._getQueueFromMongo();
    }
  }

  /**
   * Get a single patient's info by ticket ID.
   */
  async getPatientByTicket(ticketId) {
    const patient = await Patient.findOne({ ticketId });
    if (!patient) return null;

    if (patient.status === 'waiting') {
      const queueKey = patient.queueType === 'senior' ? QUEUE_KEY_SNR : QUEUE_KEY_STD;
      const ticketIds = await this.redis.lrange(queueKey, 0, -1);
      const position = ticketIds.indexOf(ticketId) + 1;
      const patientJson = patient.toJSON();
      patientJson.position = position > 0 ? position : patientJson.position;
      patientJson.totalInQueue = ticketIds.length;
      return patientJson;
    }

    return patient.toJSON();
  }

  /**
   * Fault Recovery: Rebuild Redis queues from MongoDB on server startup.
   */
  async recoverQueue() {
    const [stdLen, snrLen] = await Promise.all([
      this.redis.llen(QUEUE_KEY_STD),
      this.redis.llen(QUEUE_KEY_SNR)
    ]);

    if (stdLen > 0 || snrLen > 0) {
      logger.info(`🔄 Redis queues intact. Standard: ${stdLen}, Senior: ${snrLen}`);
      return;
    }

    const waitingPatients = await Patient.find({ status: 'waiting' })
      .sort({ position: 1, joinedAt: 1 })
      .exec();

    if (waitingPatients.length === 0) {
      logger.info('🔄 No patients to recover. Queues are empty.');
      return;
    }

    const pipeline = this.redis.pipeline();
    pipeline.del(QUEUE_KEY_STD);
    pipeline.del(QUEUE_KEY_SNR);

    waitingPatients.forEach((patient) => {
      if (patient.queueType === 'senior') {
        pipeline.rpush(QUEUE_KEY_SNR, patient.ticketId);
      } else {
        pipeline.rpush(QUEUE_KEY_STD, patient.ticketId);
      }
    });
    await pipeline.exec();

    logger.info(`🔄 Recovered ${waitingPatients.length} patients from MongoDB into Redis queues.`);
  }

  // ─── PRIVATE HELPERS ───────────────────────────────────

  async _reindexPositions(queueType) {
    const queueKey = queueType === 'senior' ? QUEUE_KEY_SNR : QUEUE_KEY_STD;
    const ticketIds = await this.redis.lrange(queueKey, 0, -1);

    if (ticketIds.length === 0) return;

    const bulkOps = ticketIds.map((ticketId, index) => ({
      updateOne: {
        filter: { ticketId },
        update: { position: index + 1 },
      },
    }));

    await Patient.bulkWrite(bulkOps);
  }

  async _getCalledPatient() {
    const calledId = await this.redis.get(CALLED_KEY);
    if (!calledId) return null;

    const patient = await Patient.findOne({ ticketId: calledId });
    return patient ? patient.toJSON() : null;
  }

  async _getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [stdLen, snrLen, servedToday, avgWaitTime] = await Promise.all([
      this.redis.llen(QUEUE_KEY_STD),
      this.redis.llen(QUEUE_KEY_SNR),
      Patient.countDocuments({
        status: 'completed',
        completedAt: { $gte: today },
      }),
      Patient.aggregate([
        {
          $match: {
            status: 'completed',
            calledAt: { $exists: true, $ne: null },
            completedAt: { $gte: today },
          },
        },
        {
          $group: {
            _id: null,
            avgWait: { $avg: { $subtract: ['$calledAt', '$joinedAt'] } },
          },
        },
      ]),
    ]);

    return {
      waitingCount: stdLen + snrLen,
      servedToday,
      avgWaitMinutes: avgWaitTime[0] ? Math.round(avgWaitTime[0].avgWait / 60000) : 0,
    };
  }

  async _getQueueFromMongo() {
    const waiting = await Patient.find({ status: 'waiting' })
      .sort({ position: 1 })
      .exec();

    const called = await Patient.findOne({ status: 'called' })
      .sort({ calledAt: -1 })
      .exec();

    const stats = await this._getStats();

    return {
      standard: waiting.filter(p => p.queueType === 'standard').map(p => p.toJSON()),
      senior: waiting.filter(p => p.queueType === 'senior').map(p => p.toJSON()),
      called: called ? called.toJSON() : null,
      stats,
    };
  }
}

module.exports = QueueService;
