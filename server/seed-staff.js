require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Staff = require('./models/Staff');
const { connectDB, disconnectDB } = require('./config/db');

async function seed() {
  try {
    await connectDB();
    console.log('Connected to DB');

    // Remove existing Staff to prevent duplication for now
    await Staff.deleteMany({});
    console.log('Cleared existing staff');

    const adminHash = await bcrypt.hash('123', 10);
    await Staff.create({
      name: 'Super Admin',
      email: 'admin@gmail.com',
      passwordHash: adminHash,
      role: 'admin',
    });

    const sharedHash = await bcrypt.hash('123', 10);
    const doctor1 = await Staff.create({
      name: 'Doctor One',
      email: 'doctor1@gmail.com',
      passwordHash: sharedHash,
      role: 'doctor',
      specialty: 'General Medicine',
    });

    const doctor2 = await Staff.create({
      name: 'Doctor Two',
      email: 'doctor2@gmail.com',
      passwordHash: sharedHash,
      role: 'doctor',
      specialty: 'Pediatrics',
    });


    // Create an active shift for the doctors so they show up on the dashboard
    const Shift = require('./models/Shift');
    await Shift.deleteMany({});
    
    await Shift.create({
      staffId: doctor1._id,
      startTime: new Date(Date.now() - 3600000), // 1 hour ago
      endTime: new Date(Date.now() + 7200000), // 2 hours from now
      department: 'General',
      roleDuringShift: 'Attending'
    });

    await Shift.create({
      staffId: doctor2._id,
      startTime: new Date(Date.now() - 3600000), // 1 hour ago
      endTime: new Date(Date.now() + 7200000), // 2 hours from now
      department: 'Pediatrics',
      roleDuringShift: 'Attending'
    });

    console.log('Successfully seeded admin and doctor accounts in the new Staff collection!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await disconnectDB();
  }
}

seed();
