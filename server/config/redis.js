const Redis = require('ioredis');
require('dotenv').config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Create a Redis client with reconnect strategy and logging.
 * @param {string} label - Label for logging (e.g. 'main', 'pub', 'sub')
 * @returns {Redis} ioredis client
 */
const createRedisClient = (label = 'main') => {
  const client = new Redis(REDIS_URL, {
    retryStrategy: (times) => {
      const delay = Math.min(times * 200, 5000);
      console.log(`🔄 Redis [${label}] reconnect attempt #${times} in ${delay}ms`);
      return delay;
    },
    maxRetriesPerRequest: null, // Required for Socket.IO adapter
    enableReadyCheck: true,
    lazyConnect: false,
  });

  client.on('connect', () => {
    console.log(`✅ Redis [${label}] connected`);
  });

  client.on('error', (err) => {
    console.error(`❌ Redis [${label}] error:`, err.message);
  });

  client.on('close', () => {
    console.warn(`⚠️  Redis [${label}] connection closed`);
  });

  return client;
};

/**
 * Create a pair of pub/sub clients for the Socket.IO Redis adapter.
 * They must be separate connections.
 */
const createPubSubPair = () => {
  const pubClient = createRedisClient('pub');
  const subClient = createRedisClient('sub');
  return { pubClient, subClient };
};

module.exports = { createRedisClient, createPubSubPair };
