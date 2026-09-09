import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  KeyRound, 
  UserCheck, 
  UserX, 
  Search, 
  Edit2, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { socket } from '../api/socket';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';
import Toast, { ToastContainer } from '../components/ui/Toast';

export default function MyTeam() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect if not Manager
  useEffect(() => {
    if (user && user.globalRole !== 'manager') {
      if (user.globalRole === 'admin') {
        navigate('/app/users', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
    }
  }, [user, navigate]);

  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toasts, setToasts] = useState([]);

  // Modals state
  const [modalType, setModalType] = useState(null); // 'addMember', 'edit', 'resetPassword'
  const [selectedMember, setSelectedMember] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    newPassword: ''
  });

  const showToast = (message, type = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch only this manager's members
  const fetchMyMembers = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/users');
      const loaded = res.data?.users || res.users || [];
      setMembers(loaded);
    } catch (err) {
      showToast(err.message || 'Failed to load team members', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyMembers();

    // Socket.io real-time updates
    const handleUserEvent = () => {
      fetchMyMembers();
    };

    socket.on('user_created', handleUserEvent);
    socket.on('user_updated', handleUserEvent);
    socket.on('user_deactivated', handleUserEvent);
    socket.on('user_reassigned', handleUserEvent);

    return () => {
      socket.off('user_created', handleUserEvent);
      socket.off('user_updated', handleUserEvent);
      socket.off('user_deactivated', handleUserEvent);
      socket.off('user_reassigned', handleUserEvent);
    };
  }, []);

  // Filter scoped strictly to this manager's members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (statusFilter === 'active' && !m.isActive) return false;
      if (statusFilter === 'inactive' && m.isActive) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = m.name?.toLowerCase().includes(query);
        const matchEmail = m.email?.toLowerCase().includes(query);
        if (!matchName && !matchEmail) return false;
      }
      return true;
    });
  }, [members, statusFilter, searchQuery]);

  // Modal actions
  const openAddMemberModal = () => {
    setFormData({ name: '', email: '', password: '', confirmPassword: '', newPassword: '' });
    setModalError('');
    setModalType('addMember');
  };

  const openEditModal = (member) => {
    setSelectedMember(member);
    setFormData({
      name: member.name || '',
      email: member.email || '',
      password: '',
      confirmPassword: '',
      newPassword: ''
    });
    setModalError('');
    setModalType('edit');
  };

  const openResetPasswordModal = (member) => {
    setSelectedMember(member);
    setFormData({ newPassword: '', confirmPassword: '' });
    setModalError('');
    setModalType('resetPassword');
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedMember(null);
    setModalError('');
    setIsSubmitting(false);
  };

  // Submit: Manager creates member (Manager ID is automatically set by backend to req.user._id)
  const handleCreateMember = async (e) => {
    e.preventDefault();
    setModalError('');
    if (!formData.name?.trim() || !formData.email?.trim() || !formData.password) {
      const msg = 'Please fill in all required fields.';
      setModalError(msg);
      showToast(msg, 'danger');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      const msg = 'Passwords do not match.';
      setModalError(msg);
      showToast(msg, 'danger');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post('/users', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: 'member'
      });
      showToast('Team member created successfully!');
      closeModal();
      fetchMyMembers();
    } catch (err) {
      const isDuplicate = err.message?.toLowerCase().includes('already exists') || err.message?.toLowerCase().includes('email');
      const msg = isDuplicate 
        ? 'An account with this email address already exists. Please use a different email address.' 
        : (err.message || 'Failed to create member');
      setModalError(msg);
      showToast(msg, 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit: Update member details
  const handleUpdateMember = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setModalError('');
    if (!formData.name?.trim() || !formData.email?.trim()) {
      const msg = 'Please fill in both name and email address.';
      setModalError(msg);
      showToast(msg, 'danger');
      return;
    }
    try {
      setIsSubmitting(true);
      await apiClient.put(`/users/${selectedMember._id}`, {
        name: formData.name.trim(),
        email: formData.email.trim()
      });
      showToast('Member profile updated successfully!');
      closeModal();
      fetchMyMembers();
    } catch (err) {
      const isDuplicate = err.message?.toLowerCase().includes('already exists') || err.message?.toLowerCase().includes('email');
      const msg = isDuplicate 
        ? 'An account with this email address already exists. Please use a different email address.' 
        : (err.message || 'Failed to update member');
      setModalError(msg);
      showToast(msg, 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit: Reset member password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      showToast('Passwords do not match.', 'danger');
      return;
    }
    try {
      setIsSubmitting(true);
      await apiClient.post(`/users/${selectedMember._id}/reset-password`, {
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword
      });
      showToast('Password reset successfully!');
      closeModal();
    } catch (err) {
      showToast(err.message || 'Failed to reset password', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit: Toggle member status
  const handleToggleStatus = async (targetMember) => {
    const action = targetMember.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${targetMember.name}?`)) return;

    try {
      await apiClient.patch(`/users/${targetMember._id}/status`);
      showToast(`Member ${action}d successfully.`);
      fetchMyMembers();
    } catch (err) {
      showToast(err.message || `Failed to ${action} member`, 'danger');
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full animate-in fade-in duration-300 pb-16 space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
              <Users className="w-6 h-6" /> My Team
            </h1>
            <span className="text-xs bg-inset text-primary px-2.5 py-1 rounded-full font-semibold border border-border">
              {members.length} {members.length === 1 ? 'Member' : 'Members'}
            </span>
          </div>
          <p className="text-sm text-secondary mt-1">
            Members assigned to you. Manage your direct reports, reset passwords, and provision new team members.
          </p>
        </div>

        {/* Add Member Button */}
        <div>
          <Button variant="primary" size="sm" onClick={openAddMemberModal} className="flex items-center gap-1.5">
            <UserPlus className="w-4 h-4" /> + Add Member
          </Button>
        </div>
      </div>

      {/* Scoped Search and Filter */}
      <div className="bg-surface border border-border rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search my members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-canvas border border-border rounded-md text-primary placeholder-secondary focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-secondary">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-canvas border border-border rounded-md px-2.5 py-1 text-primary focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <Button variant="ghost" size="sm" onClick={fetchMyMembers} title="Refresh team directory">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Team Members List */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden divide-y divide-border">
        {filteredMembers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-8 h-8 text-secondary mx-auto mb-3 opacity-50" />
            <h3 className="text-sm font-semibold text-primary">No team members found</h3>
            <p className="text-xs text-secondary mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'No members match the current filter criteria.'
                : 'You have not added any team members yet. Click "+ Add Member" to get started.'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button variant="secondary" size="sm" onClick={openAddMemberModal} className="mt-4">
                <UserPlus className="w-3.5 h-3.5 mr-1" /> Add Your First Member
              </Button>
            )}
          </div>
        ) : (
          filteredMembers.map((member) => (
            <div
              key={member._id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-canvas/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar name={member.name} size="md" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary">{member.name}</span>
                    <Badge variant={member.isActive ? 'done' : 'low'}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-xs text-secondary">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditModal(member)}
                  className="h-8 px-2 text-xs"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openResetPasswordModal(member)}
                  className="h-8 px-2 text-xs"
                >
                  <KeyRound className="w-3.5 h-3.5 mr-1" /> Reset Pwd
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleStatus(member)}
                  className={`h-8 px-2 text-xs ${member.isActive ? 'text-danger hover:bg-danger/10' : 'text-success hover:bg-success/10'}`}
                >
                  {member.isActive ? <UserX className="w-3.5 h-3.5 mr-1" /> : <UserCheck className="w-3.5 h-3.5 mr-1" />}
                  {member.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ================= MODALS ================= */}

      {/* Modal 1: Add Member (Manager creates member without manager selector) */}
      <Modal
        isOpen={modalType === 'addMember'}
        onClose={closeModal}
        title="Add Team Member"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSubmitting}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateMember} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Member'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateMember} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-danger-50 border border-danger-200 text-danger-600 rounded-md text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-danger-500" />
              <span>{modalError}</span>
            </div>
          )}
          <p className="text-xs text-secondary">
            This new member will be automatically assigned under your management.
          </p>
          <Input
            label="Full Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Alex Rivera"
          />
          <Input
            label="Email Address"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="alex@example.com"
          />
          <Input
            label="Password"
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="••••••••"
          />
          <Input
            label="Confirm Password"
            type="password"
            required
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            placeholder="••••••••"
          />
        </form>
      </Modal>

      {/* Modal 2: Edit Member */}
      <Modal
        isOpen={modalType === 'edit'}
        onClose={closeModal}
        title={`Edit Member: ${selectedMember?.name}`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSubmitting}>Cancel</Button>
            <Button variant="primary" onClick={handleUpdateMember} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdateMember} className="space-y-4">
          {modalError && (
            <div className="text-small p-3 bg-danger-50 text-danger-600 rounded-md border border-danger-100 font-medium">
              {modalError}
            </div>
          )}
          <Input
            label="Full Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Email Address"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </form>
      </Modal>

      {/* Modal 3: Reset Member Password */}
      <Modal
        isOpen={modalType === 'resetPassword'}
        onClose={closeModal}
        title={`Reset Password: ${selectedMember?.name}`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSubmitting}>Cancel</Button>
            <Button variant="primary" onClick={handleResetPassword} disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-xs text-secondary">
            Set a new temporary password for <strong>{selectedMember?.name}</strong> ({selectedMember?.email}).
          </p>
          <Input
            label="New Password"
            type="password"
            required
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            placeholder="At least 6 characters"
          />
          <Input
            label="Confirm New Password"
            type="password"
            required
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            placeholder="Confirm password"
          />
        </form>
      </Modal>
    </div>
  );
}
