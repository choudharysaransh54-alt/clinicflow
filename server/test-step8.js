const axios = require('axios');

async function runTest() {
  console.log('🧪 Starting Step 8 Manual Test (Smart Doctor Suggestion)...');

  try {
    // 1. Login as Admin to get token
    console.log('🔑 Logging in as Admin...');
    const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@gmail.com',
      password: '123'
    });
    const token = loginRes.data.token;
    
    // 2. Define test data
    const patientSymptoms = "I have been experiencing a lot of chest pain, tightness in my chest, and shortness of breath.";
    const onlineDoctors = [
      { _id: 'doc_1', name: 'Dr. Smith', specialty: 'General Practice' },
      { _id: 'doc_2', name: 'Dr. Bones', specialty: 'Orthopedics' },
      { _id: 'doc_3', name: 'Dr. Heart', specialty: 'Cardiology' },
      { _id: 'doc_4', name: 'Dr. Derma', specialty: 'Dermatology' }
    ];

    console.log(`\n🏥 Simulating a clinic with 4 doctors online:`);
    onlineDoctors.forEach(d => console.log(`  - ${d.name} (${d.specialty})`));
    console.log(`\n🤒 Patient Symptoms: "${patientSymptoms}"`);

    // 3. Ask AI for recommendation
    console.log('\n🤖 Asking Gemini to recommend the best doctor...');
    const res = await axios.post('http://localhost:3001/api/ai/recommend-doctor', {
      symptoms: patientSymptoms,
      onlineDoctors
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const recommendedId = res.data.recommendedDoctorId;
    const recommendedDoctor = onlineDoctors.find(d => d._id === recommendedId);
    
    console.log('\n🎉 SUCCESS! AI Recommended a Doctor.');
    if (recommendedDoctor) {
      console.log(`👉 Recommended Doctor: ${recommendedDoctor.name} (${recommendedDoctor.specialty})`);
    } else {
      console.log(`👉 Recommended Doctor ID: ${recommendedId} (Doctor not found in list)`);
    }
    
  } catch (error) {
    console.error('❌ Test Failed:', error.response?.data || error.message);
  }
}

runTest();
