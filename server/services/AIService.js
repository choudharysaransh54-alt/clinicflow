const Groq = require('groq-sdk');
const logger = require('../config/logger');
require('dotenv').config();

class AIService {
  constructor() {
    this.client = null;
    this.isMock = true;
    this.model = 'qwen/qwen3.8-27b';

    if (process.env.GROQ_API_KEY) {
      this.client = new Groq({ apiKey: process.env.GROQ_API_KEY });
      this.isMock = false;
      logger.info('🧠 AIService initialized with Groq API (qwen3.8-27b).');
    } else {
      logger.warn('⚠️ No GROQ_API_KEY found in .env. AIService running in MOCK mode.');
    }
  }

  /**
   * Helper to call Groq chat completions
   * Uses /no_think prefix to disable Qwen's thinking mode for clean output
   */
  async _chat(prompt) {
    const completion = await this.client.chat.completions.create({
      messages: [{ role: 'user', content: '/no_think ' + prompt }],
      model: this.model,
      temperature: 0.3,
      max_tokens: 1024,
    });
    return completion.choices[0]?.message?.content || '';
  }

  /**
   * screenSymptoms - reads symptoms, returns urgency + possible conditions
   * @param {string} symptoms 
   */
  async screenSymptoms(symptoms) {
    if (this.isMock) {
      return {
        urgency: symptoms.toLowerCase().includes('pain') ? '🔴 High' : '🟢 Normal',
        conditions: ['Mock Condition A', 'Mock Condition B'],
        specialty: 'General'
      };
    }

    try {
      const prompt = `
        You are an AI medical triage assistant. Analyze the following patient symptoms.
        Symptoms: "${symptoms}"
        
        Return ONLY a JSON object exactly in this format:
        {
          "urgency": "🔴 High", // or 🟡 Medium, 🟢 Normal
          "conditions": ["Condition 1", "Condition 2"],
          "specialty": "Pediatrics" // Recommend a medical specialty
        }
      `;
      
      const text = await this._chat(prompt);
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      logger.error('Error in screenSymptoms: ' + error.message);
      throw error;
    }
  }

  /**
   * recommendDoctor - picks the best doctor for a patient
   */
  async recommendDoctor(symptoms, onlineDoctors) {
    if (this.isMock) {
      return onlineDoctors.length > 0 ? onlineDoctors[0]._id : null;
    }

    try {
      const doctorsList = onlineDoctors.map(d => `{ id: "${d.id || d._id}", name: "${d.name}", specialty: "${d.specialty}" }`).join(', ');
      
      const prompt = `
        Patient symptoms: "${symptoms}"
        Available Doctors: [${doctorsList}]
        
        Return ONLY a JSON object with the id of the best matching doctor.
        {
          "recommendedDoctorId": "doctorId"
        }
      `;

      logger.info('Groq recommendDoctor prompt: ' + prompt);

      const text = await this._chat(prompt);
      logger.info('Groq recommendDoctor response: ' + text);
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      logger.info('Parsed recommendDoctor ID: ' + parsed.recommendedDoctorId);
      return parsed.recommendedDoctorId;
    } catch (error) {
      logger.error('Error in recommendDoctor: ' + error.message);
      return null;
    }
  }

  /**
   * generateSOAP - writes professional medical notes
   */
  async generateSOAP(symptoms, diagnosis, prescription) {
    if (this.isMock) {
      return `**Subjective:** ${symptoms}\n**Objective:** ...\n**Assessment:** ${diagnosis}\n**Plan:** ${prescription}`;
    }

    try {
      const prompt = `
        Write a concise, professional medical SOAP note based on the following:
        Symptoms: ${symptoms}
        Diagnosis: ${diagnosis}
        Prescription/Treatment: ${prescription}
      `;

      return await this._chat(prompt);
    } catch (error) {
      logger.error('Error in generateSOAP: ' + error.message);
      throw error;
    }
  }

  /**
   * estimateWaitTime - predicts how long the patient will wait
   */
  async estimateWaitTime(position, avgConsultationMinutes = 8) {
    if (this.isMock) {
      return `Based on current clinic load, your estimated wait is ~${position * avgConsultationMinutes} minutes.`;
    }

    try {
      const waitTime = position * avgConsultationMinutes;
      const prompt = `
        You are an AI clinic assistant. The patient is currently position ${position} in the queue.
        The average consultation time is ${avgConsultationMinutes} minutes, making their estimated wait time around ${waitTime} minutes.
        Write a very short, polite 1-sentence message to tell the patient their estimated wait time.
        Keep it concise and friendly.
      `;

      const text = await this._chat(prompt);
      return text.trim();
    } catch (error) {
      logger.error('Error in estimateWaitTime: ' + error.message);
      return `Your estimated wait is ~${position * avgConsultationMinutes} minutes.`;
    }
  }
}

module.exports = new AIService();
