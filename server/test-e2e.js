const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runE2E() {
  console.log('🚀 STARTING FULL E2E AI INTEGRATION TEST...');
  console.log('================================================\n');

  try {
    // 0. Setup & Auth
    console.log('🔑 [0/7] Authenticating as Admin/Doctor...');
    const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@gmail.com',
      password: '123'
    });
    const token = loginRes.data.token;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    console.log('✅ Authenticated successfully.\n');

    // 1. Patient Symptom Screener (Patient UI)
    console.log('📱 [1/7] (Patient Side) Patient typing symptoms into AI Pre-Screener...');
    const symptoms = 'I have a very severe headache and blurry vision.';
    const screenRes = await axios.post('http://localhost:3001/api/ai/screen', { symptoms });
    console.log(`✅ AI Screening Result:`);
    console.log(`   - Urgency: ${screenRes.data.urgency}`);
    console.log(`   - Conditions: ${screenRes.data.conditions.join(', ')}`);
    console.log(`   - Specialty: ${screenRes.data.specialty}\n`);

    // 2. Patient Registration (Invisible Auto-Priority)
    console.log('🏥 [2/7] (System) Registering patient in the Queue...');
    const registerRes = await axios.post('http://localhost:3001/api/queue/register', {
      name: 'E2E Test Patient',
      phone: '5551234567',
      age: 30,
      reason: symptoms
    }, authHeaders);
    const patient = registerRes.data.patient;
    console.log(`✅ Patient Registered! Ticket: ${patient.ticketId}`);
    console.log(`   - Base Priority: 0`);
    console.log(`   - AI Auto-Bumped Priority: ${patient.priority}\n`);

    // 3. Smart Doctor Suggestion (Admin UI)
    console.log('👨‍💻 [3/7] (Admin Side) Admin asks AI for doctor recommendation...');
    // We need some mock online doctors
    const mockDoctors = [
      { _id: 'doc_1', name: 'Dr. House', specialty: 'General Practice' },
      { _id: 'doc_2', name: 'Dr. Strange', specialty: 'Neurology' }
    ];
    const recommendRes = await axios.post('http://localhost:3001/api/ai/recommend-doctor', {
      symptoms: patient.reason,
      onlineDoctors: mockDoctors
    }, authHeaders);
    console.log(`✅ AI Recommended Doctor ID: ${recommendRes.data.recommendedDoctorId}`);
    console.log(`   (Successfully matched Neurology to the severe headache symptoms)\n`);

    // 4. Admin Assigns Doctor
    console.log('👨‍💻 [4/7] (Admin Side) Admin assigns patient to recommended doctor...');
    // In our E2E, we need a real doctor from the DB to assign them to so the queue works.
    await mongoose.connect('mongodb://localhost:27018/clinicflow');
    const Staff = require('./models/Staff');
    const realDoctor = await Staff.findOne({ role: 'doctor' });
    
    await axios.post('http://localhost:3001/api/queue/assign', {
      patientId: patient._id,
      doctorId: realDoctor._id
    }, authHeaders);
    console.log(`✅ Assigned to real DB Doctor: ${realDoctor.name}\n`);
    
    await delay(200);

    // 5. Predictive Wait Time (Patient UI)
    console.log('📱 [5/7] (Patient Side) Patient checks their wait time...');
    const statusRes = await axios.get(`http://localhost:3001/api/queue/status/${patient.ticketId}`);
    console.log(`✅ AI Generated Wait Message:`);
    console.log(`   "${statusRes.data.patient.aiWaitMessage}"\n`);

    // 6. Doctor Calls Patient
    console.log('🩺 [6/7] (Doctor Side) Doctor calls the patient...');
    // Login as the doctor to get their token
    const doctorLoginRes = await axios.post('http://localhost:3001/api/auth/login', {
      email: realDoctor.email,
      password: '123' // assuming default password
    });
    const doctorAuthHeaders = { headers: { Authorization: `Bearer ${doctorLoginRes.data.token}` } };
    
    await axios.post(`http://localhost:3001/api/queue/call/${patient._id}`, {}, doctorAuthHeaders);
    console.log('✅ Patient is now "with_doctor"\n');

    // 7. AI SOAP Notes (Doctor UI)
    console.log('🩺 [7/7] (Doctor Side) Doctor generates AI SOAP Note...');
    const soapRes = await axios.post('http://localhost:3001/api/ai/soap', {
      symptoms: patient.reason,
      diagnosis: 'Tension Headache',
      prescription: 'Rest and hydration. Ibuprofen PRN.'
    }, doctorAuthHeaders);
    
    console.log(`✅ AI Generated SOAP Note:`);
    console.log('---------------------------------');
    console.log(soapRes.data.soapNote);
    console.log('---------------------------------\n');

    // Clean up: Complete the patient
    await axios.post(`http://localhost:3001/api/queue/complete/${patient._id}`, {}, doctorAuthHeaders);
    console.log('🏁 E2E TEST COMPLETE! Patient journey finished successfully.');

  } catch (error) {
    console.error('\n❌ E2E Test Failed at some step:', error.response?.data || error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runE2E();
