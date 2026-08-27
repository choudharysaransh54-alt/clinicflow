const axios = require('axios');
require('dotenv').config();

async function runTest() {
  console.log('🧪 Starting Step 9 Manual Test (AI SOAP Note Generator)...');

  try {
    // 1. Login as a Doctor to get a token
    // We can just use the admin token since we made the route allow doctors (and we can update it or just test it if admin has doctor privileges? Wait! 
    // In our `server/routes/ai.js`, `/soap` requires `requireRole('doctor')`. The `admin@gmail.com` might not be a doctor.
    // Let's create a dummy token manually or use a doctor's email.
    // Actually, I can just use a doctor's credentials if I know one, or I can bypass it for the test by using the test suite's approach.
    // Wait, let's look at `server/tests/seed.js` or just look up a doctor's email in the DB.
    
    // Instead of full DB lookup, I will connect to DB, find a doctor, generate a token, and use it.
    const mongoose = require('mongoose');
    const jwt = require('jsonwebtoken');
    await mongoose.connect('mongodb://localhost:27018/clinicflow');
    const Staff = require('./models/Staff');
    
    const doctor = await Staff.findOne({ role: 'doctor' });
    if (!doctor) {
      console.log('❌ No doctors found in DB. Test cannot run.');
      process.exit(1);
    }
    
    const token = jwt.sign({ id: doctor._id, role: doctor.role, email: doctor.email }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });
    console.log(`🔑 Generated auth token for Doctor: ${doctor.name}`);

    // 2. Define doctor's shorthand notes
    const shorthandData = {
      symptoms: "Patient complains of severe headache, light sensitivity, and nausea for 2 days.",
      diagnosis: "Acute Migraine without aura.",
      prescription: "Sumatriptan 50mg PRN. Rest in dark room."
    };

    console.log('\n📝 Doctor\'s Shorthand Input:');
    console.log(`  - Symptoms: ${shorthandData.symptoms}`);
    console.log(`  - Diagnosis: ${shorthandData.diagnosis}`);
    console.log(`  - Prescription: ${shorthandData.prescription}`);

    // 3. Ask AI to generate SOAP note
    console.log('\n🤖 Asking Gemini to generate a professional SOAP note...');
    const res = await axios.post('http://localhost:3001/api/ai/soap', shorthandData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('\n🎉 SUCCESS! Generated SOAP Note:\n');
    console.log('----------------------------------------------------');
    console.log(res.data.soapNote);
    console.log('----------------------------------------------------');
    
  } catch (error) {
    console.error('❌ Test Failed:', error.response?.data || error.message);
  } finally {
    process.exit(0);
  }
}

runTest();
