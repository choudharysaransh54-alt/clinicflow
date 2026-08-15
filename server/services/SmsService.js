const twilio = require('twilio');

class SmsService {
  constructor() {
    this.isLive = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
    
    if (this.isLive) {
      this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
      console.log('📱 SmsService initialized in LIVE mode (Twilio connected).');
    } else {
      console.log('📱 SmsService initialized in MOCK mode (No Twilio credentials found in .env). SMS will be logged to console.');
    }
  }

  /**
   * Sends an SMS message to a patient
   * @param {string} to - The patient's phone number
   * @param {string} body - The text message body
   * @returns {Promise<boolean>} - Success status
   */
  async sendNotification(to, body) {
    if (!to) {
      console.warn('⚠️ SmsService: Cannot send SMS, no phone number provided.');
      return false;
    }

    if (this.isLive) {
      try {
        const message = await this.client.messages.create({
          body,
          from: this.fromNumber,
          to: to.startsWith('+') ? to : `+${to}`,
        });
        console.log(`✅ SMS sent via Twilio to ${to}. Message SID: ${message.sid}`);
        return true;
      } catch (error) {
        console.error(`❌ Twilio SMS Error (${to}):`, error.message);
        return false;
      }
    } else {
      // MOCK MODE: Just log it beautifully to the server console
      console.log('\n' + '='.repeat(50));
      console.log(`📱 MOCK SMS DISPATCHED TO: ${to}`);
      console.log('-'.repeat(50));
      console.log(body);
      console.log('='.repeat(50) + '\n');
      return true;
    }
  }
}

module.exports = new SmsService();
