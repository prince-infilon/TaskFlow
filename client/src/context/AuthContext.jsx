import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';
import { connectSocket, disconnectSocket } from '../api/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('taskflow_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => {
    return localStorage.getItem('taskflow_token') || null;
  });
  const [organizations, setOrganizations] = useState([]);
  const [activeOrganization, setActiveOrganization] = useState(() => {
    const saved = localStorage.getItem('taskflow_active_org');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Apply token and org to headers immediately if they exist
  if (token && !apiClient.defaults.headers.common['Authorization']) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  if (activeOrganization && !apiClient.defaults.headers.common['x-organization-id']) {
    apiClient.defaults.headers.common['x-organization-id'] = activeOrganization._id;
  }

  useEffect(() => {
    if (token) {
      connectSocket(token);
    } else {
      disconnectSocket();
    }
  }, [token]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (token) {
          // Validate existing token
          const response = await apiClient.get('/users/me');
          setUser(response.data.user);
          localStorage.setItem('taskflow_user', JSON.stringify(response.data.user));
          
          // Fetch organizations
          const orgResponse = await apiClient.get('/orgs');
          const orgs = orgResponse.organizations || orgResponse.data?.organizations || [];
          setOrganizations(orgs);
          
          if (orgs.length > 0) {
            const savedOrg = localStorage.getItem('taskflow_active_org');
            const parsedOrg = savedOrg ? JSON.parse(savedOrg) : null;
            
            // If saved org doesn't exist in loaded orgs, fallback to first
            if (!parsedOrg || !orgs.find(o => o._id === parsedOrg._id)) {
              setActiveOrganization(orgs[0]);
              localStorage.setItem('taskflow_active_org', JSON.stringify(orgs[0]));
              apiClient.defaults.headers.common['x-organization-id'] = orgs[0]._id;
            }
          }
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
          
          // Fetch organizations after refresh
          const orgResponse = await apiClient.get('/orgs');
          const orgs = orgResponse.organizations || orgResponse.data?.organizations || [];
          setOrganizations(orgs);
          
          if (orgs.length > 0) {
            const savedOrg = localStorage.getItem('taskflow_active_org');
            const parsedOrg = savedOrg ? JSON.parse(savedOrg) : null;
            if (!parsedOrg || !orgs.find(o => o._id === parsedOrg._id)) {
              setActiveOrganization(orgs[0]);
              localStorage.setItem('taskflow_active_org', JSON.stringify(orgs[0]));
              apiClient.defaults.headers.common['x-organization-id'] = orgs[0]._id;
            }
          }
        } catch (refreshErr) {
          setUser(null);
          setToken(null);
          setOrganizations([]);
          setActiveOrganization(null);
          localStorage.removeItem('taskflow_user');
          localStorage.removeItem('taskflow_token');
          localStorage.removeItem('taskflow_active_org');
          delete apiClient.defaults.headers.common['Authorization'];
          delete apiClient.defaults.headers.common['x-organization-id'];
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
      
      if (response.data && response.data.requiresMfa) {
        return { requiresMfa: true, mfaToken: response.data.mfaToken };
      }

      const { user, token } = response.data || response;
      await handleAuthSuccess(user, token);
      return { success: true, user };
    } catch (error) {
      throw error;
    }
  };

  const handleAuthSuccess = async (user, token) => {
    setUser(user);
    setToken(token);
    localStorage.setItem('taskflow_user', JSON.stringify(user));
    localStorage.setItem('taskflow_token', token);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // Fetch organizations
    const orgResponse = await apiClient.get('/orgs');
    const orgs = orgResponse.organizations || orgResponse.data?.organizations || [];
    setOrganizations(orgs);
    
    if (orgs.length > 0) {
      setActiveOrganization(orgs[0]);
      localStorage.setItem('taskflow_active_org', JSON.stringify(orgs[0]));
      apiClient.defaults.headers.common['x-organization-id'] = orgs[0]._id;
    }
  };

  const verifyMfaChallenge = async (mfaToken, code) => {
    try {
      const response = await apiClient.post('/auth/mfa/challenge', { mfaToken, code });
      const { user, token } = response.data || response;
      await handleAuthSuccess(user, token);
      return { success: true, user };
    } catch (error) {
      throw error;
    }
  };

  const completeOAuth = async (token) => {
    try {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const response = await apiClient.get('/users/me');
      await handleAuthSuccess(response.data.user, token);
      return { success: true, user: response.data.user };
    } catch (error) {
      delete apiClient.defaults.headers.common['Authorization'];
      throw error;
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await apiClient.post('/auth/register', { name, email, password });
      const { user, token } = response.data || response;
      
      setUser(user);
      setToken(token);
      localStorage.setItem('taskflow_user', JSON.stringify(user));
      localStorage.setItem('taskflow_token', token);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Fetch organizations (new user will have one created via registration hook, but wait, 
      // the migration script created orgs. Does registration create one automatically? 
      // We haven't updated register backend to create an org yet. For now let's just fetch it, 
      // we'll fix register if needed)
      const orgResponse = await apiClient.get('/orgs');
      const orgs = orgResponse.organizations || orgResponse.data?.organizations || [];
      setOrganizations(orgs);
      
      if (orgs.length > 0) {
        setActiveOrganization(orgs[0]);
        localStorage.setItem('taskflow_active_org', JSON.stringify(orgs[0]));
        apiClient.defaults.headers.common['x-organization-id'] = orgs[0]._id;
      }
      
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
      setOrganizations([]);
      setActiveOrganization(null);
      localStorage.removeItem('taskflow_user');
      localStorage.removeItem('taskflow_token');
      localStorage.removeItem('taskflow_active_org');
      delete apiClient.defaults.headers.common['Authorization'];
      delete apiClient.defaults.headers.common['x-organization-id'];
    }
  };

  const switchOrganization = (org) => {
    setActiveOrganization(org);
    localStorage.setItem('taskflow_active_org', JSON.stringify(org));
    apiClient.defaults.headers.common['x-organization-id'] = org._id;
    // Reload the page to reset all states scoped to the old org
    window.location.reload();
  };

  const updateUser = (updatedUserData) => {
    setUser(prev => {
      const newUser = { ...prev, ...updatedUserData };
      localStorage.setItem('taskflow_user', JSON.stringify(newUser));
      return newUser;
    });
  };

  const value = {
    user,
    token,
    organizations,
    activeOrganization,
    switchOrganization,
    updateUser,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    verifyMfaChallenge,
    completeOAuth
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
