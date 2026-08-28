const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const Staff = require('../models/Staff');
const Shift = require('../models/Shift');
const bcrypt = require('bcryptjs');
const ReassignmentService = require('../services/ReassignmentService');

const router = express.Router();

// Get public list of all doctors and their availability
router.get('/public', async (req, res, next) => {
  try {
    const doctors = await Staff.find({ role: 'doctor', status: 'active' })
      .select('_id name specialty contactNumber')
      .sort({ name: 1 })
      .lean();

    const now = new Date();
    // Get all currently active shifts for these doctors
    const activeShifts = await Shift.find({
      staffId: { $in: doctors.map(d => d._id) },
      startTime: { $lte: now },
      endTime: { $gte: now }
    }).lean();

    const activeDoctorIds = activeShifts.map(s => s.staffId.toString());

    const enrichedDoctors = doctors.map(doc => ({
      ...doc,
      isAvailable: activeDoctorIds.includes(doc._id.toString())
    }));

    res.json({ doctors: enrichedDoctors });
  } catch (error) {
    next(error);
  }
});

// Get all staff members (Admin/Doctor only)
router.get('/', authenticate, requireRole('admin', 'doctor'), async (req, res, next) => {
  try {
    const staff = await Staff.find().select('-passwordHash').sort({ role: 1, name: 1 });
    res.json({ staff });
  } catch (error) {
    next(error);
  }
});

// Create new staff member
router.post('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, email, password, role, specialty, contactNumber } = req.body;
    
    const existing = await Staff.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    const newStaff = await Staff.create({
      name, email, passwordHash, role, specialty, contactNumber
    });

    // If the new member is a doctor, auto-create an 8-hour shift so they
    // appear immediately in the live queue dashboard
    if (role === 'doctor') {
      const now = new Date();
      await Shift.create({
        staffId: newStaff._id,
        startTime: now,
        endTime: new Date(now.getTime() + 8 * 60 * 60 * 1000), // 8 hours
        department: specialty || 'General',
        roleDuringShift: 'Attending'
      });
    }
    
    const staffObj = newStaff.toObject();
    delete staffObj.passwordHash;

    res.status(201).json({ staff: staffObj });
  } catch (error) {
    next(error);
  }
});

// Update staff status (active/inactive)
router.patch('/:id/status', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const staff = await Staff.findByIdAndUpdate(req.params.id, { status }, { new: true }).select('-passwordHash');
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    res.json({ staff });
  } catch (error) {
    next(error);
  }
});

// Start an immediate 8-hour shift for an existing doctor
router.post('/:id/start-shift', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    if (staff.role !== 'doctor') return res.status(400).json({ error: 'Only doctors can be added to the live queue' });

    const now = new Date();
    const shift = await Shift.create({
      staffId: staff._id,
      startTime: now,
      endTime: new Date(now.getTime() + 8 * 60 * 60 * 1000),
      department: staff.specialty || 'General',
      roleDuringShift: 'Attending'
    });

    req.app.get('io')?.to('admin').emit('queue:admin:updated');

    res.status(201).json({ shift });
  } catch (error) {
    next(error);
  }
});

// Stop the currently active shift for a doctor
router.post('/:id/stop-shift', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const now = new Date();
    const activeShift = await Shift.findOne({
      staffId: req.params.id,
      startTime: { $lte: now },
      endTime: { $gte: now }
    });

    if (!activeShift) {
      return res.status(404).json({ error: 'No active shift found for this doctor' });
    }

    activeShift.endTime = now;
    await activeShift.save();

    // Trigger auto-reassignment
    const io = req.app.get('io');
    await ReassignmentService.handleDoctorOffline(req.params.id, io);

    io?.to('admin').emit('queue:admin:updated');

    res.json({ success: true, shift: activeShift });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
