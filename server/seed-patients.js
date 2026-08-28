const axios = require('axios');

const patients = [
  { name: 'John Smith', age: 55, phone: '555-0101', reason: 'Severe chest pain and shortness of breath' },
  { name: 'Emily Davis', age: 4, phone: '555-0102', reason: 'My 4 year old has a high fever and rash' },
  { name: 'Michael Brown', age: 34, phone: '555-0103', reason: 'Fell off ladder, ankle is swelling and extremely painful' },
  { name: 'Sarah Wilson', age: 29, phone: '555-0104', reason: 'Persistent migraine for the last 3 days with blurry vision' },
  { name: 'David Miller', age: 42, phone: '555-0105', reason: 'Weird changing mole on my back' },
  { name: 'Jessica Taylor', age: 31, phone: '555-0106', reason: 'Routine checkup and refill prescription' },
  { name: 'Robert Anderson', age: 62, phone: '555-0107', reason: 'Heart palpitations and dizziness' },
  { name: 'Lisa Thomas', age: 1, phone: '555-0108', reason: 'Baby is crying non-stop and holding ear' },
  { name: 'James Jackson', age: 45, phone: '555-0109', reason: 'Lower back pain shooting down leg' },
  { name: 'Mary White', age: 58, phone: '555-0110', reason: 'Numbness in fingers and toes' }
];

async function seed() {
  console.log('Starting patient registration...');
  for (let i = 0; i < patients.length; i++) {
    try {
      console.log(`Registering patient ${i + 1}/10: ${patients[i].name}...`);
      const res = await axios.post('http://localhost:3001/api/queue/register', patients[i]);
      console.log(`✅ Success: ${res.data.patient.name} (Ticket: ${res.data.patient.ticketId})`);
    } catch (error) {
      console.error(`❌ Failed to register ${patients[i].name}:`, error.response?.data || error.message);
    }
  }
  console.log('All 10 patients have been sent to the queue!');
}

seed();
