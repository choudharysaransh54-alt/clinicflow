const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Patient = require('./models/Patient');
const Staff = require('./models/Staff');
const Shift = require('./models/Shift');
require('dotenv').config();

const specialties = [
  'Cardiology',
  'Pediatrics',
  'Orthopedics',
  'Neurology',
  'Dermatology'
];

const names = [
  'Dr. Sarah Jenkins',
  'Dr. Marcus Thorne',
  'Dr. Elena Rostova',
  'Dr. James Chen',
  'Dr. Aisha Patel'
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27018/clinicflow');
    console.log('Connected to DB');

    // 1. Delete all patients
    await Patient.deleteMany({});
    console.log('Deleted all patients.');

    // 2. Delete all doctors and their shifts
    const doctors = await Staff.find({ role: 'doctor' });
    const doctorIds = doctors.map(d => d._id);
    await Shift.deleteMany({ staffId: { $in: doctorIds } });
    await Staff.deleteMany({ role: 'doctor' });
    console.log('Deleted all doctors and their associated shifts.');

    // 3. Add 5 new doctors
    const passwordHash = await bcrypt.hash('123', 10);
    
    for (let i = 0; i < 5; i++) {
      await Staff.create({
        name: names[i],
        email: `doctor${i+1}@gmail.com`,
        passwordHash,
        role: 'doctor',
        specialty: specialties[i],
        contactNumber: `555-010${i}`
      });
      console.log(`Created doctor${i+1}@gmail.com - ${names[i]} (${specialties[i]})`);
    }

    console.log('Seed complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
