const { createRedisClient } = require('../config/redis');
const logger = require('../config/logger');

const redis = createRedisClient('queue');

/**
 * Calculate the score for a priority
 * Higher priority = higher score (so it comes first when using ZREVRANGE)
 */
function calculateScore(priority) {
  // Base offset is inverted timestamp to naturally order older items higher for same priority
  const timestampPenalty = Date.now();
  // We use a multiplier so priority completely overrides timestamp
  return (priority * 1000000) - timestampPenalty;
}

exports.addToQueue = async (queueKey, patientId, priority = 0) => {
  const score = calculateScore(priority);
  await redis.zadd(queueKey, score, patientId.toString());
  logger.info(`Added patient ${patientId} to queue ${queueKey} with priority ${priority}`);
};

exports.removeFromQueue = async (queueKey, patientId) => {
  await redis.zrem(queueKey, patientId.toString());
  logger.info(`Removed patient ${patientId} from queue ${queueKey}`);
};

exports.peekNext = async (queueKey) => {
  // Get highest score first
  const results = await redis.zrevrange(queueKey, 0, 0);
  return results.length > 0 ? results[0] : null;
};

exports.getFullQueue = async (queueKey) => {
  // Get all members, highest score first
  return await redis.zrevrange(queueKey, 0, -1);
};

exports.getQueueLength = async (queueKey) => {
  return await redis.zcard(queueKey);
};

exports.getPosition = async (queueKey, patientId) => {
  const rank = await redis.zrevrank(queueKey, patientId.toString());
  // zrevrank returns null if member doesn't exist. If exists, rank is 0-indexed.
  return rank !== null ? rank + 1 : 0;
};

exports.clearQueue = async (queueKey) => {
  await redis.del(queueKey);
  logger.info(`Cleared queue ${queueKey}`);
};

exports.updatePriority = async (queueKey, patientId, newPriority) => {
  const score = calculateScore(newPriority);
  // ZADD updates the score if member exists
  await redis.zadd(queueKey, score, patientId.toString());
};
