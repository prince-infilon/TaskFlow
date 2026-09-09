import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeOAuth } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      if (!token) {
        navigate('/login?error=oauth_failed');
        return;
      }

      try {
        await completeOAuth(token);
        navigate('/app', { replace: true });
      } catch (err) {
        navigate('/login?error=oauth_failed');
      }
    };
    handleCallback();
  }, [searchParams, navigate, completeOAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-accent-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-body text-secondary">Completing login...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
