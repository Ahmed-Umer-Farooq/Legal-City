# Google OAuth Debugging Guide

## Issue Summary
The Google OAuth callback was failing due to session state validation issues. The callback URL `http://localhost:5001/api/oauth/google/callback` was being used, which indicates either:
1. Testing locally (expected behavior)
2. Missing `BACKEND_URL` environment variable in production

## Changes Made

### 1. Session Cookie Configuration (`backend/server.js`)
- **Changed**: `sameSite: 'strict'` → `sameSite: 'lax'` in production
- **Reason**: `strict` prevents cookies from being sent on cross-site redirects (like OAuth callbacks from Google)
- **Impact**: OAuth callbacks can now maintain session state

### 2. Enhanced Logging (`backend/controllers/oauthController.js`)
Added comprehensive debug logging to track:
- Query parameters (code, state, error)
- Session data (oauthState, oauthRole, sessionID)
- Request info (URL, headers, origin)
- State validation results
- Profile exchange process
- User creation/retrieval

### 3. OAuth Config Logging (`backend/config/oauth.js`)
Added detailed logging for:
- BACKEND_URL environment variable
- Resolved backend URL
- Generated redirect URI
- NODE_ENV setting

## Testing Locally

1. **Start the backend server**:
   ```bash
   cd backend
   npm start
   ```

2. **Check the console for OAuth config**:
   ```
   🔧 OAuth Config:
      - BACKEND_URL: http://localhost:5001
      - Resolved backendUrl: http://localhost:5001
      - redirectURI: http://localhost:5001/api/oauth/google/callback
      - NODE_ENV: development
   ```

3. **Test OAuth flow**:
   - Navigate to login page
   - Click "Continue with Google"
   - Watch backend console for detailed logs:
     ```
     === OAuth Callback Debug ===
     Query params: { hasCode: true, hasState: true, error: undefined }
     Session data: { oauthState: '...', oauthRole: 'user', sessionID: '...' }
     State validation: { receivedState: '...', sessionState: '...', role: 'user', match: true }
     ```

## Common Issues & Solutions

### Issue 1: "invalid_state" Error
**Symptoms**: Redirect to `/login?error=invalid_state`
**Causes**:
- Session cookie not being sent with callback request
- Session expired between initiation and callback
- Cookie sameSite setting too restrictive

**Solution**: 
- ✅ Fixed by changing sameSite to 'lax'
- Ensure cookies are enabled in browser
- Check session timeout settings

### Issue 2: "missing_params" Error
**Symptoms**: Redirect to `/login?error=missing_params`
**Causes**:
- Google didn't send code or state
- User cancelled OAuth flow
- Invalid OAuth configuration

**Solution**:
- Check Google OAuth Console settings
- Verify redirect URI matches exactly
- Ensure OAuth consent screen is configured

### Issue 3: "no_profile" Error
**Symptoms**: Redirect to `/login?error=no_profile`
**Causes**:
- Failed to exchange code for tokens
- Invalid client ID/secret
- Expired authorization code

**Solution**:
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
- Check Google Cloud Console for correct credentials
- Ensure OAuth consent screen has email and profile scopes

## Production Deployment Checklist

### 1. Environment Variables (Vercel)
Set these in Vercel dashboard:
```
BACKEND_URL=https://your-backend-domain.vercel.app
FRONTEND_URL=https://your-frontend-domain.vercel.app
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
SESSION_SECRET=your-secure-random-string
JWT_SECRET=your-jwt-secret
NODE_ENV=production
COOKIE_DOMAIN=.your-domain.com
```

### 2. Google OAuth Console
Add authorized redirect URIs:
```
https://your-backend-domain.vercel.app/api/oauth/google/callback
http://localhost:5001/api/oauth/google/callback (for local testing)
```

### 3. Verify OAuth Flow
1. Check backend logs for OAuth config on startup
2. Test OAuth login from production frontend
3. Monitor logs for any errors
4. Verify session cookies are being set

## Debugging Commands

### Check OAuth configuration:
```bash
# In backend directory
node -e "require('dotenv').config(); console.log('BACKEND_URL:', process.env.BACKEND_URL); console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...');"
```

### Test OAuth endpoint:
```bash
curl http://localhost:5001/api/oauth/health
```

### Check session configuration:
```bash
# Look for session config logs in server startup
grep "Session configuration" backend/logs/*.log
```

## Security Notes

1. **Session Security**: 
   - `httpOnly: true` prevents XSS attacks
   - `secure: true` in production ensures HTTPS only
   - `sameSite: 'lax'` balances security with OAuth compatibility

2. **State Parameter**:
   - Cryptographically random 32-byte hex string
   - Stored in session and validated on callback
   - Prevents CSRF attacks

3. **Token Storage**:
   - JWT tokens stored in HTTP-only cookies
   - Not accessible via JavaScript
   - Automatically sent with requests

## Next Steps

1. ✅ Session configuration fixed
2. ✅ Comprehensive logging added
3. ✅ OAuth config improved
4. 🔄 Test locally with Google OAuth
5. 🔄 Deploy to production
6. 🔄 Update Google OAuth Console with production URLs
7. 🔄 Test production OAuth flow

## Support

If issues persist:
1. Check backend console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure Google OAuth Console settings match your URLs
4. Test with browser dev tools open (Network tab)
5. Check for cookie blocking or privacy settings
