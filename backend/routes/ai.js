const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const aiController = require('../controllers/aiController');
const { authenticate } = require('../middleware/modernAuth');

// Configure multer for file uploads
const uploadDir = 'uploads/ai-documents/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.txt'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'));
    }
  }
});

// ✅ AI ROUTES - NO SUBSCRIPTION RESTRICTIONS
// All authenticated users can access AI features
router.post('/summarize-document', authenticate, upload.single('document'), aiController.summarizeDocument);
router.post('/analyze-contract', authenticate, aiController.analyzeContract);
router.post('/document-chat', authenticate, aiController.documentChat);

// Routes for all users (including public)
router.post('/chatbot', aiController.chatbot);

module.exports = router;