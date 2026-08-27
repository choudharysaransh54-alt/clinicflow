require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Doctor = require('./models/Doctor');
const Admin = require('./models/Admin');
const { connectDB, disconnectDB } = require('./config/db');

async function seed() {
  try {
    await connectDB();
    console.log('Connected to DB');

    await Doctor.deleteMany({});
    await Admin.deleteMany({});
    console.log('Cleared existing V2 doctors and admins');

    const adminHash = await bcrypt.hash('123', 10);
    await Admin.create({
      name: 'Super Admin V2',
      email: 'admin@gmail.com',
      passwordHash: adminHash,
      role: 'admin',
    });

    const sharedHash = await bcrypt.hash('123', 10);
    await Doctor.create({
      name: 'Doctor One V2',
      email: 'doctor1@gmail.com',
      passwordHash: sharedHash,
      role: 'doctor',
      specialty: 'General Medicine',
    });

    console.log('Successfully seeded V2 Admin and Doctor accounts!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await disconnectDB();
  }
}

seed();
