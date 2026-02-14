const crypto = require('crypto');

class OAuthConfig {
  constructor() {
    this.validateEnvironment();
  }

  validateEnvironment() {
    const required = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'FRONTEND_URL'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing OAuth environment variables: ${missing.join(', ')}`);
    }
  }

  getGoogleConfig(req = null) {
    // Try to get BACKEND_URL from env, or construct from request
    let backendUrl = process.env.BACKEND_URL;
    
    if (!backendUrl && req) {
      // Construct from request if env var not set
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      backendUrl = `${protocol}://${host}`;
      console.log('⚠️  BACKEND_URL not set, using request host:', backendUrl);
    }
    
    if (!backendUrl) {
      backendUrl = 'http://localhost:5001';
      console.log('⚠️  BACKEND_URL not set and no request, using localhost');
    }
    
    const redirectURI = `${backendUrl}/api/oauth/google/callback`;
    
    console.log('🔧 OAuth Config:');
    console.log('   - BACKEND_URL env:', process.env.BACKEND_URL);
    console.log('   - Resolved backendUrl:', backendUrl);
    console.log('   - redirectURI:', redirectURI);
    console.log('   - NODE_ENV:', process.env.NODE_ENV);
    
    return {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectURI,
      scope: ['profile', 'email']
    };
  }

  generateState() {
    return crypto.randomBytes(32).toString('hex');
  }

  validateState(sessionState, receivedState) {
    return sessionState && receivedState && sessionState === receivedState;
  }

  getAuthURL(role = 'user', req = null) {
    const config = this.getGoogleConfig(req);
    const state = this.generateState();
    
    const params = new URLSearchParams({
      client_id: config.clientID,
      redirect_uri: config.redirectURI,
      scope: config.scope.join(' '),
      response_type: 'code',
      state: `${state}:${role}`,
      access_type: 'offline',
      prompt: 'consent'
    });

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      state
    };
  }
}

module.exports = new OAuthConfig();