// Centralized API URL configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
export const BACKEND_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5001';
export const SOCKET_URL = BACKEND_URL;

// Helper function to get full image URL
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;
  if (imagePath.startsWith('/uploads/')) return `${BACKEND_URL}${imagePath}`;
  return `${BACKEND_URL}/uploads/${imagePath}`;
};

export default { API_BASE_URL, BACKEND_URL, SOCKET_URL, getImageUrl };
