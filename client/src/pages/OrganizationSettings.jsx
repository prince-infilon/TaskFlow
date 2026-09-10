import React, { useState, useEffect, useCallback } from 'react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Toast, { ToastContainer } from '../components/ui/Toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import Avatar from '../components/ui/Avatar';
import { 
  Building2, 
  Users, 
  UserPlus, 
  Shield, 
  Trash2, 
  Search, 
  Crown,
  RefreshCw
} from 'lucide-react';

const OrganizationSettings = () => {
  const { activeOrganization, user } = useAuth();
  
  const [members, setMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ 
    isOpen: false, 
    title: '', 
    message: '', 
    confirmText: '', 
    variant: 'danger', 
    onConfirm: null, 
    isLoading: false 
  });

  const showToast = (message, type = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const fetchMembers = useCallback(async () => {
    if (!activeOrganization || !activeOrganization._id) return;
    try {
      setIsLoading(true);
      const orgId = activeOrganization._id;

      const res = await apiClient.get(`/orgs/${orgId}/members`, {
        headers: { 'x-organization-id': orgId }
      });

      const membersList = res.members || res.data?.members || [];
      setMembers(membersList);
    } catch (error) {
      console.error('Fetch members error:', error);
      showToast(error.message || 'Failed to load workspace members.', 'danger');
    } finally {
      setIsLoading(false);
    }
  }, [activeOrganization]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.trim()) return;

    try {
      setIsInviting(true);
      const orgId = activeOrganization._id;
      await apiClient.post(
        `/orgs/${orgId}/members`,
        { email: inviteEmail.trim(), role: inviteRole },
        { headers: { 'x-organization-id': orgId } }
      );

      showToast(`Invited ${inviteEmail} successfully!`, 'success');
      setInviteEmail('');
      fetchMembers();
    } catch (error) {
      showToast(error.message || 'Failed to invite user.', 'danger');
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const orgId = activeOrganization._id;
      await apiClient.patch(
        `/orgs/${orgId}/members/${userId}`,
        { role: newRole },
        { headers: { 'x-organization-id': orgId } }
      );

      showToast('Member role updated successfully.', 'success');
      fetchMembers();
    } catch (error) {
      showToast(error.message || 'Failed to update role.', 'danger');
    }
  };

  const handleRemoveMember = (userId, memberName) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Member',
      message: `Are you sure you want to remove ${memberName} from the workspace? They will lose access to all organization boards and tasks.`,
      confirmText: 'Remove Member',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          const orgId = activeOrganization._id;
          await apiClient.delete(`/orgs/${orgId}/members/${userId}`, {
            headers: { 'x-organization-id': orgId }
          });

          showToast('Member removed from workspace.', 'success');
          fetchMembers();
        } catch (error) {
          showToast(error.message || 'Failed to remove member.', 'danger');
        } finally {
          setConfirmModal({ isOpen: false, title: '', message: '', confirmText: '', variant: 'danger', onConfirm: null, isLoading: false });
        }
      }
    });
  };

  const myMembership = members.find(m => (m.user?._id || m.user) === user?._id);
  const isAdminOrManager = user?.globalRole === 'admin' || user?.globalRole === 'manager' || myMembership?.role === 'admin' || myMembership?.role === 'manager';

  const filteredMembers = members.filter(m => {
    if (!memberSearch.trim()) return true;
    const name = m.user?.name || '';
    const email = m.user?.email || '';
    return name.toLowerCase().includes(memberSearch.toLowerCase()) || email.toLowerCase().includes(memberSearch.toLowerCase());
  });

  if (!activeOrganization) {
    return (
      <div className="p-8 text-center text-slate-400">
        <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
        <p className="text-sm font-medium">No workspace selected.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[960px] mx-auto w-full animate-in fade-in duration-300 pb-16 text-slate-800">
      {/* Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg shrink-0 border border-indigo-100">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900">{activeOrganization.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                Workspace
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Workspace ID: <span className="font-mono text-[11px] text-slate-400">{activeOrganization._id}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMembers}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Members</p>
            <h3 className="text-xl font-extrabold text-slate-900">{members.length}</h3>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Workspace Owner</p>
            <h3 className="text-sm font-bold text-slate-900 truncate max-w-[160px]">
              {activeOrganization.owner?.name || user?.name || 'Owner'}
            </h3>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Your Role</p>
            <h3 className="text-sm font-bold text-slate-900 capitalize">
              {myMembership?.role || user?.globalRole || 'Member'}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Members Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              Workspace Members ({members.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              People who have access to this organization's projects & boards
            </p>
          </div>

          {/* Member Search Bar */}
          <div className="relative w-full sm:w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search members..."
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Invite Member Form (Admins & Managers) */}
        {isAdminOrManager && (
          <form onSubmit={handleInvite} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <UserPlus className="w-4 h-4 text-indigo-500" />
              Invite Team Member
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full space-y-1">
                <label className="text-[11px] font-semibold text-slate-500">Email Address</label>
                <Input 
                  type="email" 
                  placeholder="colleague@example.com" 
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="text-xs bg-white"
                />
              </div>

              <div className="w-full sm:w-[150px] space-y-1">
                <label className="text-[11px] font-semibold text-slate-500">Role</label>
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

              <Button 
                type="submit" 
                variant="primary" 
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2 font-semibold text-xs transition-all shadow-xs shrink-0"
                isLoading={isInviting}
              >
                Send Invite
              </Button>
            </div>
          </form>
        )}

        {/* Members List */}
        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Loading members...
            </div>
          ) : filteredMembers.length > 0 ? (
            filteredMembers.map(member => {
              const memberObj = member.user || {};
              const memberId = memberObj._id || memberObj.id;
              const isCurrentUser = memberId === user?._id;

              return (
                <div key={memberId} className="py-3.5 flex items-center justify-between gap-4 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={memberObj.name || 'Member'} src={memberObj.avatarUrl} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {memberObj.name || 'Unknown User'}
                        </span>
                        {isCurrentUser && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {memberObj.email || ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {isAdminOrManager && !isCurrentUser ? (
                      <>
                        <div className="w-[120px]">
                          <Select 
                            value={member.role}
                            onChange={(val) => handleUpdateRole(memberId, val)}
                            options={[
                              { label: 'Member', value: 'member' },
                              { label: 'Manager', value: 'manager' },
                              { label: 'Admin', value: 'admin' }
                            ]}
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveMember(memberId, memberObj.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <span className="px-3 py-1 rounded-lg bg-slate-100 text-xs font-semibold text-slate-600 capitalize">
                        {member.role}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              No members found matching "{memberSearch}".
            </div>
          )}
        </div>
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
