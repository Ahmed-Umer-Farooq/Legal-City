const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');

class AIService {
  constructor() {
    console.log('🤖 Initializing AI Service...');
    console.log('   - GROK_API_KEY:', process.env.GROK_API_KEY ? `${process.env.GROK_API_KEY.substring(0, 10)}...` : 'NOT SET');
    console.log('   - GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 10)}...` : 'NOT SET');
    
    // Initialize Grok (primary)
    if (process.env.GROK_API_KEY) {
      this.groq = new Groq({
        apiKey: process.env.GROK_API_KEY
      });
      console.log('   ✅ Grok initialized');
    } else {
      console.warn('   ⚠️  Grok API key not found');
    }
    
    // Initialize Gemini (fallback)
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.geminiModel = this.genAI.getGenerativeModel({ model: "gemini-pro" });
      console.log('   ✅ Gemini initialized');
    } else {
      console.warn('   ⚠️  Gemini API key not found');
    }
  }

  async summarizeDocument(filePath, fileType) {
    try {
      let text = '';
      
      console.log(`📄 Processing ${fileType} file: ${filePath}`);
      
      if (fileType === 'pdf') {
        try {
          const dataBuffer = fs.readFileSync(filePath);
          console.log(`   PDF size: ${dataBuffer.length} bytes`);
          const data = await pdfParse(dataBuffer);
          text = data.text;
          console.log(`   Extracted ${text.length} characters from PDF`);
          
          if (!text || text.trim().length === 0) {
            throw new Error('PDF appears to be empty or contains only images. Please use a text-based PDF.');
          }
        } catch (pdfError) {
          console.error('PDF parsing error:', pdfError.message);
          throw new Error(`Failed to read PDF: ${pdfError.message}. Try converting to TXT or DOCX format.`);
        }
      } else if (fileType === 'docx') {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
      } else if (fileType === 'txt') {
        text = fs.readFileSync(filePath, 'utf8');
      }

      if (!text || text.trim().length < 10) {
        throw new Error('Document appears to be empty or too short to analyze.');
      }

      const prompt = `As a legal AI assistant, analyze this document and provide:
1. Executive Summary (2-3 sentences)
2. Key Legal Points (bullet points)
3. Important Dates/Deadlines
4. Potential Risks or Concerns
5. Action Items

Document content:
${text.substring(0, 8000)}`;

      // Use Grok only
      if (!process.env.GROK_API_KEY) {
        throw new Error('Grok API key not configured');
      }
      
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.1-8b-instant',
        temperature: 0.3,
        max_tokens: 1000
      });
      return completion.choices[0]?.message?.content || 'Summary unavailable.';
    } catch (error) {
      console.error('Document analysis error:', error.message);
      throw new Error(`Document analysis failed: ${error.message}`);
    }
  }

  async legalChatbot(userMessage, context = '') {
    const prompt = `You are a helpful legal assistant for a law firm platform. Provide accurate, helpful responses about legal services, processes, and general guidance. Do not provide specific legal advice.

Context: ${context}
User Question: ${userMessage}

Provide a helpful, professional response that:
- Answers their question clearly
- Suggests relevant legal services if applicable
- Recommends consulting with a lawyer for specific advice
- Keeps responses concise and actionable`;

    // Use Grok (primary and only)
    try {
      if (!process.env.GROK_API_KEY) {
        throw new Error('Grok API key not configured');
      }
      
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
        max_tokens: 500
      });
      return completion.choices[0]?.message?.content || 'I apologize, but I cannot provide a response at this time.';
    } catch (error) {
      console.error('Grok API error:', error.message);
      throw new Error('AI service temporarily unavailable. Please try again later.');
    }
  }

  async analyzeContract(text) {
    const prompt = `Analyze this contract/legal document and provide:
1. Document Type
2. Key Parties Involved
3. Main Obligations & Rights
4. Important Clauses
5. Potential Red Flags
6. Recommendations

Contract text:
${text.substring(0, 8000)}`;

    // Use Grok only
    try {
      if (!process.env.GROK_API_KEY) {
        throw new Error('Grok API key not configured');
      }
      
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.1-8b-instant',
        temperature: 0.3,
        max_tokens: 800
      });
      return completion.choices[0]?.message?.content || 'Analysis unavailable.';
    } catch (error) {
      console.error('Contract analysis error:', error.message);
      throw new Error('Contract analysis temporarily unavailable.');
    }
  }
}

module.exports = new AIService();