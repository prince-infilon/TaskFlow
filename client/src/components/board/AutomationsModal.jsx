import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { Trash2, Zap } from 'lucide-react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const AutomationsModal = ({ isOpen, onClose, boardId, columns }) => {
  const { user } = useAuth();
  const [automations, setAutomations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const [newRule, setNewRule] = useState({
    trigger: 'task_moved',
    columnId: columns.length > 0 ? columns[0].id : '',
    action: 'mark_complete',
    actionPayload: {}
  });

  useEffect(() => {
    if (isOpen && boardId) {
      fetchAutomations();
      if (columns.length > 0 && !newRule.columnId) {
        setNewRule(prev => ({ ...prev, columnId: columns[0].id }));
      }
    }
  }, [isOpen, boardId, columns]);

  const fetchAutomations = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get(`/boards/${boardId}/automations`);
      setAutomations(res.data.automations || res.automations || []);
    } catch (err) {
      setError('Failed to load automations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newRule.trigger || !newRule.action) return;
    setIsCreating(true);
    setError('');

    try {
      const payload = {
        trigger: newRule.trigger,
        action: newRule.action,
      };

      if (newRule.trigger === 'task_moved') {
        payload.condition = { columnId: newRule.columnId };
      }

      if (newRule.action === 'set_priority') {
        payload.actionPayload = { priority: newRule.actionPayload.priority || 'medium' };
      }

      const res = await apiClient.post(`/boards/${boardId}/automations`, payload);
      setAutomations(prev => [...prev, res.data.automation || res.automation]);
      
      // Reset
      setNewRule({
        trigger: 'task_moved',
        columnId: columns.length > 0 ? columns[0].id : '',
        action: 'mark_complete',
        actionPayload: {}
      });
    } catch (err) {
      setError(err.message || 'Failed to create automation');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (automationId) => {
    try {
      await apiClient.delete(`/boards/${boardId}/automations/${automationId}`);
      setAutomations(prev => prev.filter(a => a._id !== automationId));
    } catch (err) {
      alert('Failed to delete automation');
    }
  };

  const formatRule = (auto) => {
    let text = '';
    if (auto.trigger === 'task_moved') {
      text += `When a task is moved to "${auto.condition?.columnId?.name || 'a specific column'}", `;
    } else if (auto.trigger === 'task_created') {
      text += `When a task is created in "${auto.condition?.columnId?.name || 'a specific column'}", `;
    }

    if (auto.action === 'mark_complete') {
      text += 'mark all its subtasks as complete.';
    } else if (auto.action === 'unassign') {
      text += 'unassign everyone.';
    } else if (auto.action === 'set_priority') {
      text += `set its priority to ${auto.actionPayload?.priority || 'medium'}.`;
    }

    return text;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Board Automations"
      size="md"
    >
      <div className="space-y-6">
        {error && <div className="text-small text-danger-500 bg-danger-50 p-2 rounded">{error}</div>}

        <div className="bg-surface-muted p-4 rounded-lg border border-border space-y-4">
          <h3 className="text-body-medium font-bold text-primary flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent-500" />
            Create New Rule
          </h3>
          
          <div className="grid gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-small font-medium text-secondary">When...</label>
              <Select 
                value={newRule.trigger}
                onChange={(val) => setNewRule({ ...newRule, trigger: val })}
                options={[
                  { label: 'A task is moved to column', value: 'task_moved' },
                  { label: 'A task is created in column', value: 'task_created' }
                ]}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-small font-medium text-secondary">Column</label>
              <Select 
                value={newRule.columnId}
                onChange={(val) => setNewRule({ ...newRule, columnId: val })}
                options={columns.map(c => ({ label: c.title, value: c.id }))}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-small font-medium text-secondary">Then...</label>
              <Select 
                value={newRule.action}
                onChange={(val) => setNewRule({ ...newRule, action: val })}
                options={[
                  { label: 'Mark all subtasks complete', value: 'mark_complete' },
                  { label: 'Unassign task', value: 'unassign' },
                  { label: 'Set Priority', value: 'set_priority' }
                ]}
              />
            </div>

            {newRule.action === 'set_priority' && (
              <div className="flex flex-col gap-1">
                <label className="text-small font-medium text-secondary">To Priority</label>
                <Select 
                  value={newRule.actionPayload.priority || 'medium'}
                  onChange={(val) => setNewRule({ ...newRule, actionPayload: { priority: val } })}
                  options={[
                    { label: 'Low', value: 'low' },
                    { label: 'Medium', value: 'medium' },
                    { label: 'High', value: 'high' }
                  ]}
                />
              </div>
            )}

            <div className="pt-2">
              <Button variant="primary" className="w-full" onClick={handleCreate} isLoading={isCreating}>
                Add Rule
              </Button>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-body-medium font-bold text-primary mb-3">Active Rules</h3>
          {isLoading ? (
            <p className="text-small text-tertiary">Loading rules...</p>
          ) : automations.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 hide-scrollbar">
              {automations.map(auto => (
                <div key={auto._id} className="flex items-center justify-between p-3 bg-surface border border-border rounded-md group">
                  <div className="flex-1">
                    <p className="text-small text-primary">{formatRule(auto)}</p>
                    <p className="text-[10px] text-tertiary mt-1">Created by {auto.createdBy?.name || 'Unknown'}</p>
                  </div>
                  <button 
                    onClick={() => handleDelete(auto._id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-tertiary hover:text-danger-500 transition-all shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-6 border-2 border-dashed border-border rounded-lg text-tertiary text-small">
              No automations configured for this board yet.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AutomationsModal;
