import React, { useState } from 'react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Avatar from '../components/ui/Avatar';
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Toast, { ToastContainer } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { user } = useAuth();
  
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  
  const [preferences, setPreferences] = useState({
    theme: 'system'
  });
  
  const [notifications, setNotifications] = useState({
    emailSummary: true,
    taskAssigned: true,
    comments: false
  });

  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleSaveProfile = () => {
    showToast('Profile update not yet implemented (Tech Debt).', 'danger');
  };

  const handleSavePreferences = () => {
    showToast('Preferences update not yet implemented (Tech Debt).', 'danger');
  };

  const handleSaveNotifications = () => {
    showToast('Notification settings not yet implemented (Tech Debt).', 'danger');
  };

  const handleUpdatePassword = () => {
    if (!security.currentPassword || !security.newPassword) {
      showToast('Please fill out all password fields.', 'danger');
      return;
    }
    if (security.newPassword !== security.confirmPassword) {
      showToast('New passwords do not match.', 'danger');
      return;
    }
    showToast('Password update not yet implemented (Tech Debt).', 'danger');
    setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  return (
    <div className="max-w-[800px] mx-auto w-full animate-in fade-in duration-300 pb-12">
      <div className="mb-8 space-y-2">
        <h1 className="text-h1 text-primary">Settings</h1>
        <p className="text-body text-secondary">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="space-y-8">
        {/* Profile Section */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar name={profile.name} size="lg" className="w-20 h-20 text-h1" />
                <div>
                  <Button variant="secondary" size="sm">Change Avatar</Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-small text-primary font-medium">Full Name</label>
                  <Input 
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    disabled
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-small text-primary font-medium">Email Address</label>
                  <Input 
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    disabled
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end bg-canvas/50">
              <Button variant="primary" onClick={handleSaveProfile}>
                Save changes
              </Button>
            </CardFooter>
          </Card>
        </section>

        {/* Preferences Section */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-[300px] space-y-1">
                <label className="text-small text-primary font-medium">Theme</label>
                <Select 
                  value={preferences.theme}
                  onChange={(val) => setPreferences({ ...preferences, theme: val })}
                  options={[
                    { label: 'System Default', value: 'system' },
                    { label: 'Light', value: 'light' },
                    { label: 'Dark', value: 'dark' }
                  ]}
                />
              </div>
            </CardContent>
            <CardFooter className="justify-end bg-canvas/50">
              <Button variant="primary" onClick={handleSavePreferences}>
                Save preferences
              </Button>
            </CardFooter>
          </Card>
        </section>

        {/* Notifications Section */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="rounded border-border text-accent-600 focus:ring-accent-500 w-4 h-4 cursor-pointer"
                  checked={notifications.emailSummary}
                  onChange={(e) => setNotifications({ ...notifications, emailSummary: e.target.checked })}
                />
                <div>
                  <div className="text-body-medium text-primary font-medium">Daily Email Summary</div>
                  <div className="text-small text-secondary">Receive a daily digest of activity across your boards.</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="rounded border-border text-accent-600 focus:ring-accent-500 w-4 h-4 cursor-pointer"
                  checked={notifications.taskAssigned}
                  onChange={(e) => setNotifications({ ...notifications, taskAssigned: e.target.checked })}
                />
                <div>
                  <div className="text-body-medium text-primary font-medium">Task Assignments</div>
                  <div className="text-small text-secondary">Get notified when someone assigns a task to you.</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="rounded border-border text-accent-600 focus:ring-accent-500 w-4 h-4 cursor-pointer"
                  checked={notifications.comments}
                  onChange={(e) => setNotifications({ ...notifications, comments: e.target.checked })}
                />
                <div>
                  <div className="text-body-medium text-primary font-medium">Comments</div>
                  <div className="text-small text-secondary">Get notified when someone mentions you in a comment.</div>
                </div>
              </label>
            </CardContent>
            <CardFooter className="justify-end bg-canvas/50">
              <Button variant="primary" onClick={handleSaveNotifications}>
                Save notifications
              </Button>
            </CardFooter>
          </Card>
        </section>

        {/* Security Section */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[600px]">
                <div className="space-y-1">
                  <label className="text-small text-primary font-medium">Current Password</label>
                  <Input 
                    type="password"
                    placeholder="Enter current password"
                    value={security.currentPassword}
                    onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                  />
                </div>
                <div className="hidden sm:block"></div>
                
                <div className="space-y-1">
                  <label className="text-small text-primary font-medium">New Password</label>
                  <Input 
                    type="password"
                    placeholder="Enter new password"
                    value={security.newPassword}
                    onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-small text-primary font-medium">Confirm New Password</label>
                  <Input 
                    type="password"
                    placeholder="Confirm new password"
                    value={security.confirmPassword}
                    onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end bg-canvas/50">
              <Button variant="primary" onClick={handleUpdatePassword}>
                Update password
              </Button>
            </CardFooter>
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

export default Settings;
