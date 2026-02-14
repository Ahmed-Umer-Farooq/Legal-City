require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');

async function testAPIKeys() {
  console.log('🧪 Testing AI API Keys...\n');

  // Test Gemini API Key
  console.log('1️⃣ Testing Gemini API Key...');
  console.log(`   Key: ${process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 15) + '...' : 'NOT SET'}`);
  
  if (process.env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent("Say 'Hello' in one word");
      const response = await result.response;
      console.log(`   ✅ Gemini API Key is VALID`);
      console.log(`   Response: ${response.text()}\n`);
    } catch (error) {
      console.log(`   ❌ Gemini API Key is INVALID or EXPIRED`);
      console.log(`   Error: ${error.message}\n`);
    }
  } else {
    console.log(`   ⚠️  Gemini API Key not found in .env\n`);
  }

  // Test Grok API Key
  console.log('2️⃣ Testing Grok API Key...');
  console.log(`   Key: ${process.env.GROK_API_KEY ? process.env.GROK_API_KEY.substring(0, 15) + '...' : 'NOT SET'}`);
  
  if (process.env.GROK_API_KEY) {
    try {
      const groq = new Groq({ apiKey: process.env.GROK_API_KEY });
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: "Say 'Hello' in one word" }],
        model: 'llama-3.1-8b-instant',
        temperature: 0.5,
        max_tokens: 10
      });
      console.log(`   ✅ Grok API Key is VALID`);
      console.log(`   Response: ${completion.choices[0]?.message?.content}\n`);
    } catch (error) {
      console.log(`   ❌ Grok API Key is INVALID or EXPIRED`);
      console.log(`   Error: ${error.message}\n`);
    }
  } else {
    console.log(`   ⚠️  Grok API Key not found in .env\n`);
  }

  console.log('✅ API Key Test Complete!');
}

testAPIKeys().catch(console.error);
