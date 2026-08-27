const express = require('express');
const MedicalRecord = require('../models/MedicalRecord');
const { requireRole, authenticate } = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

// Get medical record by patient phone
router.get('/:phone', authenticate, requireRole('admin', 'doctor', 'nurse'), async (req, res, next) => {
  try {
    const { phone } = req.params;
    let record = await MedicalRecord.findOne({ patientPhone: phone });
    
    // If it doesn't exist, we can optionally just return null, 
    // or return a 404 so the client knows they need to initialize it.
    if (!record) {
      return res.status(404).json({ error: 'Medical record not found' });
    }

    res.json({ record });
  } catch (error) {
    next(error);
  }
});

// Create or update a patient's profile (allergies, chronic conditions, etc)
router.put('/:phone/profile', authenticate, requireRole('admin', 'doctor', 'nurse'), async (req, res, next) => {
  try {
    const { phone } = req.params;
    const { patientName, dateOfBirth, bloodGroup, allergies, chronicConditions } = req.body;

    let record = await MedicalRecord.findOne({ patientPhone: phone });
    
    if (record) {
      // Update existing
      if (patientName) record.patientName = patientName;
      if (dateOfBirth) record.dateOfBirth = dateOfBirth;
      if (bloodGroup) record.bloodGroup = bloodGroup;
      if (allergies) record.allergies = allergies;
      if (chronicConditions) record.chronicConditions = chronicConditions;
      await record.save();
    } else {
      // Create new
      if (!patientName) return res.status(400).json({ error: 'patientName is required for new records' });
      record = await MedicalRecord.create({
        patientPhone: phone,
        patientName,
        dateOfBirth,
        bloodGroup,
        allergies: allergies || [],
        chronicConditions: chronicConditions || []
      });
    }

    res.json({ record });
  } catch (error) {
    next(error);
  }
});

// Add a visit to a medical record
router.post('/:phone/visit', authenticate, requireRole('doctor'), async (req, res, next) => {
  try {
    const { phone } = req.params;
    const { symptoms, diagnosis, prescription, notes, patientName } = req.body;

    let record = await MedicalRecord.findOne({ patientPhone: phone });
    
    // Auto-initialize if it doesn't exist yet, but require patientName from the caller
    if (!record) {
      if (!patientName) return res.status(400).json({ error: 'patientName is required to initialize a new record' });
      record = await MedicalRecord.create({
        patientPhone: phone,
        patientName: patientName,
      });
    } else {
      // Update the root account name to the latest name used from this phone number
      if (patientName) {
        record.patientName = patientName;
      }
    }

    // Push the new visit
    record.visits.push({
      doctorId: req.user.id,
      doctorName: req.user.name,
      patientName: patientName,
      symptoms,
      diagnosis,
      prescription,
      notes,
      visitDate: new Date()
    });

    await record.save();

    logger.info(`Visit added for patient ${phone} by doctor ${req.user.name}`);
    res.status(201).json({ record });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
