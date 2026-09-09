import React, { useState, useEffect } from 'react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Toast, { ToastContainer } from '../components/ui/Toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import Avatar from '../components/ui/Avatar';

const OrganizationSettings = () => {
  const { activeOrganization, user } = useAuth();
  
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', confirmText: '', variant: 'danger', onConfirm: null, isLoading: false });

  const showToast = (message, type = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const fetchMembers = async () => {
    if (!activeOrganization) return;
    try {
      setIsLoading(true);
      const res = await apiClient.get(`/orgs/${activeOrganization._id}/members`);
      setMembers(res.data.members || []);
    } catch (error) {
      showToast('Failed to load organization members.', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [activeOrganization]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    try {
      await apiClient.post(`/orgs/${activeOrganization._id}/members`, {
        email: inviteEmail,
        role: inviteRole
      });
      showToast('User invited successfully!');
      setInviteEmail('');
      fetchMembers();
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Failed to invite user.', 'danger');
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await apiClient.patch(`/orgs/${activeOrganization._id}/members/${userId}`, {
        role: newRole
      });
      showToast('Role updated successfully.');
      fetchMembers();
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Failed to update role.', 'danger');
    }
  };

  const handleRemoveMember = (userId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Member',
      message: 'Are you sure you want to remove this member from the organization? They will lose access to all organization boards and resources.',
      confirmText: 'Remove Member',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          await apiClient.delete(`/orgs/${activeOrganization._id}/members/${userId}`);
          showToast('Member removed.');
          fetchMembers();
        } catch (error) {
          showToast(error.response?.data?.error?.message || 'Failed to remove member.', 'danger');
        } finally {
          setConfirmModal({ isOpen: false, title: '', message: '', confirmText: '', variant: 'danger', onConfirm: null, isLoading: false });
        }
      }
    });
  };

  // Check if current user is admin to determine if they can manage roles
  const myMembership = members.find(m => m.user._id === user._id);
  const isAdmin = myMembership?.role === 'admin' || myMembership?.role === 'manager'; // For Phase 1 we allow managers to invite

  if (!activeOrganization) {
    return <div className="p-8 text-secondary">No organization selected.</div>;
  }

  return (
    <div className="max-w-[800px] mx-auto w-full animate-in fade-in duration-300 pb-12">
      <div className="mb-8 space-y-2">
        <h1 className="text-h1 text-primary">Workspace Settings</h1>
        <p className="text-body text-secondary">
          Manage {activeOrganization.name}
        </p>
      </div>

      <div className="space-y-8">
        {/* Members Section */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {isAdmin && (
                <form onSubmit={handleInvite} className="flex gap-3 items-end border-b border-border pb-6">
                  <div className="flex-1 space-y-1">
                    <label className="text-small font-medium">Invite by Email</label>
                    <Input 
                      type="email" 
                      placeholder="colleague@example.com" 
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="w-[150px] space-y-1">
                    <label className="text-small font-medium">Role</label>
                    <Select 
                      value={inviteRole}
                      onChange={setInviteRole}
                      options={[
                        { label: 'Member', value: 'member' },
                        { label: 'Manager', value: 'manager' },
                        { label: 'Admin', value: 'admin' }
                      ]}
                    />
                  </div>
                  <Button type="submit" variant="primary">Invite</Button>
                </form>
              )}

              {/* Show an upgrade link if toast error says limit */}
              {toasts.some(t => t.message?.toLowerCase().includes('limit')) && (
                <div className="p-3 bg-danger-50 text-danger-600 rounded-md border border-danger-100 flex flex-col gap-2">
                  <span>It looks like you've reached your plan's limits.</span>
                  <a href="/app/settings/billing" className="font-bold underline hover:text-danger-700">
                    Upgrade your plan to add more members
                  </a>
                </div>
              )}

              <div className="space-y-4">
                {isLoading ? (
                  <p className="text-secondary text-small">Loading members...</p>
                ) : (
                  members.map(member => (
                    <div key={member.user._id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-canvas">
                      <div className="flex items-center gap-3">
                        <Avatar name={member.user.name} src={member.user.avatarUrl} size="md" />
                        <div>
                          <div className="text-body-medium font-medium">{member.user.name} {member.user._id === user._id && '(You)'}</div>
                          <div className="text-small text-secondary">{member.user.email}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {isAdmin && member.user._id !== user._id ? (
                          <>
                            <div className="w-[120px]">
                              <Select 
                                value={member.role}
                                onChange={(val) => handleUpdateRole(member.user._id, val)}
                                options={[
                                  { label: 'Member', value: 'member' },
                                  { label: 'Manager', value: 'manager' },
                                  { label: 'Admin', value: 'admin' }
                                ]}
                              />
                            </div>
                            <Button variant="ghost" className="text-danger-600" onClick={() => handleRemoveMember(member.user._id)}>
                              Remove
                            </Button>
                          </>
                        ) : (
                          <div className="px-3 py-1 bg-surface-muted rounded text-small text-secondary capitalize font-medium">
                            {member.role}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        isLoading={confirmModal.isLoading}
      />
    </div>
  );
};

export default OrganizationSettings;
