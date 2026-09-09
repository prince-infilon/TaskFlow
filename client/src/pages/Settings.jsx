import React, { useState, useEffect } from 'react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Avatar from '../components/ui/Avatar';
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Toast, { ToastContainer } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { User, Shield, Bell, Sliders, Check, RefreshCw, Upload, Lock } from 'lucide-react';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80'
];

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile state
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatarUrl: user?.avatarUrl || ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Preferences state
  const [preferences, setPreferences] = useState({
    theme: user?.preferences?.theme || 'system'
  });
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  
  // Notifications state
  const [notifications, setNotifications] = useState({
    emailSummary: user?.notifications?.emailSummary ?? true,
    taskAssigned: user?.notifications?.taskAssigned ?? true,
    comments: user?.notifications?.comments ?? false
  });
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  // Security / Password state
  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);

  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        avatarUrl: user.avatarUrl || ''
      });
      setPreferences({
        theme: user.preferences?.theme || 'system'
      });
      setNotifications({
        emailSummary: user.notifications?.emailSummary ?? true,
        taskAssigned: user.notifications?.taskAssigned ?? true,
        comments: user.notifications?.comments ?? false
      });
    }
  }, [user]);

  const showToast = (message, type = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // 1. Save Profile
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!profile.name.trim()) {
      showToast('Name cannot be empty', 'danger');
      return;
    }
    setIsSavingProfile(true);
    try {
      const res = await apiClient.patch('/users/me', {
        name: profile.name,
        email: profile.email,
        avatarUrl: profile.avatarUrl
      });
      const updatedUser = res.user || res.data?.user;
      if (updatedUser) {
        updateUser(updatedUser);
      }
      showToast('Profile updated successfully!');
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Failed to update profile', 'danger');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 2. Save Preferences
  const handleSavePreferences = async () => {
    setIsSavingPreferences(true);
    try {
      const res = await apiClient.patch('/users/me', {
        preferences
      });
      const updatedUser = res.user || res.data?.user;
      if (updatedUser) {
        updateUser(updatedUser);
      }
      
      // Apply theme preference dynamically
      if (preferences.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (preferences.theme === 'light') {
        document.documentElement.classList.remove('dark');
      }
      
      showToast('Preferences updated successfully!');
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Failed to update preferences', 'danger');
    } finally {
      setIsSavingPreferences(false);
    }
  };

  // 3. Save Notifications
  const handleSaveNotifications = async () => {
    setIsSavingNotifications(true);
    try {
      const res = await apiClient.patch('/users/me', {
        notifications
      });
      const updatedUser = res.user || res.data?.user;
      if (updatedUser) {
        updateUser(updatedUser);
      }
      showToast('Notification settings saved!');
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Failed to update notification settings', 'danger');
    } finally {
      setIsSavingNotifications(false);
    }
  };

  // 4. Update Password
  const handleUpdatePassword = async (e) => {
    if (e) e.preventDefault();
    if (!security.newPassword) {
      showToast('Please enter a new password.', 'danger');
      return;
    }
    if (security.newPassword.length < 6) {
      showToast('New password must be at least 6 characters long.', 'danger');
      return;
    }
    if (security.newPassword !== security.confirmPassword) {
      showToast('New passwords do not match.', 'danger');
      return;
    }

    setIsSavingSecurity(true);
    try {
      await apiClient.post('/users/me/change-password', {
        currentPassword: security.currentPassword,
        newPassword: security.newPassword
      });
      showToast('Password updated successfully!');
      setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Failed to update password', 'danger');
    } finally {
      setIsSavingSecurity(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full animate-in fade-in duration-300 pb-12">
      {/* Page Header */}
      <div className="mb-8 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Account Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manage your personal information, display preferences, notifications, and security options.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          Profile Info
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'preferences'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Preferences
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          Notifications
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          Security & Password
        </button>
      </div>

      <div className="space-y-8">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <section className="animate-in fade-in duration-200">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">Profile Information</CardTitle>
              </CardHeader>
              <form onSubmit={handleSaveProfile}>
                <CardContent className="space-y-6">
                  {/* Avatar Picker */}
                  <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Profile Picture</label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                      <div className="relative group">
                        <Avatar 
                          name={profile.name} 
                          src={profile.avatarUrl}
                          size="lg" 
                          className="w-20 h-20 text-2xl font-bold ring-4 ring-slate-100 dark:ring-slate-800 shadow-md" 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium">Quick Presets:</span>
                          {AVATAR_PRESETS.map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setProfile({ ...profile, avatarUrl: preset })}
                              className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all ${
                                profile.avatarUrl === preset ? 'border-indigo-600 scale-110 shadow-sm' : 'border-transparent hover:border-slate-300'
                              }`}
                            >
                              <img src={preset} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                          {profile.avatarUrl && (
                            <button
                              type="button"
                              onClick={() => setProfile({ ...profile, avatarUrl: '' })}
                              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline ml-2"
                            >
                              Reset to initials
                            </button>
                          )}
                        </div>
                        <Input
                          placeholder="Or paste image URL (e.g. https://...)"
                          value={profile.avatarUrl}
                          onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })}
                          className="text-xs max-w-md"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Full Name</label>
                      <Input 
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        placeholder="Your full name"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email Address</label>
                      <Input 
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-end bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="primary" type="submit" isLoading={isSavingProfile}>
                    Save Changes
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </section>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <section className="animate-in fade-in duration-200">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">Interface & Theme Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="max-w-md space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Appearance Mode</label>
                  <Select 
                    value={preferences.theme}
                    onChange={(val) => setPreferences({ ...preferences, theme: val })}
                    options={[
                      { label: 'System Default', value: 'system' },
                      { label: 'Light Theme', value: 'light' },
                      { label: 'Dark Mode', value: 'dark' }
                    ]}
                  />
                  <p className="text-xs text-slate-500">Choose how TaskFlow looks to you. Select a light or dark theme based on your preference.</p>
                </div>
              </CardContent>
              <CardFooter className="justify-end bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                <Button variant="primary" onClick={handleSavePreferences} isLoading={isSavingPreferences}>
                  Save Preferences
                </Button>
              </CardFooter>
            </Card>
          </section>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <section className="animate-in fade-in duration-200">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-start gap-4 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    checked={notifications.emailSummary}
                    onChange={(e) => setNotifications({ ...notifications, emailSummary: e.target.checked })}
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Daily Email Summary</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Receive a daily digest summarizing workspace updates and assigned tasks.</div>
                  </div>
                </label>

                <label className="flex items-start gap-4 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    checked={notifications.taskAssigned}
                    onChange={(e) => setNotifications({ ...notifications, taskAssigned: e.target.checked })}
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Task Assignments & Updates</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Get notified immediately when someone assigns a task to you or moves your task.</div>
                  </div>
                </label>

                <label className="flex items-start gap-4 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    checked={notifications.comments}
                    onChange={(e) => setNotifications({ ...notifications, comments: e.target.checked })}
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Comments & Mentions</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Get real-time alerts whenever a teammate comments on your board tasks.</div>
                  </div>
                </label>
              </CardContent>
              <CardFooter className="justify-end bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                <Button variant="primary" onClick={handleSaveNotifications} isLoading={isSavingNotifications}>
                  Save Notification Settings
                </Button>
              </CardFooter>
            </Card>
          </section>
        )}

        {/* Security & Password Tab */}
        {activeTab === 'security' && (
          <section className="animate-in fade-in duration-200">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">Password & Security</CardTitle>
              </CardHeader>
              <form onSubmit={handleUpdatePassword}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                    <div className="space-y-1 sm:col-span-2 max-w-sm">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Current Password</label>
                      <Input 
                        type="password"
                        placeholder="Enter current password"
                        value={security.currentPassword}
                        onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">New Password</label>
                      <Input 
                        type="password"
                        placeholder="Enter new password"
                        value={security.newPassword}
                        onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Confirm New Password</label>
                      <Input 
                        type="password"
                        placeholder="Confirm new password"
                        value={security.confirmPassword}
                        onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-between bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-4">
                  <Button variant="outline" type="button" onClick={() => window.location.href = '/app/settings/security'}>
                    <Shield className="w-4 h-4 mr-2" />
                    Advanced Security (MFA & Sessions)
                  </Button>

                  <Button variant="primary" type="submit" isLoading={isSavingSecurity}>
                    Update Password
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </section>
        )}
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
