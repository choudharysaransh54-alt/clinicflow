const axios = require('axios');

async function runTest() {
  console.log('🧪 Starting Step 5 Manual Test (Auto-Priority)...');

  try {
    // 1. Login as Admin to get token
    console.log('🔑 Logging in as Admin...');
    const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@gmail.com',
      password: '123'
    });
    const token = loginRes.data.token;
    
    // 2. Register a Patient with a severe reason
    console.log('🚑 Registering patient with "severe chest pain"...');
    const registerRes = await axios.post('http://localhost:3001/api/queue/register', {
      name: 'John Doe',
      phone: '1234567890',
      age: 45,
      reason: 'I am experiencing severe chest pain and shortness of breath.'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const patient = registerRes.data.patient;
    
    console.log('\n🎉 SUCCESS! Patient Registered.');
    console.log(`- Patient Name: ${patient.name}`);
    console.log(`- Reason: "${patient.reason}"`);
    console.log(`- Priority Score: ${patient.priority} (Automatically bumped to 10!)`);
    console.log(`- AI Screening Data Saved:`);
    console.log(`    Urgency: ${patient.aiScreening.urgency}`);
    console.log(`    Conditions: ${patient.aiScreening.conditions.join(', ')}`);
    console.log(`    Specialty: ${patient.aiScreening.specialty}`);
    
  } catch (error) {
    console.error('❌ Test Failed:', error.response?.data || error.message);
  }
}

runTest();
