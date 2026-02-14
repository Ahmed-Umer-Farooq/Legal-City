const express = require('express');
const oauthController = require('../controllers/oauthController');
const oauthSecurity = require('../middleware/oauthSecurity');

const router = express.Router();

console.log('🔧 Setting up OAuth routes...');

// Apply rate limiting to all OAuth routes
router.use(oauthSecurity.createOAuthLimiter());

// Initiate Google OAuth
router.get('/google', (req, res, next) => {
  console.log('📍 OAuth initiate route hit');
  oauthController.initiateGoogle.bind(oauthController)(req, res, next);
});

// Handle Google OAuth callback
router.get('/google/callback', (req, res, next) => {
  console.log('📍 OAuth callback route hit - URL:', req.url);
  console.log('📍 Query params:', req.query);
  oauthController.handleGoogleCallback.bind(oauthController)(req, res, next);
});

console.log('✅ OAuth routes configured');

// Get current authenticated user
router.get('/me', 
  oauthSecurity.authenticate.bind(oauthSecurity),
  oauthController.getCurrentUser.bind(oauthController)
);

// Logout
router.post('/logout', 
  oauthSecurity.authenticate.bind(oauthSecurity),
  oauthController.logout.bind(oauthController)
);

// Health check for OAuth system
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    oauth: 'ready',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;