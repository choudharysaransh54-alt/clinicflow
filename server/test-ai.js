require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function testGemini() {
  console.log('🧪 Starting Gemini AI Test...');
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_key_here' || apiKey === 'placeholder') {
    console.error('❌ ERROR: You must replace "your_key_here" with a real Gemini API Key in your .env file!');
    process.exit(1);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    console.log('✅ Connection to Google AI Studio established.');
    console.log('🤔 Asking Gemini: "Explain what a clinic is in 1 sentence."');
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: 'Explain what a clinic is in 1 sentence.',
    });

    console.log('\n🎉 SUCCESS! Gemini responded:');
    console.log(`"${response.text}"`);
    console.log('\n✅ Step 1 is fully complete and verified. Ready for Step 2!');
  } catch (error) {
    console.error('❌ ERROR connecting to Gemini API:');
    console.error(error.message);
    console.error('Please verify your API key is correct in the .env file.');
  }
}

testGemini();
