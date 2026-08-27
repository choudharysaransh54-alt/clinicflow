const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const queueRouter = require('../routes/queue');
const { authenticate } = require('../middleware/auth');
const Patient = require('../models/Patient');
const Staff = require('../models/Staff');
const Shift = require('../models/Shift');
const RedisQueueService = require('../services/RedisQueueService');

// Mock RedisQueueService methods
jest.mock('../services/RedisQueueService', () => ({
  addToQueue: jest.fn().mockResolvedValue(true),
  getFullQueue: jest.fn().mockResolvedValue([]),
  getQueueLength: jest.fn().mockResolvedValue(0),
  removeFromQueue: jest.fn().mockResolvedValue(true)
}));

// Mock SmsService
jest.mock('../services/SmsService', () => ({
  sendNotification: jest.fn().mockResolvedValue(true)
}));

const app = express();
app.use(express.json());

// Mock socket io
const mockIo = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn()
};
app.set('io', mockIo);

app.use('/api/queue', queueRouter);

// Error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message });
});

let mongoServer;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await new Promise(resolve => setTimeout(resolve, 500)); // allow windows to release file locks
  await mongoServer.stop();
});

beforeEach(async () => {
  await Patient.deleteMany({});
  await Staff.deleteMany({});
  jest.clearAllMocks();
});

const generateToken = (role) => {
  return jwt.sign({ id: new mongoose.Types.ObjectId(), role, name: 'Test' }, process.env.JWT_SECRET);
};

describe('Queue API', () => {
  it('6. POST /api/queue/register without token + valid body → 401', async () => {
    const res = await request(app)
      .post('/api/queue/register')
      .send({ name: 'Public Patient', phone: '111', age: 20 });
    expect(res.status).toBe(401);
  });

  it('7. POST /api/queue/register with doctor token + valid body → 403', async () => {
    const token = generateToken('doctor');
    const res = await request(app)
      .post('/api/queue/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Public Patient', phone: '111', age: 20 });
    expect(res.status).toBe(403);
  });

  it('8. POST /api/queue/register with admin token + valid body → 201', async () => {
    const token = generateToken('admin');
    const res = await request(app).post('/api/queue/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'John Doe', phone: '1234567890', age: 30 });
      
    expect(res.status).toBe(201);
    expect(res.body.patient.status).toBe('waiting_general');
    
    // Verify StateService & RedisQueueService was called
    expect(RedisQueueService.addToQueue).toHaveBeenCalledWith('queue:general', expect.anything(), 0);
  });

  it('9. POST /api/queue/register with missing name → 400', async () => {
    const token = generateToken('admin');
    const res = await request(app).post('/api/queue/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '1234567890', age: 30 });
      
    expect(res.status).toBe(400);
    expect(res.body.errors[0].msg).toBe('Name is required');
  });

  it('10. GET /api/queue/load returns array', async () => {
    const token = generateToken('admin');
    const doc = await Staff.create({ name: 'Dr. Smith', role: 'doctor', specialty: 'General', email: 'test@test.com', passwordHash: 'hash' });
    const now = new Date();
    await Shift.create({
      staffId: doc._id,
      startTime: new Date(now.getTime() - 10000),
      endTime: new Date(now.getTime() + 10000),
      department: 'General'
    });
    
    const res = await request(app).get('/api/queue/load')
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.status).toBe(200);
    expect(res.body.load.length).toBe(1);
    expect(res.body.load[0]).toHaveProperty('queueLength', 0);
    expect(res.body.load[0]).toHaveProperty('isAvailable', true);
  });
});
