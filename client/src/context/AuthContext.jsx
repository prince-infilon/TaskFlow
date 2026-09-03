import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('taskflow_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => {
    return localStorage.getItem('taskflow_token') || null;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Apply token to headers immediately if it exists
  if (token && !apiClient.defaults.headers.common['Authorization']) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (token) {
          // Validate existing token
          const response = await apiClient.get('/users/me');
          setUser(response.data.user);
          localStorage.setItem('taskflow_user', JSON.stringify(response.data.user));
        } else {
          throw new Error('No token');
        }
      } catch (error) {
        // Fallback to refresh if validation fails or token missing
        try {
          const response = await apiClient.post('/auth/refresh');
          const { user: refreshedUser, token: refreshedToken } = response.data;
          setUser(refreshedUser);
          setToken(refreshedToken);
          localStorage.setItem('taskflow_user', JSON.stringify(refreshedUser));
          localStorage.setItem('taskflow_token', refreshedToken);
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${refreshedToken}`;
        } catch (refreshErr) {
          setUser(null);
          setToken(null);
          localStorage.removeItem('taskflow_user');
          localStorage.removeItem('taskflow_token');
          delete apiClient.defaults.headers.common['Authorization'];
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { user, token } = response.data;
      
      setUser(user);
      setToken(token);
      localStorage.setItem('taskflow_user', JSON.stringify(user));
      localStorage.setItem('taskflow_token', token);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return user;
    } catch (error) {
      throw error;
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await apiClient.post('/auth/register', { name, email, password });
      const { user, token } = response.data;
      
      setUser(user);
      setToken(token);
      localStorage.setItem('taskflow_user', JSON.stringify(user));
      localStorage.setItem('taskflow_token', token);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return user;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('taskflow_user');
      localStorage.removeItem('taskflow_token');
      delete apiClient.defaults.headers.common['Authorization'];
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
