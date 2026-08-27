const axios = require('axios');
const mongoose = require('mongoose');

async function testReassignment() {
  const api = axios.create({ baseURL: 'http://localhost:3001/api' });

  try {
    console.log('--- TEST: Shift End Reassignment ---');
    // 1. Login as Admin
    const adminRes = await api.post('/auth/login', { email: 'admin@gmail.com', password: '123' });
    const adminToken = adminRes.data.token;
    console.log('✅ Admin login successful');

    // 2. Fetch doctors
    const staffRes = await api.get('/staff', { headers: { Authorization: 'Bearer ' + adminToken } });
    const doctors = staffRes.data.staff.filter(s => s.role === 'doctor');
    const doc1 = doctors[0];
    
    // 3. Register patient
    const regRes = await api.post('/queue/register', { name: 'Shift Test Patient', age: 30, phone: '111222333', queueType: 'standard' });
    const patientId = regRes.data.patient._id;
    console.log('✅ Registered Patient:', regRes.data.patient.ticketId);

    // 4. Assign to Doc 1
    await api.post('/queue/assign', { patientId, doctorId: doc1._id }, { headers: { Authorization: 'Bearer ' + adminToken } });
    console.log(`✅ Assigned to ${doc1.name}`);

    // 5. Connect to mongo directly to delete doc 1's shift (simulating off-shift)
    await mongoose.connect('mongodb://localhost:27018/clinicflow');
    const Shift = require('./models/Shift');
    const deletedShift = await Shift.findOneAndDelete({ staffId: doc1._id });
    if (deletedShift) {
      console.log(`✅ Deleted shift for ${doc1.name}`);
    } else {
      console.log(`⚠️ No active shift found for ${doc1.name} to delete`);
    }

    console.log('⏳ Waiting for reassignment job to run (1 minute)...');
    
    // Wait for the cron job to run naturally (or we could trigger it, but let's wait 65 seconds to be safe)
    await new Promise(resolve => setTimeout(resolve, 65000));

    // 6. Check patient status
    const statRes = await api.get('/queue/status/' + regRes.data.patient.ticketId);
    const updatedPatient = statRes.data.patient;
    
    if (updatedPatient.status === 'waiting_doctor' && updatedPatient.assignedDoctor._id !== doc1._id) {
      console.log(`✅ SUCCESS: Patient automatically reassigned to ${updatedPatient.assignedDoctor.name}`);
    } else if (updatedPatient.status === 'waiting_general') {
      console.log(`✅ SUCCESS: Patient returned to general queue (no other doctors available)`);
    } else {
      console.error('❌ FAILED: Patient status did not update properly:', updatedPatient.status, updatedPatient.assignedDoctor);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testReassignment();
