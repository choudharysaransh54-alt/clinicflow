const express = require('express');
const { requireRole } = require('../middleware/auth');
const Patient = require('../models/Patient');

const router = express.Router();

router.use(requireRole('admin'));

router.get('/wait-times', async (req, res, next) => {
  try {
    const data = await Patient.aggregate([
      { $match: { status: 'completed', assignedDoctor: { $ne: null }, consultationStartAt: { $ne: null }, completedAt: { $ne: null } } },
      {
        $group: {
          _id: '$assignedDoctor',
          avgWaitTime: {
            $avg: { $subtract: ['$completedAt', '$consultationStartAt'] }
          }
        }
      },
      {
        $lookup: {
          from: 'doctors',
          localField: '_id',
          foreignField: '_id',
          as: 'doctor'
        }
      },
      { $unwind: '$doctor' },
      {
        $project: {
          _id: 0,
          doctorId: '$_id',
          doctorName: '$doctor.name',
          avgWaitTimeMinutes: { $divide: ['$avgWaitTime', 60000] }
        }
      }
    ]);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get('/peak-hours', async (req, res, next) => {
  try {
    const data = await Patient.aggregate([
      {
        $group: {
          _id: { $hour: '$joinedAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          hour: '$_id',
          count: 1
        }
      }
    ]);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get('/throughput', async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const data = await Patient.aggregate([
      { $match: { status: 'completed', completedAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$completedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          count: 1
        }
      }
    ]);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get('/transfer-rate', async (req, res, next) => {
  try {
    const completedPatients = await Patient.countDocuments({ status: 'completed' });
    if (completedPatients === 0) return res.json({ rate: 0 });

    const transferredPatients = await Patient.countDocuments({
      status: 'completed',
      'transferHistory.0': { $exists: true }
    });

    const rate = (transferredPatients / completedPatients) * 100;
    res.json({ rate: parseFloat(rate.toFixed(2)) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
