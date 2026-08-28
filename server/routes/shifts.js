const express = require('express');
const { requireRole } = require('../middleware/auth');
const Shift = require('../models/Shift');
const Staff = require('../models/Staff');

const router = express.Router();

// Get shifts (optionally filter by date range or staff ID)
router.get('/', requireRole('admin', 'doctor', 'receptionist'), async (req, res, next) => {
  try {
    const { start, end, staffId } = req.query;
    
    let query = {};
    if (start && end) {
      query.startTime = { $gte: new Date(start) };
      query.endTime = { $lte: new Date(end) };
    }
    if (staffId) {
      query.staffId = staffId;
    }

    const shifts = await Shift.find(query)
      .populate('staffId', 'name role specialty')
      .sort({ startTime: 1 });
      
    res.json({ shifts });
  } catch (error) {
    next(error);
  }
});

// Assign a new shift
router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { staffId, startTime, endTime, department, roleDuringShift } = req.body;
    
    const shift = await Shift.create({
      staffId, startTime, endTime, department, roleDuringShift
    });
    
    const populatedShift = await shift.populate('staffId', 'name role specialty');
    res.status(201).json({ shift: populatedShift });
  } catch (error) {
    // Handle uniqueness or overlap errors if strictly enforced
    next(error);
  }
});

// Delete a shift
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    await Shift.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get currently active doctors
router.get('/active-doctors', requireRole('admin', 'receptionist'), async (req, res, next) => {
  try {
    const now = new Date();
    // Find active shifts for doctors
    const activeShifts = await Shift.find({
      startTime: { $lte: now },
      endTime: { $gte: now }
    }).populate('staffId', 'name role specialty');

    // Filter to only include staff with role 'doctor'
    const activeDoctors = activeShifts
      .filter(shift => shift.staffId && shift.staffId.role === 'doctor')
      .map(shift => shift.staffId);
      
    // Deduplicate in case a doctor has overlapping shifts
    const uniqueDoctors = [];
    const seen = new Set();
    for (const doc of activeDoctors) {
      if (!seen.has(doc._id.toString())) {
        seen.add(doc._id.toString());
        uniqueDoctors.push(doc);
      }
    }

    res.json({ doctors: uniqueDoctors });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
