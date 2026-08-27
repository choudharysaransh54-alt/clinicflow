const AIService = require('../services/AIService');

describe('AIService Unit Tests', () => {
  // Increase timeout for AI requests
  jest.setTimeout(15000);

  it('should screen symptoms and return urgency and specialty', async () => {
    const symptoms = 'I have had a severe headache and fever for 3 days.';
    const result = await AIService.screenSymptoms(symptoms);
    
    expect(result).toHaveProperty('urgency');
    expect(result).toHaveProperty('conditions');
    expect(result).toHaveProperty('specialty');
    expect(Array.isArray(result.conditions)).toBe(true);
  });

  it('should recommend the best doctor based on symptoms', async () => {
    const symptoms = 'My 5 year old child has a bad rash.';
    const onlineDoctors = [
      { _id: 'doc1', name: 'Dr. Heart', specialty: 'Cardiology' },
      { _id: 'doc2', name: 'Dr. Kid', specialty: 'Pediatrics' },
      { _id: 'doc3', name: 'Dr. Bones', specialty: 'Orthopedics' }
    ];
    
    const doctorId = await AIService.recommendDoctor(symptoms, onlineDoctors);
    expect(doctorId).toBe('doc2'); // AI should pick Pediatrics
  });

  it('should generate a SOAP note', async () => {
    const soap = await AIService.generateSOAP(
      'Patient reports stomach pain',
      'Food poisoning',
      'Rest and hydrate'
    );
    expect(typeof soap).toBe('string');
    expect(soap.length).toBeGreaterThan(20);
  });
});
