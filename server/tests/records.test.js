const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'testsecret';

const recordsRouter = require('../routes/records');
const MedicalRecord = require('../models/MedicalRecord');
const Staff = require('../models/Staff');

let mongoServer;
let app;

// Generate token helper
const generateToken = (role, id = new mongoose.Types.ObjectId().toString(), name = 'Test User') => {
  return jwt.sign({ id, role, name }, process.env.JWT_SECRET || 'testsecret', { expiresIn: '1h' });
};

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = express();
  app.use(express.json());
  
  // Need to mock auth middleware since we are not using the full server.js
  app.use('/api/records', recordsRouter);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  await new Promise(resolve => setTimeout(resolve, 500)); // allow async cleanup
});

beforeEach(async () => {
  await MedicalRecord.deleteMany({});
  await Staff.deleteMany({});
});

describe('EHR Records API', () => {
  
  it('1. GET /api/records/:phone returns 404 if not found', async () => {
    const token = generateToken('doctor');
    const res = await request(app).get('/api/records/1234567890')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(404);
  });

  it('2. PUT /api/records/:phone/profile creates a new record if none exists', async () => {
    const token = generateToken('admin');
    const res = await request(app)
      .put('/api/records/1234567890/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientName: 'John Doe',
        bloodGroup: 'O+',
        allergies: ['Peanuts']
      });

    expect(res.status).toBe(200);
    expect(res.body.record.patientPhone).toBe('1234567890');
    expect(res.body.record.patientName).toBe('John Doe');
    expect(res.body.record.allergies).toContain('Peanuts');
  });

  it('3. POST /api/records/:phone/visit creates a visit and auto-initializes record', async () => {
    const docId = new mongoose.Types.ObjectId().toString();
    const token = generateToken('doctor', docId, 'Dr. House');
    
    const res = await request(app)
      .post('/api/records/0987654321/visit')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientName: 'Jane Smith',
        symptoms: 'Headache',
        diagnosis: 'Migraine',
        prescription: 'Rest'
      });

    expect(res.status).toBe(201);
    expect(res.body.record.patientName).toBe('Jane Smith');
    expect(res.body.record.visits.length).toBe(1);
    expect(res.body.record.visits[0].doctorName).toBe('Dr. House');
    expect(res.body.record.visits[0].diagnosis).toBe('Migraine');
  });

  it('4. PUT /api/records/:phone/profile updates existing record', async () => {
    await MedicalRecord.create({ patientPhone: '111', patientName: 'Original Name' });
    const token = generateToken('doctor');
    
    const res = await request(app)
      .put('/api/records/111/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        allergies: ['Dust']
      });

    expect(res.status).toBe(200);
    expect(res.body.record.patientName).toBe('Original Name');
    expect(res.body.record.allergies).toContain('Dust');
  });

});
