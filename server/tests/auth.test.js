const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = 'testsecret';

const authRoutes = require('../routes/auth');
const { authenticate } = require('../middleware/auth');
const Staff = require('../models/Staff');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

app.get('/api/protected', authenticate, (req, res) => {
  res.json({ message: 'Success', user: req.user });
});

let mongoServer;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Staff.deleteMany({});
});

describe('Auth API', () => {
  const plainPassword = 'password123';

  beforeEach(async () => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(plainPassword, salt);

    await Staff.create({
      name: 'Dr. John Doe',
      email: 'john@example.com',
      passwordHash,
      role: 'doctor',
      specialty: 'General'
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns a valid JWT for correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: plainPassword
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.role).toBe('doctor');
      expect(res.body.user.email).toBeUndefined(); // shouldn't expose sensitive info in plain user object if we can help it, though we only returned name/role/userId
    });

    it('returns 401 for incorrect credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'wrongpassword'
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('returns 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john@example.com' });

      expect(res.statusCode).toEqual(400);
    });
  });

  describe('authenticate middleware', () => {
    it('blocks requests without a token', async () => {
      const res = await request(app).get('/api/protected');
      expect(res.statusCode).toEqual(401);
    });

    it('blocks requests with an invalid token format', async () => {
      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', 'InvalidFormat123');
      expect(res.statusCode).toEqual(401);
    });

    it('allows requests with a valid token', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: plainPassword
        });

      const token = loginRes.body.token;

      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('Success');
      expect(res.body.user.id).toBeDefined();
    });
  });
});
