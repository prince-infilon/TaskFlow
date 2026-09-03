import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // For initial check if we had one

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const response = await apiClient.post('/auth/refresh');
        const { user, token } = response.data;
        setUser(user);
        setToken(token);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        // Refresh token invalid or missing, user is unauthenticated
        setUser(null);
        setToken(null);
        delete apiClient.defaults.headers.common['Authorization'];
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
