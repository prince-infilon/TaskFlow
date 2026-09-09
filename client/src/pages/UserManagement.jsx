import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Briefcase, 
  User, 
  ChevronDown, 
  ChevronRight, 
  KeyRound, 
  UserCheck, 
  UserX, 
  ArrowRightLeft, 
  Search, 
  Edit2, 
  RefreshCw,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { socket } from '../api/socket';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';
import Toast, { ToastContainer } from '../components/ui/Toast';

export default function UserManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect if not Admin
  useEffect(() => {
    if (user && user.globalRole !== 'admin') {
      if (user.globalRole === 'manager') {
        navigate('/app/team', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
    }
  }, [user, navigate]);

  // Main state
  const [users, setUsers] = useState([]);
  const [activeManagers, setActiveManagers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedManagers, setExpandedManagers] = useState({});
  const [toasts, setToasts] = useState([]);

  // Modals state
  const [modalType, setModalType] = useState(null); // 'addAdmin', 'addManager', 'addMember', 'edit', 'reassign', 'resetPassword'
  const [selectedUser, setSelectedUser] = useState(null);
  const [preselectedManagerId, setPreselectedManagerId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    managerId: '',
    newPassword: ''
  });

  const showToast = (message, type = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/users');
      const loadedUsers = res.data?.users || res.users || [];
      setUsers(loadedUsers);

      // Auto-expand all managers by default
      const expandMap = {};
      loadedUsers
        .filter((u) => u.globalRole === 'manager')
        .forEach((m) => {
          expandMap[m._id] = true;
        });
      setExpandedManagers((prev) => ({ ...expandMap, ...prev }));
    } catch (err) {
      showToast(err.message || 'Failed to load users', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch active managers for member creation & reassignment dropdowns
  const fetchActiveManagers = async () => {
    try {
      const res = await apiClient.get('/users/active-managers');
      setActiveManagers(res.data?.managers || res.managers || []);
    } catch (err) {
      console.error('Failed to load active managers:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchActiveManagers();

    // Socket real-time listeners
    const handleUserEvent = () => {
      fetchUsers();
      fetchActiveManagers();
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

  const toggleManagerExpand = (managerId) => {
    setExpandedManagers((prev) => ({
      ...prev,
      [managerId]: !prev[managerId]
    }));
  };

  // Filtered lists
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (roleFilter !== 'all' && u.globalRole !== roleFilter) return false;
      // Status filter
      if (statusFilter === 'active' && !u.isActive) return false;
      if (statusFilter === 'inactive' && u.isActive) return false;
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = u.name?.toLowerCase().includes(query);
        const matchEmail = u.email?.toLowerCase().includes(query);
        if (!matchName && !matchEmail) return false;
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  // Group into Admins, Managers, and Members
  const admins = useMemo(() => {
    return filteredUsers.filter((u) => u.globalRole === 'admin');
  }, [filteredUsers]);

  const managers = useMemo(() => {
    return filteredUsers.filter((u) => u.globalRole === 'manager');
  }, [filteredUsers]);

  // Map of managerId -> members
  const membersByManager = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      if (u.globalRole === 'member') {
        const mId = u.managerId?._id || u.managerId || 'unassigned';
        if (!map[mId]) map[mId] = [];
        // Only include if matches current filters
        const matchesFilter = filteredUsers.some((fu) => fu._id === u._id);
        if (matchesFilter) {
          map[mId].push(u);
        }
      }
    });
    return map;
  }, [users, filteredUsers]);

  // Unassigned members (in case any exist)
  const unassignedMembers = useMemo(() => {
    return membersByManager['unassigned'] || [];
  }, [membersByManager]);

  // Modal openers
  const openAddAdminModal = () => {
    setFormData({ name: '', email: '', password: '', confirmPassword: '', managerId: '' });
    setModalType('addAdmin');
  };

  const openAddManagerModal = () => {
    setFormData({ name: '', email: '', password: '', confirmPassword: '', managerId: '' });
    setModalType('addManager');
  };

  const openAddMemberModal = (managerId = '') => {
    const defaultMgr = managerId || (activeManagers.length > 0 ? activeManagers[0]._id : '');
    setPreselectedManagerId(defaultMgr);
    setFormData({ name: '', email: '', password: '', confirmPassword: '', managerId: defaultMgr });
    setModalType('addMember');
  };

  const openEditModal = (targetUser) => {
    setSelectedUser(targetUser);
    setFormData({
      name: targetUser.name || '',
      email: targetUser.email || '',
      password: '',
      confirmPassword: '',
      managerId: ''
    });
    setModalType('edit');
  };

  const openReassignModal = (targetMember) => {
    setSelectedUser(targetMember);
    const currentMgrId = targetMember.managerId?._id || targetMember.managerId || '';
    const otherManagers = activeManagers.filter((m) => m._id !== currentMgrId);
    setFormData({
      managerId: otherManagers.length > 0 ? otherManagers[0]._id : ''
    });
    setModalType('reassign');
  };

  const openResetPasswordModal = (targetUser) => {
    setSelectedUser(targetUser);
    setFormData({ newPassword: '', confirmPassword: '' });
    setModalType('resetPassword');
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedUser(null);
    setIsSubmitting(false);
  };

  // Submit handlers
  const handleCreateUser = async (e, role) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.email?.trim() || !formData.password) {
      showToast('Please fill in all required fields.', 'danger');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      showToast('Passwords do not match.', 'danger');
      return;
    }
    if (role === 'member' && !formData.managerId) {
      showToast('Please select a manager for this member.', 'danger');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post('/users', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: role,
        ...(role === 'member' ? { managerId: formData.managerId } : {})
      });
      showToast(`${role.charAt(0).toUpperCase() + role.slice(1)} created successfully!`);
      closeModal();
      fetchUsers();
      fetchActiveManagers();
    } catch (err) {
      showToast(err.message || `Failed to create ${role}`, 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await apiClient.put(`/users/${selectedUser._id}`, {
        name: formData.name,
        email: formData.email
      });
      showToast('User updated successfully!');
      closeModal();
      fetchUsers();
      fetchActiveManagers();
    } catch (err) {
      showToast(err.message || 'Failed to update user', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReassignMember = async (e) => {
    e.preventDefault();
    if (!formData.managerId) {
      showToast('Please select a new manager.', 'danger');
      return;
    }
    try {
      setIsSubmitting(true);
      await apiClient.patch(`/users/${selectedUser._id}/reassign`, {
        managerId: formData.managerId
      });
      showToast('Member reassigned successfully!');
      closeModal();
      fetchUsers();
    } catch (err) {
      showToast(err.message || 'Failed to reassign member', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (targetUser) => {
    if (targetUser._id === user._id) {
      showToast('You cannot deactivate your own administrative account.', 'danger');
      return;
    }
    const action = targetUser.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${targetUser.name}?`)) return;

    try {
      await apiClient.patch(`/users/${targetUser._id}/status`);
      showToast(`User ${action}d successfully.`);
      fetchUsers();
      fetchActiveManagers();
    } catch (err) {
      showToast(err.message || `Failed to ${action} user`, 'danger');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      showToast('Passwords do not match.', 'danger');
      return;
    }
    try {
      setIsSubmitting(true);
      await apiClient.post(`/users/${selectedUser._id}/reset-password`, {
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

  return (
    <div className="max-w-6xl mx-auto w-full animate-in fade-in duration-300 pb-16 space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Users className="w-6 h-6" /> User Management
          </h1>
          <p className="text-sm text-secondary mt-1">
            Global administrative directory with hierarchical manager and member provisioning.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={openAddAdminModal} className="flex items-center gap-1.5">
            <Shield className="w-4 h-4" /> + Add Admin
          </Button>
          <Button variant="secondary" size="sm" onClick={openAddManagerModal} className="flex items-center gap-1.5">
            <Briefcase className="w-4 h-4" /> + Add Manager
          </Button>
          <Button variant="primary" size="sm" onClick={() => openAddMemberModal()} className="flex items-center gap-1.5">
            <UserPlus className="w-4 h-4" /> + Add Member
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-border rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-canvas border border-border rounded-md text-primary placeholder-secondary focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-secondary">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs bg-canvas border border-border rounded-md px-2.5 py-1 text-primary focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins</option>
              <option value="manager">Managers</option>
              <option value="member">Members</option>
            </select>
          </div>

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

          <Button variant="ghost" size="sm" onClick={() => { fetchUsers(); fetchActiveManagers(); }} title="Refresh directory">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* SECTION 1: Admins */}
      {(roleFilter === 'all' || roleFilter === 'admin') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-secondary flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Administrators ({admins.length})
            </h2>
          </div>

          <div className="bg-surface border border-border rounded-lg overflow-hidden divide-y divide-border">
            {admins.length === 0 ? (
              <div className="p-6 text-center text-sm text-secondary">No administrators match the filters.</div>
            ) : (
              admins.map((adm) => (
                <div key={adm._id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-canvas/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar name={adm.name} size="sm" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-primary">{adm.name}</span>
                        {adm._id === user._id && (
                          <span className="text-[10px] bg-neutral-200 text-neutral-800 px-1.5 py-0.5 rounded font-medium">You</span>
                        )}
                        <Badge variant={adm.isActive ? 'done' : 'low'}>
                          {adm.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-xs text-secondary">{adm.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(adm)} className="h-8 px-2 text-xs">
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openResetPasswordModal(adm)} className="h-8 px-2 text-xs">
                      <KeyRound className="w-3.5 h-3.5 mr-1" /> Reset Pwd
                    </Button>
                    {adm._id !== user._id && (
                      <Button
                        variant={adm.isActive ? 'ghost' : 'secondary'}
                        size="sm"
                        onClick={() => handleToggleStatus(adm)}
                        className={`h-8 px-2 text-xs ${adm.isActive ? 'text-danger hover:bg-danger/10' : 'text-success'}`}
                      >
                        {adm.isActive ? <UserX className="w-3.5 h-3.5 mr-1" /> : <UserCheck className="w-3.5 h-3.5 mr-1" />}
                        {adm.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: Hierarchical Managers & Teams */}
      {(roleFilter === 'all' || roleFilter === 'manager' || roleFilter === 'member') && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-secondary flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" /> Managers & Hierarchy Tree ({managers.length} Managers)
            </h2>
          </div>

          {managers.length === 0 ? (
            <div className="bg-surface border border-border rounded-lg p-8 text-center text-secondary text-sm">
              No managers found matching the current filters.
            </div>
          ) : (
            <div className="space-y-3">
              {managers.map((mgr) => {
                const assignedMembers = membersByManager[mgr._id] || [];
                const isExpanded = !!expandedManagers[mgr._id];

                return (
                  <div key={mgr._id} className="bg-surface border border-border rounded-lg overflow-hidden">
                    {/* Manager Row */}
                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-canvas/40 border-b border-border">
                      <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => toggleManagerExpand(mgr._id)}>
                        <button className="p-1 text-secondary hover:text-primary transition-colors">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <Avatar name={mgr.name} size="md" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-primary">{mgr.name}</span>
                            <span className="text-xs text-secondary font-medium">({mgr.email})</span>
                            <Badge variant={mgr.isActive ? 'done' : 'low'}>
                              {mgr.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-xs text-secondary mt-0.5">
                            Team size: <strong className="text-primary font-medium">{assignedMembers.length} {assignedMembers.length === 1 ? 'Member' : 'Members'}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Manager Controls */}
                      <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
                        {mgr.isActive && (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => openAddMemberModal(mgr._id)}
                            className="h-8 px-2.5 text-xs flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Member
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(mgr)} className="h-8 px-2 text-xs">
                          <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openResetPasswordModal(mgr)} className="h-8 px-2 text-xs">
                          <KeyRound className="w-3.5 h-3.5 mr-1" /> Reset Pwd
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(mgr)}
                          className={`h-8 px-2 text-xs ${mgr.isActive ? 'text-danger hover:bg-danger/10' : 'text-success hover:bg-success/10'}`}
                        >
                          {mgr.isActive ? <UserX className="w-3.5 h-3.5 mr-1" /> : <UserCheck className="w-3.5 h-3.5 mr-1" />}
                          {mgr.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </div>

                    {/* Expandable Members Sub-tree */}
                    {isExpanded && (
                      <div className="p-3 bg-surface">
                        {assignedMembers.length === 0 ? (
                          <div className="py-6 text-center text-xs text-secondary italic">
                            No members assigned to {mgr.name} yet. Click &quot;Add Member&quot; above to assign one.
                          </div>
                        ) : (
                          <div className="divide-y divide-border/60">
                            {assignedMembers.map((member, index) => {
                              const isLast = index === assignedMembers.length - 1;
                              return (
                                <div 
                                  key={member._id} 
                                  className="py-2.5 px-3 pl-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-canvas/30 rounded transition-colors relative"
                                >
                                  {/* Tree Branch line visual */}
                                  <div className="hidden sm:block absolute left-4 top-1/2 -translate-y-1/2 w-2.5 h-[1px] bg-border" />

                                  <div className="flex items-center gap-3">
                                    <Avatar name={member.name} size="sm" />
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-primary">{member.name}</span>
                                        <Badge variant={member.isActive ? 'done' : 'low'}>
                                          {member.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                      </div>
                                      <p className="text-[11px] text-secondary">{member.email}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => openReassignModal(member)}
                                      className="h-7 px-2 text-xs flex items-center gap-1"
                                      title="Reassign to another manager"
                                    >
                                      <ArrowRightLeft className="w-3 h-3" /> Reassign
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditModal(member)}
                                      className="h-7 px-2 text-xs"
                                    >
                                      <Edit2 className="w-3 h-3 mr-1" /> Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openResetPasswordModal(member)}
                                      className="h-7 px-2 text-xs"
                                    >
                                      <KeyRound className="w-3 h-3 mr-1" /> Reset Pwd
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleToggleStatus(member)}
                                      className={`h-7 px-2 text-xs ${member.isActive ? 'text-danger hover:bg-danger/10' : 'text-success hover:bg-success/10'}`}
                                    >
                                      {member.isActive ? <UserX className="w-3 h-3 mr-1" /> : <UserCheck className="w-3 h-3 mr-1" />}
                                      {member.isActive ? 'Deactivate' : 'Activate'}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Unassigned members (if any) */}
          {unassignedMembers.length > 0 && (
            <div className="mt-6 border border-warning/30 bg-warning/5 rounded-lg p-4">
              <h3 className="text-xs font-semibold uppercase text-warning flex items-center gap-1.5 mb-3">
                Unassigned Members ({unassignedMembers.length})
              </h3>
              <div className="divide-y divide-border">
                {unassignedMembers.map((m) => (
                  <div key={m._id} className="py-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-primary">{m.name}</p>
                      <p className="text-[11px] text-secondary">{m.email}</p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => openReassignModal(m)} className="text-xs h-7">
                      <ArrowRightLeft className="w-3 h-3 mr-1" /> Assign Manager
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* Modal 1: Add Admin */}
      <Modal
        isOpen={modalType === 'addAdmin'}
        onClose={closeModal}
        title="Add Administrator"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSubmitting}>Cancel</Button>
            <Button variant="primary" onClick={(e) => handleCreateUser(e, 'admin')} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Admin'}
            </Button>
          </>
        }
      >
        <form onSubmit={(e) => handleCreateUser(e, 'admin')} className="space-y-4">
          <p className="text-xs text-secondary">
            Administrators have global visibility, can provision managers/admins/members, and manage all organization settings.
          </p>
          <Input
            label="Full Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Jane Doe"
          />
          <Input
            label="Email Address"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="admin@example.com"
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

      {/* Modal 2: Add Manager */}
      <Modal
        isOpen={modalType === 'addManager'}
        onClose={closeModal}
        title="Add Manager"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSubmitting}>Cancel</Button>
            <Button variant="primary" onClick={(e) => handleCreateUser(e, 'manager')} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Manager'}
            </Button>
          </>
        }
      >
        <form onSubmit={(e) => handleCreateUser(e, 'manager')} className="space-y-4">
          <p className="text-xs text-secondary">
            Managers can manage and view only their own assigned team members. They cannot see other teams or create other managers.
          </p>
          <Input
            label="Full Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Sarah Connor"
          />
          <Input
            label="Email Address"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="manager@example.com"
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

      {/* Modal 3: Add Member (with Manager Selection) */}
      <Modal
        isOpen={modalType === 'addMember'}
        onClose={closeModal}
        title="Add Team Member"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSubmitting}>Cancel</Button>
            <Button variant="primary" onClick={(e) => handleCreateUser(e, 'member')} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Member'}
            </Button>
          </>
        }
      >
        <form onSubmit={(e) => handleCreateUser(e, 'member')} className="space-y-4">
          <Input
            label="Full Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="John Smith"
          />
          <Input
            label="Email Address"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="member@example.com"
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

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-primary">
              Assign Manager <span className="text-danger">*</span>
            </label>
            <Select
              options={activeManagers.map((m) => ({ label: `${m.name} (${m.email})`, value: m._id }))}
              value={formData.managerId}
              onChange={(val) => setFormData({ ...formData, managerId: val })}
              placeholder="Select an active manager..."
              className="w-full"
            />
            {activeManagers.length === 0 && (
              <p className="text-[11px] text-danger">
                No active managers found. You must create an active manager before creating members.
              </p>
            )}
          </div>
        </form>
      </Modal>

      {/* Modal 4: Edit User */}
      <Modal
        isOpen={modalType === 'edit'}
        onClose={closeModal}
        title={`Edit ${selectedUser?.name}`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSubmitting}>Cancel</Button>
            <Button variant="primary" onClick={handleUpdateUser} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
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

      {/* Modal 5: Reassign Member */}
      <Modal
        isOpen={modalType === 'reassign'}
        onClose={closeModal}
        title={`Reassign Member: ${selectedUser?.name}`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSubmitting}>Cancel</Button>
            <Button variant="primary" onClick={handleReassignMember} disabled={isSubmitting}>
              {isSubmitting ? 'Reassigning...' : 'Reassign Member'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleReassignMember} className="space-y-4">
          <div className="p-3 bg-canvas border border-border rounded-md text-xs space-y-1">
            <p className="text-secondary">
              Current Manager:{' '}
              <strong className="text-primary font-semibold">
                {selectedUser?.managerId?.name || 'Unassigned'}
              </strong>{' '}
              ({selectedUser?.managerId?.email || 'N/A'})
            </p>
            <p className="text-[11px] text-secondary">
              Reassigning this member will immediately remove them from the current manager&apos;s visibility and grant visibility to the newly selected manager.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-primary">
              New Manager <span className="text-danger">*</span>
            </label>
            <Select
              options={activeManagers
                .filter((m) => m._id !== (selectedUser?.managerId?._id || selectedUser?.managerId))
                .map((m) => ({ label: `${m.name} (${m.email})`, value: m._id }))}
              value={formData.managerId}
              onChange={(val) => setFormData({ ...formData, managerId: val })}
              placeholder="Select target manager..."
              className="w-full"
            />
          </div>
        </form>
      </Modal>

      {/* Modal 6: Reset Password */}
      <Modal
        isOpen={modalType === 'resetPassword'}
        onClose={closeModal}
        title={`Reset Password: ${selectedUser?.name}`}
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
            Set a new temporary password for <strong>{selectedUser?.name}</strong> ({selectedUser?.email}).
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
