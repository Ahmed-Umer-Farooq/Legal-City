import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const useOAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Check for authentication on mount
  useEffect(() => {
    checkAuthStatus();
    handleOAuthCallback();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const backendUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/oauth/me`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return userData;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
    return null;
  };

  const handleOAuthCallback = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const welcome = urlParams.get('welcome');
    const error = urlParams.get('error');

    if (error) {
      const errorMessages = {
        'oauth_denied': 'OAuth access was denied. Please try again.',
        'missing_params': 'OAuth callback missing required parameters.',
        'invalid_state': 'Invalid OAuth state. Possible security issue.',
        'no_profile': 'Could not retrieve profile from Google.',
        'oauth_failed': 'OAuth authentication failed. Please try again.',
        'deprecated_endpoint': 'Please use the new login system.'
      };

      toast.error(errorMessages[error] || 'Authentication failed. Please try again.');
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (welcome === 'true') {
      toast.success('Welcome! Your account has been created successfully.');
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const loginWithGoogle = async (role = 'user') => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Direct redirect to OAuth endpoint
      const backendUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5001';
      window.location.href = `${backendUrl}/api/oauth/google?role=${encodeURIComponent(role)}`;
    } catch (error) {
      console.error('OAuth initiation failed:', error);
      toast.error('Failed to initiate Google login. Please try again.');
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const backendUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5001';
      await fetch(`${backendUrl}/api/oauth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      
      setUser(null);
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Logout failed. Please try again.');
    }
  };

  const isAuthenticated = () => {
    return !!user;
  };

  const hasRole = (requiredRole) => {
    return user?.role === requiredRole;
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    hasRole,
    loginWithGoogle,
    logout,
    checkAuthStatus
  };
};

export default useOAuth;