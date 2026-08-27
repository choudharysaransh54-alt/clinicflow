const twilio = require('twilio');
const logger = require('../config/logger');
const { createRedisClient } = require('../config/redis');

const redis = createRedisClient('main');

class SmsService {
  constructor() {
    this.isLive = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
    
    if (this.isLive) {
      this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
      logger.info('📱 SmsService initialized in LIVE mode (Twilio connected).');
    } else {
      logger.info('📱 SmsService initialized in MOCK mode (No Twilio credentials found in .env). SMS will be logged to console.');
    }
  }

  /**
   * Sends an SMS message to a patient
   * @param {string} to - The patient's phone number
   * @param {string} body - The text message body
   * @param {object} options - Options (idempotencyKey)
   * @returns {Promise<boolean>} - Success status
   */
  async sendNotification(to, body, options = {}) {
    if (!to) {
      logger.warn('⚠️ SmsService: Cannot send SMS, no phone number provided.');
      return false;
    }

    const { idempotencyKey } = options;

    if (idempotencyKey) {
      const isSent = await redis.sismember('sms:sent', idempotencyKey);
      if (isSent) {
        logger.info(`SMS with idempotencyKey ${idempotencyKey} already sent. Skipping.`);
        return true;
      }
    }

    let success = false;

    if (this.isLive) {
      try {
        const message = await this.client.messages.create({
          body,
          from: this.fromNumber,
          to: to.startsWith('+') ? to : `+${to}`,
        });
        logger.info(`✅ SMS sent via Twilio to ${to}. Message SID: ${message.sid}`);
        success = true;
      } catch (error) {
        logger.error(`❌ Twilio SMS Error (${to}): ${error.message}`);
      }
    } else {
      // MOCK MODE: Just log it beautifully to the server console
      console.log('\n' + '='.repeat(50));
      console.log(`📱 MOCK SMS DISPATCHED TO: ${to}`);
      console.log('-'.repeat(50));
      console.log(body);
      console.log('='.repeat(50) + '\n');
      success = true;
    }

    if (success && idempotencyKey) {
      await redis.sadd('sms:sent', idempotencyKey);
      await redis.expire('sms:sent', 24 * 60 * 60); // 24h TTL
    }

    return success;
  }
}

module.exports = new SmsService();
