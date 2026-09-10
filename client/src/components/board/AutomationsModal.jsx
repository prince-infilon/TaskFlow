import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { 
  Trash2, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Layers
} from 'lucide-react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const AutomationsModal = ({ isOpen, onClose, boardId, columns = [] }) => {
  const { user } = useAuth();
  const [automations, setAutomations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isManager = user?.globalRole === 'admin' || user?.globalRole === 'manager';

  const [newRule, setNewRule] = useState({
    trigger: 'task_moved',
    columnId: columns.length > 0 ? (columns[0].id || columns[0]._id) : '',
    action: 'mark_complete',
    actionPayload: { priority: 'medium' }
  });

  const fetchAutomations = useCallback(async () => {
    if (!boardId) return;
    try {
      setIsLoading(true);
      setError('');
      const res = await apiClient.get(`/boards/${boardId}/automations`);
      const automationsList = res.data?.data?.automations || res.data?.automations || res.data || [];
      setAutomations(automationsList);
    } catch (err) {
      console.error('Failed to fetch automations:', err);
      setError('Failed to load automations. Please check your network connection.');
    } finally {
      setIsLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    if (isOpen) {
      fetchAutomations();
      if (columns.length > 0 && !newRule.columnId) {
        setNewRule(prev => ({ ...prev, columnId: columns[0].id || columns[0]._id }));
      }
    }
  }, [isOpen, fetchAutomations, columns]);

  const handleCreate = async () => {
    if (!newRule.trigger || !newRule.action) return;
    setIsCreating(true);
    setError('');
    setSuccessMsg('');

    try {
      const payload = {
        trigger: newRule.trigger,
        action: newRule.action,
        condition: { columnId: newRule.columnId }
      };

      if (newRule.action === 'set_priority') {
        payload.actionPayload = { priority: newRule.actionPayload?.priority || 'medium' };
      }

      const res = await apiClient.post(`/boards/${boardId}/automations`, payload);
      const createdAuto = res.data?.data?.automation || res.data?.automation;

      if (createdAuto) {
        setAutomations(prev => [createdAuto, ...prev]);
        setSuccessMsg('Automation rule created successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }

      setNewRule({
        trigger: 'task_moved',
        columnId: columns.length > 0 ? (columns[0].id || columns[0]._id) : '',
        action: 'mark_complete',
        actionPayload: { priority: 'medium' }
      });
    } catch (err) {
      console.error('Create automation error:', err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to create automation rule');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (auto) => {
    try {
      const nextState = !auto.isActive;
      const res = await apiClient.patch(`/boards/${boardId}/automations/${auto._id}`, { isActive: nextState });
      const updated = res.data?.data?.automation || res.data?.automation;

      setAutomations(prev => prev.map(a => a._id === auto._id ? (updated || { ...a, isActive: nextState }) : a));
    } catch (err) {
      console.error('Failed to toggle automation:', err);
      setError('Failed to update automation state');
    }
  };

  const handleDelete = async (automationId) => {
    try {
      await apiClient.delete(`/boards/${boardId}/automations/${automationId}`);
      setAutomations(prev => prev.filter(a => a._id !== automationId));
    } catch (err) {
      console.error('Delete automation error:', err);
      setError(err.response?.data?.error?.message || 'Failed to delete automation rule');
    }
  };

  const getTargetColumnName = (condition) => {
    if (!condition || !condition.columnId) return 'Any Column';
    if (typeof condition.columnId === 'object') {
      return condition.columnId.name || condition.columnId.title || 'Column';
    }
    const foundCol = columns.find(c => (c.id || c._id) === condition.columnId);
    return foundCol ? foundCol.title : 'Column';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Board Automations"
      size="md"
    >
      <div className="space-y-5 text-slate-800">
        {/* Messages */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Rule Builder Form */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-500" />
              Create Automation Rule
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
              No-Code Triggers
            </span>
          </div>

          <div className="grid gap-3 text-xs">
            {/* Step 1: Trigger */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">When (Event Trigger)</label>
              <Select 
                value={newRule.trigger}
                onChange={(val) => setNewRule({ ...newRule, trigger: val })}
                options={[
                  { label: '⚡ Task is moved to column', value: 'task_moved' },
                  { label: '✨ Task is created in column', value: 'task_created' }
                ]}
              />
            </div>

            {/* Step 2: Target Column */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Target Column</label>
              <Select 
                value={newRule.columnId}
                onChange={(val) => setNewRule({ ...newRule, columnId: val })}
                options={columns.map(c => ({ label: `📁 ${c.title}`, value: c.id || c._id }))}
              />
            </div>

            {/* Step 3: Action */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Then (Automated Action)</label>
              <Select 
                value={newRule.action}
                onChange={(val) => setNewRule({ ...newRule, action: val })}
                options={[
                  { label: '✅ Mark all subtasks as complete', value: 'mark_complete' },
                  { label: '👤 Unassign task assignee', value: 'unassign' },
                  { label: '🏷️ Set Task Priority', value: 'set_priority' }
                ]}
              />
            </div>

            {/* Priority Payload options if action is set_priority */}
            {newRule.action === 'set_priority' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Priority Value</label>
                <Select 
                  value={newRule.actionPayload?.priority || 'medium'}
                  onChange={(val) => setNewRule({ ...newRule, actionPayload: { priority: val } })}
                  options={[
                    { label: 'Low Priority', value: 'low' },
                    { label: 'Medium Priority', value: 'medium' },
                    { label: 'High Priority', value: 'high' }
                  ]}
                />
              </div>
            )}

            <div className="pt-2">
              <Button 
                variant="primary" 
                className="w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 font-semibold shadow-xs transition-all" 
                onClick={handleCreate} 
                isLoading={isCreating}
              >
                Add Automation Rule
              </Button>
            </div>
          </div>
        </div>

        {/* Active Rules List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Active Rules ({automations.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Loading rules...
            </div>
          ) : automations.length > 0 ? (
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {automations.map(auto => {
                const targetColName = getTargetColumnName(auto.condition);
                const isActive = auto.isActive !== false;

                return (
                  <div 
                    key={auto._id} 
                    className={`p-3.5 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-white border-slate-200 shadow-xs'
                        : 'bg-slate-50 border-slate-200/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <button
                          onClick={() => handleToggleActive(auto)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                          title={isActive ? 'Disable rule' : 'Enable rule'}
                        >
                          {isActive ? (
                            <ToggleRight className="w-6 h-6 text-indigo-600" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-slate-400" />
                          )}
                        </button>

                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-800">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                              {auto.trigger === 'task_moved' ? 'Task Moved' : 'Task Created'}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px]">
                              "{targetColName}"
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] capitalize">
                              {auto.action === 'mark_complete'
                                ? 'Mark Complete'
                                : auto.action === 'unassign'
                                ? 'Unassign'
                                : `Set ${auto.actionPayload?.priority || 'medium'} priority`}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Created by {auto.createdBy?.name || 'Manager'}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(auto._id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-slate-300" />
              No automations configured for this board yet.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AutomationsModal;
