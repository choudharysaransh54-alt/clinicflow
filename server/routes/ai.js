const express = require('express');
const router = express.Router();
const AIService = require('../services/AIService');
const { requireRole, authenticate } = require('../middleware/auth');

// POST /api/ai/screen - For symptom checking
router.post('/screen', async (req, res, next) => {
  try {
    const { symptoms } = req.body;
    if (!symptoms) return res.status(400).json({ error: 'Symptoms are required' });
    
    const analysis = await AIService.screenSymptoms(symptoms);
    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/recommend-doctor - For smart doctor suggestions
router.post('/recommend-doctor', authenticate, requireRole('admin', 'receptionist'), async (req, res, next) => {
  try {
    const { symptoms, onlineDoctors } = req.body;
    if (!symptoms || !onlineDoctors) return res.status(400).json({ error: 'Symptoms and onlineDoctors are required' });
    
    const recommendedDoctorId = await AIService.recommendDoctor(symptoms, onlineDoctors);
    res.json({ recommendedDoctorId });
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/soap - For generating medical notes
router.post('/soap', authenticate, requireRole('doctor', 'admin'), async (req, res, next) => {
  try {
    const { symptoms, diagnosis, prescription } = req.body;
    if (!symptoms || !diagnosis || !prescription) {
      return res.status(400).json({ error: 'Symptoms, diagnosis, and prescription are required' });
    }
    
    const soapNote = await AIService.generateSOAP(symptoms, diagnosis, prescription);
    res.json({ soapNote });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
