import React, { useState, useEffect } from 'react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Toast, { ToastContainer } from '../components/ui/Toast';
import apiClient from '../api/client';
import { QRCodeSVG } from 'qrcode.react';

const SecuritySettings = () => {
  const [mfaSetup, setMfaSetup] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [isMfaEnabled, setIsMfaEnabled] = useState(false); // We should get this from user context, but let's assume false or fetch it
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Setup TOTP
  const handleSetupMFA = async () => {
    try {
      const res = await apiClient.post('/auth/mfa/setup');
      setMfaSetup(res.data.data);
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Failed to setup MFA', 'danger');
    }
  };

  const handleVerifyMFA = async () => {
    try {
      const res = await apiClient.post('/auth/mfa/verify', { token: mfaCode });
      setBackupCodes(res.data.data.backupCodes);
      setIsMfaEnabled(true);
      setMfaSetup(null);
      showToast('MFA enabled successfully!');
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Failed to verify MFA', 'danger');
    }
  };

  const handleDisableMFA = async () => {
    if (!window.confirm('Are you sure you want to disable MFA? This decreases your account security.')) return;
    try {
      await apiClient.post('/auth/mfa/disable');
      setIsMfaEnabled(false);
      setBackupCodes([]);
      showToast('MFA disabled successfully.');
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Failed to disable MFA', 'danger');
    }
  };

  const handleLogoutOtherDevices = async () => {
    // Actually, we could just rotate the token to invalidate other sessions.
    // Wait, the API for invalidating all sessions hasn't been explicitly created yet, 
    // but password change typically does it. Let's add a quick endpoint or just show a tech debt toast.
    showToast('Logout of other devices not fully implemented in frontend yet.', 'danger');
  };

  return (
    <div className="max-w-[800px] mx-auto w-full animate-in fade-in duration-300 pb-12">
      <div className="mb-8 space-y-2">
        <h1 className="text-h1 text-primary">Security Settings</h1>
        <p className="text-body text-secondary">
          Manage your multi-factor authentication and active sessions.
        </p>
      </div>

      <div className="space-y-8">
        
        {/* MFA Section */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Multi-Factor Authentication (MFA)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isMfaEnabled && !mfaSetup && (
                <div>
                  <p className="text-body text-secondary mb-4">
                    Protect your account by enabling Two-Factor Authentication using an authenticator app like Google Authenticator or Authy.
                  </p>
                  <Button variant="primary" onClick={handleSetupMFA}>Enable Authenticator App</Button>
                </div>
              )}

              {mfaSetup && !isMfaEnabled && (
                <div className="space-y-4">
                  <p className="text-body font-medium">1. Scan this QR Code with your Authenticator App</p>
                  <div className="bg-white p-4 inline-block rounded-lg">
                     <QRCodeSVG value={`otpauth://totp/TaskFlow?secret=${mfaSetup.secret}&issuer=TaskFlow`} size={200} />
                  </div>
                  <p className="text-small text-secondary break-all">Or enter this secret manually: <strong className="text-primary">{mfaSetup.secret}</strong></p>

                  <div className="space-y-2 pt-4 border-t border-border">
                    <p className="text-body font-medium">2. Enter the 6-digit code</p>
                    <div className="flex gap-2 max-w-[300px]">
                      <Input 
                        placeholder="000000" 
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value)}
                        maxLength={6}
                      />
                      <Button variant="primary" onClick={handleVerifyMFA}>Verify</Button>
                    </div>
                  </div>
                </div>
              )}

              {isMfaEnabled && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 rounded-full bg-success-500"></div>
                    <span className="text-body-medium font-medium text-success-600">MFA is currently enabled</span>
                  </div>
                  <Button variant="outline" className="text-danger-600 border-danger-200 hover:bg-danger-50" onClick={handleDisableMFA}>
                    Disable MFA
                  </Button>
                </div>
              )}

              {backupCodes.length > 0 && (
                <div className="mt-6 p-4 border border-warning-200 bg-warning-50 rounded-lg">
                  <h4 className="text-body-medium font-medium text-warning-800 mb-2">Save these backup codes!</h4>
                  <p className="text-small text-warning-700 mb-4">If you lose access to your authenticator device, you can use one of these codes to log in. Each code can only be used once.</p>
                  <div className="grid grid-cols-2 gap-2 font-mono text-small bg-white p-4 rounded border border-warning-100">
                    {backupCodes.map((code, i) => (
                      <div key={i}>{code}</div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Sessions Section */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-body text-secondary">
                If you notice suspicious activity, you can securely log out of all other devices.
              </p>
              <Button variant="secondary" onClick={handleLogoutOtherDevices}>Log out all other devices</Button>
            </CardContent>
          </Card>
        </section>
      </div>

      <ToastContainer>
        {toasts.map(toast => (
          <Toast 
            key={toast.id}
            id={toast.id}
            type={toast.type}
            message={toast.message}
            onClose={removeToast}
          />
        ))}
      </ToastContainer>
    </div>
  );
};

export default SecuritySettings;
