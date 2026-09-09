import axios from 'axios';

// The base API URL from environment variables, defaulting to local server
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Crucial for HttpOnly cookies (refresh tokens)
  headers: {
    'Content-Type': 'application/json'
  }
});

// Centralized Request Interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('taskflow_token');
    if (token) {
      if (typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    const savedOrg = localStorage.getItem('taskflow_active_org');
    if (savedOrg) {
      try {
        const parsed = JSON.parse(savedOrg);
        if (parsed?._id) {
          if (typeof config.headers.set === 'function') {
            config.headers.set('x-organization-id', parsed._id);
          } else {
            config.headers['x-organization-id'] = parsed._id;
          }
        }
      } catch (e) {}
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Centralized Response Interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Automatically unpack the data layer to simplify calling code
    return response.data;
  },
  (error) => {
    // Centralized Error Handling
    if (error.response) {
      // Server responded with a status code outside the 2xx range
      const { status, data } = error.response;
      
      // Handle 401 Unauthorized for future refresh token logic
      if (status === 401) {
        // Future: trigger refresh token flow or dispatch logout event
        console.warn('Unauthorized. Future refresh token logic goes here.');
      }

      // Format custom error message to be consistent for UI consumption
      const errorMessage = data?.error?.message || data?.message || data?.errors?.[0]?.msg || 'An error occurred on the server.';
      const customError = new Error(errorMessage);
      customError.status = status;
      customError.originalError = error;
      return Promise.reject(customError);
      
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from the API', error.request);
      return Promise.reject(new Error('Network error. Please check your connection.'));
    } else {
      // Something happened in setting up the request
      console.error('API Client Error:', error.message);
      return Promise.reject(error);
    }
  }
);

export default apiClient;
