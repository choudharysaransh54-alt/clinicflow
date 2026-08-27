const mongoose = require('mongoose');
const StateService = require('../services/StateService');
const Patient = require('../models/Patient');
const Staff = require('../models/Staff');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
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
});

describe('StateService', () => {
  const actor = { id: 'admin1', role: 'admin' };

  it('1. waiting_general → waiting_doctor is valid', async () => {
    const patient = await Patient.create({ ticketId: 'T1', name: 'A', age: 20, phone: '1', status: 'waiting_general' });
    const result = await StateService.transitionPatient(patient._id, 'waiting_doctor', actor);
    expect(result.status).toBe('waiting_doctor');
  });

  it('2. registered → with_doctor is invalid', async () => {
    const patient = await Patient.create({ ticketId: 'T2', name: 'B', age: 20, phone: '1', status: 'registered' });
    await expect(StateService.transitionPatient(patient._id, 'with_doctor', actor))
      .rejects.toThrow('Invalid transition');
  });

  it('3. waiting_general → completed is invalid', async () => {
    const patient = await Patient.create({ ticketId: 'T3', name: 'C', age: 20, phone: '1', status: 'waiting_general' });
    await expect(StateService.transitionPatient(patient._id, 'completed', actor))
      .rejects.toThrow('Invalid transition');
  });

  it('4. Concurrent transitions on same patient — exactly one resolves, one rejects', async () => {
    const patient = await Patient.create({ ticketId: 'T4', name: 'D', age: 20, phone: '1', status: 'waiting_general' });
    
    // Simulate concurrent requests
    const results = await Promise.allSettled([
      StateService.transitionPatient(patient._id, 'waiting_doctor', actor),
      StateService.transitionPatient(patient._id, 'no_show', actor)
    ]);
    
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');
    
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect(rejected[0].reason.message).toBe('Concurrent update conflict');
  });

  it('5. auditLog has entry after each transition', async () => {
    const patient = await Patient.create({ ticketId: 'T5', name: 'E', age: 20, phone: '1', status: 'registered' });
    const result = await StateService.transitionPatient(patient._id, 'waiting_general', actor);
    expect(result.auditLog.length).toBe(1);
    expect(result.auditLog[0].fromStatus).toBe('registered');
    expect(result.auditLog[0].toStatus).toBe('waiting_general');
  });
});
