import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { socket, connectSocket, disconnectSocket } from '../api/socket';
import { Search, Filter, Settings, Plus, Calendar, Paperclip, MessageSquare, Trash2, Download } from 'lucide-react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  defaultDropAnimationSideEffects,
  useDroppable
} from '@dnd-kit/core';
import { 
  SortableContext, 
  arrayMove, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import IconButton from '../components/ui/IconButton';
import Avatar, { AvatarGroup } from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Drawer from '../components/ui/Drawer';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';

const KanbanColumn = ({ title, count, statusColor, tasks, columnId, onTaskClick }) => {
  const { setNodeRef } = useDroppable({
    id: columnId,
    data: { type: 'Column', columnId }
  });

  return (
    <div className="flex flex-col bg-surface-muted rounded-md w-[320px] shrink-0 p-4 h-full max-h-full overflow-hidden">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          {/* Status Dot */}
          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
          <h3 className="text-body-medium text-primary font-medium">{title}</h3>
          <Badge variant="neutral">{count}</Badge>
        </div>
        <IconButton variant="ghost" className="w-6 h-6" aria-label={`Add task to ${title}`}>
          <Plus className="w-4 h-4" />
        </IconButton>
      </div>
      
      {/* Scrollable area for tasks */}
      <div ref={setNodeRef} className="flex-1 overflow-y-auto min-h-[100px] hide-scrollbar rounded-sm flex flex-col gap-2">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks && tasks.length > 0 ? (
            tasks.map(task => (
              <SortableTaskCard 
                key={task.id} 
                task={task} 
                isDone={columnId === 'done'} 
                onClick={() => onTaskClick(task)}
              />
            ))
          ) : (
            <div className="flex items-center justify-center h-full text-small text-tertiary border-2 border-dashed border-border rounded-md p-4 text-center">
              No tasks match your filters
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
};

const SortableTaskCard = ({ task, isDone, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'Task', task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} isDone={isDone} onClick={onClick} />
    </div>
  );
};

const TaskCard = ({ task, isDone, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="bg-surface border border-border rounded-md p-3 hover:border-border-strong hover:shadow-sm transition-shadow cursor-grab active:cursor-grabbing select-none"
    >
      <div className="flex flex-col gap-2">
        {/* Priority Badge */}
        <div className={`self-start ${isDone ? 'opacity-70' : ''}`}>
          <Badge variant={task.priority} className="capitalize px-1.5 py-0.5 text-[10px]">
            {task.priority}
          </Badge>
        </div>

        {/* Title */}
        <h4 className="text-body-medium text-primary line-clamp-2 leading-snug">
          {task.title}
        </h4>

        {/* Description Snippet */}
        {task.description && (
          <p className="text-small text-secondary line-clamp-1">
            {task.description}
          </p>
        )}

        {/* Meta Footer */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-3 text-small text-tertiary">
            {task.dueDate && (
              <div className={`flex items-center gap-1 ${task.isOverdue && !isDone ? 'text-danger-500 font-medium' : ''}`}>
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-[11px]">{task.dueDate}</span>
              </div>
            )}
            {task.attachments > 0 && (
              <div className="flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5" />
                <span className="text-[11px]">{task.attachments}</span>
              </div>
            )}
            {task.comments > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="text-[11px]">{task.comments}</span>
              </div>
            )}
          </div>
          
          <div className="shrink-0 ml-2">
            {task.assignee ? (
              <Avatar name={task.assignee} size="sm" />
            ) : (
              <div className="w-[24px] h-[24px] rounded-full border border-dashed border-border flex items-center justify-center bg-canvas">
                <span className="text-[10px] text-tertiary">?</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Board = () => {
  const { boardId } = useParams();
  const { token } = useAuth();
  
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [isLoadingBoard, setIsLoadingBoard] = useState(true);
  const [boardError, setBoardError] = useState('');

  const [columns, setColumns] = useState([]);
  const [activeTask, setActiveTask] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    priorities: [],
    assignees: [],
    isOverdue: false
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const [taskPage, setTaskPage] = useState(1);
  const [hasMoreTasks, setHasMoreTasks] = useState(false);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [isBoardLoaded, setIsBoardLoaded] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socketSignal, setSocketSignal] = useState({ type: null, timestamp: 0 });
  
  // Drawer State
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [taskComments, setTaskComments] = useState([]);
  const [taskAttachments, setTaskAttachments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Create Task Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [taskFormError, setTaskFormError] = useState('');
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    priority: 'low',
    assignee: '',
    dueDate: '',
    status: ''
  });

  // Edit Task Modal State
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [editTaskForm, setEditTaskForm] = useState(null);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskFormError, setEditTaskFormError] = useState('');

  // Edit Board Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBoardForm, setEditBoardForm] = useState({ name: '', description: '' });
  const [isSavingBoard, setIsSavingBoard] = useState(false);

  // Members Modal State
  const [boardMembers, setBoardMembers] = useState([]);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [membersView, setMembersView] = useState('list'); // 'list' | 'invite'
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' });
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const fetchBoardData = async () => {
    try {
      const res = await apiClient.get(`/boards/${boardId}`);
      setBoard(res.data.board);
      setEditBoardForm({
        name: res.data.board.name,
        description: res.data.board.description || ''
      });
      localStorage.setItem('lastOpenedBoardId', boardId);
      
      const membersRes = await apiClient.get(`/boards/${boardId}/members`);
      const formattedMembers = membersRes.data.members.map(m => ({
        id: m.user._id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        isOnline: true
      }));
      setBoardMembers(formattedMembers);

      const columnsRes = await apiClient.get(`/boards/${boardId}/columns`);
      const cols = columnsRes.data.columns;

      const structuredColumns = cols.map(col => {
        let statusColor = 'bg-tertiary';
        if (col.name === 'To Do') statusColor = 'bg-secondary';
        else if (col.name === 'In Progress') statusColor = 'bg-accent-500';
        else if (col.name === 'Done') statusColor = 'bg-success-500';

        return {
          id: col._id,
          title: col.name,
          statusColor,
          tasks: [] // tasks will be fetched separately
        };
      });

      if (cols.length > 0 && !newTaskForm.status) {
        setNewTaskForm(prev => ({ ...prev, status: cols[0]._id }));
      }

      setColumns(structuredColumns);
      setIsBoardLoaded(true);
    } catch (err) {
      setBoardError(err.message || 'Failed to load board');
    } finally {
      setIsLoadingBoard(false);
    }
  };

  const fetchTasks = async (isLoadMore = false) => {
    if (!isBoardLoaded) return;
    
    try {
      setIsTasksLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.append('page', isLoadMore ? taskPage + 1 : 1);
      queryParams.append('limit', 50);

      if (searchQuery) queryParams.append('search', searchQuery);
      
      if (activeFilters.priorities.length > 0) {
        queryParams.append('priority', activeFilters.priorities.join(','));
      }
      
      if (activeFilters.assignees.length > 0) {
        const assigneeIds = activeFilters.assignees.map(a => {
          if (a === 'Unassigned') return 'unassigned';
          const member = boardMembers.find(m => m.name === a);
          return member ? member.id : null;
        }).filter(Boolean);
        
        if (assigneeIds.length > 0) {
          queryParams.append('assignee', assigneeIds.join(','));
        }
      }

      if (activeFilters.isOverdue) {
        queryParams.append('dueDate', 'overdue');
      }

      const res = await apiClient.get(`/boards/${boardId}/tasks?${queryParams.toString()}`);
      const newTasks = res.data.tasks;
      const pagination = res.data.pagination;

      setColumns(prevCols => {
        const allTasks = isLoadMore ? [
          ...prevCols.flatMap(c => c.tasks),
          ...newTasks.filter(nt => !prevCols.flatMap(c => c.tasks).find(et => et.id === nt._id))
        ] : newTasks;

        return prevCols.map(col => {
          const colTasks = allTasks.filter(t => (t.column || t.columnId) === col.id).map(t => ({
            id: t._id || t.id,
            title: t.title,
            description: t.description,
            priority: t.priority,
            dueDate: t.dueDate,
            attachments: t.attachments || 0,
            comments: t.comments || 0,
            assignee: t.assignee?.name || t.assignee || null,
            assigneeId: t.assignee?._id || t.assigneeId || null,
            columnId: t.column || t.columnId,
            isOverdue: false
          }));
          
          return { ...col, tasks: colTasks };
        });
      });

      if (isLoadMore) {
        setTaskPage(pagination.page);
      } else {
        setTaskPage(1);
      }
      setHasMoreTasks(pagination.page < pagination.totalPages);
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally {
      setIsTasksLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardData();
  }, [boardId]);

  useEffect(() => {
    if (token && boardId) {
      connectSocket(token);
      socket.emit('join_board', boardId);

      const triggerTaskUpdate = () => setSocketSignal({ type: 'task', timestamp: Date.now() });
      const triggerBoardUpdate = () => setSocketSignal({ type: 'board', timestamp: Date.now() });
      const triggerBothUpdate = () => setSocketSignal({ type: 'both', timestamp: Date.now() });

      socket.on('task_created', triggerTaskUpdate);
      socket.on('task_updated', triggerTaskUpdate);
      socket.on('task_moved', triggerTaskUpdate);
      socket.on('task_deleted', triggerTaskUpdate);
      
      socket.on('member_added', triggerBothUpdate);
      socket.on('member_removed', triggerBothUpdate);
      socket.on('member_role_changed', triggerBoardUpdate);

      socket.on('comment_created', triggerTaskUpdate);
      socket.on('comment_deleted', triggerTaskUpdate);
      socket.on('attachment_uploaded', triggerTaskUpdate);
      socket.on('attachment_deleted', triggerTaskUpdate);
      
      // Activity is logged silently but we can update if needed, though tasks update is usually enough
      
      socket.on('presence_update', (users) => {
        setOnlineUsers(users);
      });

      return () => {
        socket.emit('leave_board', boardId);
        socket.off('task_created', triggerTaskUpdate);
        socket.off('task_updated', triggerTaskUpdate);
        socket.off('task_moved', triggerTaskUpdate);
        socket.off('task_deleted', triggerTaskUpdate);
        socket.off('member_added', triggerBothUpdate);
        socket.off('member_removed', triggerBothUpdate);
        socket.off('member_role_changed', triggerBoardUpdate);
        socket.off('comment_created', triggerTaskUpdate);
        socket.off('comment_deleted', triggerTaskUpdate);
        socket.off('attachment_uploaded', triggerTaskUpdate);
        socket.off('attachment_deleted', triggerTaskUpdate);
        socket.off('presence_update');
        disconnectSocket();
      };
    }
  }, [token, boardId]);

  useEffect(() => {
    if (socketSignal.timestamp > 0 && isBoardLoaded) {
      if (socketSignal.type === 'task' || socketSignal.type === 'both') {
        fetchTasks(false);
      }
      if (socketSignal.type === 'board' || socketSignal.type === 'both') {
        fetchBoardData();
      }
    }
  }, [socketSignal]);

  useEffect(() => {
    // Adding a short debounce for search to prevent rapid firing
    const timeoutId = setTimeout(() => {
      fetchTasks(false);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, activeFilters, isBoardLoaded]);

  const hasActiveFilters = activeFilters.priorities.length > 0 || activeFilters.assignees.length > 0 || activeFilters.isOverdue;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragStart = (event) => {
    const { active } = event;
    if (active.data.current?.type === 'Task') {
      setActiveTask(active.data.current.task);
    }
  };

  const onDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;
    
    const activeId = active.id;
    const overId = over.id;
    
    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveTask) return;

    if (isOverTask) {
      setColumns(prev => {
        const activeColumnIndex = prev.findIndex(col => col.tasks.some(t => t.id === activeId));
        const overColumnIndex = prev.findIndex(col => col.tasks.some(t => t.id === overId));

        if (activeColumnIndex === -1 || overColumnIndex === -1) return prev;

        const newColumns = JSON.parse(JSON.stringify(prev));
        const activeColumn = newColumns[activeColumnIndex];
        const overColumn = newColumns[overColumnIndex];
        
        const activeTaskIndex = activeColumn.tasks.findIndex(t => t.id === activeId);
        const overTaskIndex = overColumn.tasks.findIndex(t => t.id === overId);

        if (activeColumnIndex !== overColumnIndex) {
          const [movedTask] = activeColumn.tasks.splice(activeTaskIndex, 1);
          // Insert at the exact spot over the hovered task
          const isBelowOverItem = over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height;
          const modifier = isBelowOverItem ? 1 : 0;
          const newIndex = overTaskIndex >= 0 ? overTaskIndex + modifier : overColumn.tasks.length + 1;
          
          overColumn.tasks.splice(newIndex, 0, movedTask);
        } else {
          activeColumn.tasks = arrayMove(activeColumn.tasks, activeTaskIndex, overTaskIndex);
        }
        return newColumns;
      });
    }

    if (isOverColumn) {
      setColumns(prev => {
        const activeColumnIndex = prev.findIndex(col => col.tasks.some(t => t.id === activeId));
        const overColumnIndex = prev.findIndex(col => col.id === overId);

        if (activeColumnIndex === -1 || overColumnIndex === -1 || activeColumnIndex === overColumnIndex) return prev;

        const newColumns = JSON.parse(JSON.stringify(prev));
        const activeColumn = newColumns[activeColumnIndex];
        const overColumn = newColumns[overColumnIndex];

        const activeTaskIndex = activeColumn.tasks.findIndex(t => t.id === activeId);
        const [movedTask] = activeColumn.tasks.splice(activeTaskIndex, 1);
        
        overColumn.tasks.push(movedTask);
        return newColumns;
      });
    }
  };

  const onDragEnd = async (event) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    
    // UI state was already updated optimistically in onDragOver.
    // We just need to persist the new column and position.
    const targetCol = columns.find(col => col.tasks.some(t => t.id === active.id));
    if (!targetCol) return;
    
    const targetTaskIndex = targetCol.tasks.findIndex(t => t.id === active.id);
    
    try {
      await apiClient.patch(`/boards/${boardId}/tasks/${active.id}/move`, {
        column: targetCol.id,
        position: targetTaskIndex
      });
    } catch (err) {
      console.error('Failed to move task:', err);
      // Revert state by fetching from server
      fetchTasks(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskForm.title.trim()) {
      setTaskFormError('Task title is required.');
      return;
    }
    if (!newTaskForm.status) {
      setTaskFormError('Status (column) is required.');
      return;
    }
    
    setTaskFormError('');
    setIsCreating(true);

    try {
      await apiClient.post(`/boards/${boardId}/tasks`, {
        column: newTaskForm.status,
        title: newTaskForm.title.trim(),
        description: newTaskForm.description.trim(),
        priority: newTaskForm.priority,
        assignee: newTaskForm.assignee === 'Unassigned' || !newTaskForm.assignee ? null : newTaskForm.assignee,
        dueDate: newTaskForm.dueDate
      });

      // Refresh to get real IDs and populate assignees
      await fetchTasks(false);

      setNewTaskForm({
        title: '',
        description: '',
        priority: 'low',
        assignee: '',
        dueDate: '',
        status: columns.length > 0 ? columns[0].id : ''
      });
      setIsModalOpen(false);
    } catch (err) {
      setTaskFormError(err.message || 'Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateTask = async () => {
    if (!editTaskForm.title.trim()) {
      setEditTaskFormError('Task title is required.');
      return;
    }
    setEditTaskFormError('');
    setIsEditingTask(true);
    try {
      await apiClient.patch(`/boards/${boardId}/tasks/${selectedTask.id}`, editTaskForm);
      await fetchTasks(false);
      setIsEditTaskModalOpen(false);
      setIsDrawerOpen(false);
    } catch (err) {
      setEditTaskFormError(err.message || 'Failed to update task');
    } finally {
      setIsEditingTask(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await apiClient.delete(`/boards/${boardId}/tasks/${selectedTask.id}`);
      await fetchTasks(false);
      setIsDrawerOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to delete task');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTask) return;
    setIsCommenting(true);
    try {
      const res = await apiClient.post(`/boards/${boardId}/tasks/${selectedTask.id}/comments`, {
        content: newComment.trim()
      });
      setTaskComments(prev => [...prev, res.data.comment]);
      setNewComment('');
      await fetchTasks(false); // update stats if needed
    } catch (err) {
      alert(err.message || 'Failed to add comment');
    } finally {
      setIsCommenting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await apiClient.delete(`/boards/${boardId}/tasks/${selectedTask.id}/comments/${commentId}`);
      setTaskComments(prev => prev.filter(c => c._id !== commentId));
      await fetchTasks(false);
    } catch (err) {
      alert(err.message || 'Failed to delete comment');
    }
  };

  const handleUploadAttachment = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedTask) return;
    
    setUploadError('');
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post(`/boards/${boardId}/tasks/${selectedTask.id}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setTaskAttachments(prev => [res.data.attachment, ...prev]);
      await fetchTasks(false);
    } catch (err) {
      setUploadError(err.message || 'Failed to upload attachment');
    } finally {
      setIsUploading(false);
      // reset file input
      e.target.value = null;
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm('Delete this attachment?')) return;
    try {
      await apiClient.delete(`/boards/${boardId}/tasks/${selectedTask.id}/attachments/${attachmentId}`);
      setTaskAttachments(prev => prev.filter(a => a._id !== attachmentId));
      await fetchTasks(false);
    } catch (err) {
      alert(err.message || 'Failed to delete attachment');
    }
  };

  const handleDownloadAttachment = async (attachment) => {
    try {
      const blob = await apiClient.get(`/boards/${boardId}/tasks/${selectedTask.id}/attachments/${attachment._id}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.originalFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download attachment');
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.email.trim()) return;
    setIsInviting(true);
    setInviteError('');
    try {
      await apiClient.post(`/boards/${boardId}/members`, {
        email: inviteForm.email,
        role: inviteForm.role
      });
      
      // Refresh members after invite
      const membersRes = await apiClient.get(`/boards/${boardId}/members`);
      const formattedMembers = membersRes.data.members.map(m => ({
        id: m.user._id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        isOnline: true
      }));
      setBoardMembers(formattedMembers);
      
      setMembersView('list');
      setInviteForm({ email: '', role: 'member' });
    } catch (err) {
      setInviteError(err.message || 'Failed to invite member');
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateMemberRole = async (userId, newRole) => {
    try {
      await apiClient.patch(`/boards/${boardId}/members/${userId}`, { role: newRole });
      setBoardMembers(prev => prev.map(m => m.id === userId ? { ...m, role: newRole } : m));
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      await apiClient.delete(`/boards/${boardId}/members/${userId}`);
      setBoardMembers(prev => prev.filter(m => m.id !== userId));
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleEditBoard = async () => {
    setIsSavingBoard(true);
    setBoardError('');
    try {
      const res = await apiClient.patch(`/boards/${boardId}`, editBoardForm);
      setBoard(res.data.board);
      setIsEditModalOpen(false);
    } catch (err) {
      setBoardError(err.message || 'Failed to update board');
    } finally {
      setIsSavingBoard(false);
    }
  };

  const handleDeleteBoard = async () => {
    if (!window.confirm('Are you sure you want to delete this board? This cannot be undone.')) return;
    try {
      await apiClient.delete(`/boards/${boardId}`);
      navigate('/app/boards');
    } catch (err) {
      console.error('Failed to delete board:', err);
      setBoardError(err.message || 'Failed to delete board');
    }
  };

  if (isLoadingBoard) {
    return <div className="p-8 text-secondary">Loading board...</div>;
  }

  if (boardError && !board) {
    return <div className="p-8 text-danger-500">{boardError}</div>;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-300">
      
      {/* Board Header */}
      <div className="relative z-20 shrink-0 mb-6 space-y-4">
        <div>
          <div className="text-small text-secondary mb-1">
            <Link to="/app/boards" className="hover:text-primary transition-colors focus:outline-none focus:underline">
              Boards
            </Link> 
            {' / '}{board.name}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-h1 text-primary">{board.name}</h1>
              <p className="text-small text-secondary max-w-2xl mt-1">
                {board.description}
              </p>
            </div>
            
            {/* Toolbar Row */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
                <Input 
                  placeholder="Search tasks..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-[32px] text-small w-full sm:w-[200px]" 
                />
              </div>
              
              <div className="relative hidden sm:inline-flex shrink-0">
                <Button 
                  variant={hasActiveFilters ? "primary" : "secondary"} 
                  size="sm" 
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="hidden sm:inline-flex shrink-0"
                >
                  <Filter className="w-4 h-4 mr-1.5" />
                  Filter {hasActiveFilters && `(${activeFilters.priorities.length + activeFilters.assignees.length + (activeFilters.isOverdue ? 1 : 0)})`}
                </Button>

                {isFilterOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-surface border border-border shadow-lg rounded-md p-4 z-10 flex flex-col gap-4 max-h-[400px] overflow-y-auto">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-body-medium font-medium text-primary">Filters</h4>
                      {hasActiveFilters && (
                        <button 
                          onClick={() => setActiveFilters({ priorities: [], assignees: [], isOverdue: false })}
                          className="text-small text-accent-600 hover:text-accent-700 font-medium"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    
                    {/* Priority Filter */}
                    <div className="space-y-2">
                      <h5 className="text-small text-secondary font-medium">Priority</h5>
                      <div className="flex flex-wrap gap-2">
                        {['low', 'medium', 'high'].map(p => {
                          const isActive = activeFilters.priorities.includes(p);
                          return (
                            <Badge 
                              key={p} 
                              variant={isActive ? p : 'neutral'}
                              className={`cursor-pointer capitalize select-none transition-colors ${!isActive ? 'opacity-70 hover:opacity-100' : ''}`}
                              onClick={() => {
                                setActiveFilters(prev => ({
                                  ...prev,
                                  priorities: isActive 
                                    ? prev.priorities.filter(x => x !== p)
                                    : [...prev.priorities, p]
                                }))
                              }}
                            >
                              {p}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>

                    {/* Assignee Filter */}
                    <div className="space-y-2">
                      <h5 className="text-small text-secondary font-medium">Assignee</h5>
                      <div className="flex flex-wrap gap-2">
                        {[...boardMembers.map(m => m.name), 'Unassigned'].map(assignee => {
                          const isActive = activeFilters.assignees.includes(assignee);
                          return (
                            <div 
                              key={assignee}
                              onClick={() => {
                                setActiveFilters(prev => ({
                                  ...prev,
                                  assignees: isActive
                                    ? prev.assignees.filter(x => x !== assignee)
                                    : [...prev.assignees, assignee]
                                }))
                              }}
                              className={`text-caption px-2 py-1 rounded-sm cursor-pointer select-none transition-colors border ${
                                isActive 
                                  ? 'bg-accent-50 border-accent-200 text-accent-700' 
                                  : 'bg-surface-muted border-transparent text-secondary hover:bg-inset'
                              }`}
                            >
                              {assignee}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Status/Overdue Filter */}
                    <div className="space-y-2">
                      <h5 className="text-small text-secondary font-medium">Status</h5>
                      <label className="flex items-center gap-2 text-small cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          className="rounded border-border text-accent-600 focus:ring-accent-500 w-4 h-4 cursor-pointer"
                          checked={activeFilters.isOverdue}
                          onChange={(e) => setActiveFilters(prev => ({ ...prev, isOverdue: e.target.checked }))}
                        />
                        <span className="text-primary">Overdue tasks only</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="hidden sm:flex border-l border-border h-6 mx-1" />
              
              <div 
                className="hidden sm:flex shrink-0 cursor-pointer p-1 -m-1 rounded hover:bg-surface-muted transition-colors relative"
                onClick={() => {
                  setMembersView('list');
                  setIsMembersModalOpen(true);
                }}
              >
                <div className="absolute -top-1 -right-1 z-10 flex items-center justify-center bg-success-500 rounded-full px-1 border border-canvas text-[9px] font-bold text-white shadow-sm">
                  {onlineUsers.length} <span className="ml-0.5 sr-only">online</span>
                </div>
                <AvatarGroup max={3}>
                  {onlineUsers.length > 0 ? onlineUsers.map((user) => (
                    <Avatar key={`online-${user.id}`} name={user.name} size="sm" />
                  )) : boardMembers.map((member) => (
                    <Avatar key={member.id} name={member.name} size="sm" />
                  ))}
                </AvatarGroup>
              </div>
              
              <div className="hidden sm:flex border-l border-border h-6 mx-1" />
              
              <Button variant="primary" size="sm" className="shrink-0" onClick={() => setIsModalOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Add Task
              </Button>
              
              <IconButton 
                variant="ghost" 
                aria-label="Board settings" 
                className="shrink-0 h-[32px] w-[32px]"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Settings className="w-4 h-4" />
              </IconButton>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board Area */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex-1 overflow-x-auto overflow-y-hidden hide-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 pb-4">
          <div className="flex gap-4 h-full items-start min-w-max">
            {columns.map((col) => (
              <KanbanColumn 
                key={col.id}
                columnId={col.id}
                title={col.title}
                count={col.tasks.length}
                statusColor={col.statusColor}
                tasks={col.tasks}
                onTaskClick={async (task) => {
                  setSelectedTask(task);
                  setTaskComments([]);
                  setTaskAttachments([]);
                  setUploadError('');
                  setIsDrawerOpen(true);
                  
                  try {
                    const [cRes, aRes] = await Promise.all([
                      apiClient.get(`/boards/${boardId}/tasks/${task.id}/comments`),
                      apiClient.get(`/boards/${boardId}/tasks/${task.id}/attachments`)
                    ]);
                    setTaskComments(cRes.data.comments);
                    setTaskAttachments(aRes.data.attachments);
                  } catch (err) {
                    console.error('Failed to load comments or attachments', err);
                  }
                }}
              />
            ))}
          </div>
          
          {hasMoreTasks && (
            <div className="mt-4 flex justify-center w-full min-w-max pb-8">
              <Button 
                variant="secondary" 
                onClick={() => fetchTasks(true)}
                isLoading={isTasksLoading}
              >
                Load more tasks
              </Button>
            </div>
          )}
        </div>

        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
          {activeTask ? (
            <div className="opacity-90 scale-105 shadow-md">
              <TaskCard task={activeTask} isDone={false} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Detail Drawer */}
      <Drawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)}
        title={selectedTask ? selectedTask.title : ''}
      >
        {selectedTask && (
          <div className="space-y-6">
            {/* Meta Row */}
            <div className="flex flex-wrap gap-4 items-center">
              <Badge variant={selectedTask.priority} className="capitalize">
                {selectedTask.priority} Priority
              </Badge>
              {selectedTask.dueDate && (
                <div className={`flex items-center gap-1.5 text-small ${selectedTask.isOverdue ? 'text-danger-500 font-medium' : 'text-secondary'}`}>
                  <Calendar className="w-4 h-4" />
                  <span>Due {selectedTask.dueDate}</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-body-medium font-medium text-primary">Description</h3>
              <p className="text-body text-secondary">
                {selectedTask.description || 'No description provided.'}
              </p>
            </div>

            {/* Assignee */}
            <div className="space-y-2">
              <h3 className="text-body-medium font-medium text-primary">Assignee</h3>
              {selectedTask.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar name={selectedTask.assignee} size="md" />
                  <span className="text-body text-primary">{selectedTask.assignee}</span>
                </div>
              ) : (
                <div className="text-body text-tertiary">Unassigned</div>
              )}
            </div>

            {/* Activity Stats */}
            <div className="space-y-2 pt-4 border-t border-border">
              <div className="flex items-center gap-4 text-small text-secondary">
                <div className="flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4" />
                  <span>{taskAttachments.length} attachments</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" />
                  <span>{taskComments.length} comments</span>
                </div>
              </div>
            </div>

            {/* Attachments Section */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-body-medium font-medium text-primary">Attachments</h3>
                <div>
                  <input 
                    type="file" 
                    id="attachment-upload" 
                    className="hidden" 
                    onChange={handleUploadAttachment}
                  />
                  <label htmlFor="attachment-upload" className="cursor-pointer text-small text-accent-600 hover:text-accent-700 font-medium select-none">
                    {isUploading ? 'Uploading...' : '+ Add File'}
                  </label>
                </div>
              </div>
              {uploadError && <div className="text-danger-500 text-small">{uploadError}</div>}
              
              {taskAttachments.length > 0 ? (
                <div className="space-y-2">
                  {taskAttachments.map(att => (
                    <div key={att._id} className="flex items-center justify-between bg-surface border border-border p-2 rounded-md">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Paperclip className="w-4 h-4 text-tertiary shrink-0" />
                        <div className="truncate">
                          <p className="text-small font-medium text-primary truncate" title={att.originalFilename}>
                            {att.originalFilename}
                          </p>
                          <p className="text-[10px] text-tertiary">
                            {(att.fileSize / 1024).toFixed(1)} KB • {att.uploadedBy?.name || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <IconButton variant="ghost" className="w-7 h-7 text-secondary" onClick={() => handleDownloadAttachment(att)}>
                          <Download className="w-4 h-4" />
                        </IconButton>
                        <IconButton variant="ghost" className="w-7 h-7 text-danger-500" onClick={() => handleDeleteAttachment(att._id)}>
                          <Trash2 className="w-4 h-4" />
                        </IconButton>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-small text-tertiary">No attachments yet.</p>
              )}
            </div>

            {/* Comments Section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-body-medium font-medium text-primary">Comments</h3>
              
              {/* Comment Input */}
              <div className="flex gap-2">
                <Avatar name="User" size="sm" className="shrink-0" />
                <div className="flex-1 space-y-2">
                  <textarea
                    className="w-full bg-canvas border border-border rounded-md px-3 py-2 text-small text-primary focus:outline-none focus:border-accent-500 transition-colors resize-y min-h-[60px]"
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    disabled={isCommenting}
                  />
                  <div className="flex justify-end">
                    <Button variant="primary" size="sm" onClick={handleAddComment} disabled={!newComment.trim()} isLoading={isCommenting}>
                      Comment
                    </Button>
                  </div>
                </div>
              </div>

              {/* Comment List */}
              <div className="space-y-4">
                {taskComments.length > 0 ? (
                  taskComments.map(comment => (
                    <div key={comment._id} className="flex gap-3">
                      <Avatar name={comment.author?.name || 'Unknown'} size="sm" className="shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-small font-medium text-primary">{comment.author?.name || 'Unknown'}</span>
                            <span className="text-[11px] text-tertiary">{new Date(comment.createdAt).toLocaleString()}</span>
                          </div>
                          <button 
                            onClick={() => handleDeleteComment(comment._id)}
                            className="text-tertiary hover:text-danger-500 transition-colors"
                            aria-label="Delete comment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-small text-secondary whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-small text-tertiary text-center pt-2">No comments yet.</p>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-border flex justify-between">
              <Button variant="ghost" className="text-danger-500 hover:text-danger-600 hover:bg-danger-50" onClick={handleDeleteTask}>
                Delete Task
              </Button>
              <Button variant="secondary" onClick={() => {
                setEditTaskForm({
                  title: selectedTask.title,
                  description: selectedTask.description || '',
                  priority: selectedTask.priority,
                  assignee: selectedTask.assigneeId || '',
                  dueDate: selectedTask.dueDate || '',
                  column: selectedTask.columnId
                });
                setIsEditTaskModalOpen(true);
              }}>
                Edit Task
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Create Task Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Task"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateTask} isLoading={isCreating}>
              {isCreating ? 'Creating...' : 'Create Task'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-small text-primary font-medium">Task Title *</label>
            <Input 
              placeholder="e.g., Fix navigation bug" 
              value={newTaskForm.title}
              onChange={(e) => {
                setNewTaskForm({ ...newTaskForm, title: e.target.value });
                if (taskFormError) setTaskFormError('');
              }}
              error={taskFormError}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-1">
            <label className="text-small text-primary font-medium">Description</label>
            <textarea
              className="w-full bg-canvas border border-border rounded-md px-3 py-2 text-body text-primary focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed resize-y min-h-[80px]"
              placeholder="Add details about this task..."
              value={newTaskForm.description}
              onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
              disabled={isCreating}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-small text-primary font-medium">Status</label>
              <Select 
                value={newTaskForm.status}
                onChange={(val) => setNewTaskForm({ ...newTaskForm, status: val })}
                options={columns.map(col => ({ label: col.title, value: col.id }))}
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-small text-primary font-medium">Priority</label>
              <Select 
                value={newTaskForm.priority}
                onChange={(val) => setNewTaskForm({ ...newTaskForm, priority: val })}
                options={[
                  { label: 'Low', value: 'low' },
                  { label: 'Medium', value: 'medium' },
                  { label: 'High', value: 'high' }
                ]}
              />
            </div>

                <div className="space-y-1">
              <label className="text-small text-primary font-medium">Assignee</label>
              <Select 
                value={newTaskForm.assignee}
                onChange={(val) => setNewTaskForm({ ...newTaskForm, assignee: val })}
                options={[
                  { label: 'Unassigned', value: '' },
                  ...boardMembers.map(m => ({ label: m.name, value: m.id }))
                ]}
              />
            </div>

            <div className="space-y-1">
              <label className="text-small text-primary font-medium">Due Date</label>
              <Input 
                type="date"
                value={newTaskForm.dueDate}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })}
                disabled={isCreating}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Task Modal */}
      {editTaskForm && (
        <Modal
          isOpen={isEditTaskModalOpen}
          onClose={() => setIsEditTaskModalOpen(false)}
          title="Edit Task"
          size="md"
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsEditTaskModalOpen(false)} disabled={isEditingTask}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleUpdateTask} isLoading={isEditingTask}>
                Save Changes
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-small text-primary font-medium">Task Title *</label>
              <Input 
                value={editTaskForm.title}
                onChange={(e) => {
                  setEditTaskForm({ ...editTaskForm, title: e.target.value });
                  if (editTaskFormError) setEditTaskFormError('');
                }}
                error={editTaskFormError}
                disabled={isEditingTask}
              />
            </div>

            <div className="space-y-1">
              <label className="text-small text-primary font-medium">Description</label>
              <textarea
                className="w-full bg-canvas border border-border rounded-md px-3 py-2 text-body text-primary focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed resize-y min-h-[80px]"
                value={editTaskForm.description}
                onChange={(e) => setEditTaskForm({ ...editTaskForm, description: e.target.value })}
                disabled={isEditingTask}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-small text-primary font-medium">Status</label>
                <Select 
                  value={editTaskForm.column}
                  onChange={(val) => setEditTaskForm({ ...editTaskForm, column: val })}
                  options={columns.map(col => ({ label: col.title, value: col.id }))}
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-small text-primary font-medium">Priority</label>
                <Select 
                  value={editTaskForm.priority}
                  onChange={(val) => setEditTaskForm({ ...editTaskForm, priority: val })}
                  options={[
                    { label: 'Low', value: 'low' },
                    { label: 'Medium', value: 'medium' },
                    { label: 'High', value: 'high' }
                  ]}
                />
              </div>

              <div className="space-y-1">
                <label className="text-small text-primary font-medium">Assignee</label>
                <Select 
                  value={editTaskForm.assignee}
                  onChange={(val) => setEditTaskForm({ ...editTaskForm, assignee: val })}
                  options={[
                    { label: 'Unassigned', value: '' },
                    ...boardMembers.map(m => ({ label: m.name, value: m.id }))
                  ]}
                />
              </div>

              <div className="space-y-1">
                <label className="text-small text-primary font-medium">Due Date</label>
                <Input 
                  type="date"
                  value={editTaskForm.dueDate}
                  onChange={(e) => setEditTaskForm({ ...editTaskForm, dueDate: e.target.value })}
                  disabled={isEditingTask}
                />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Members Modal */}
      <Modal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        title={membersView === 'list' ? 'Board Members' : 'Invite Member'}
        size="sm"
        footer={
          membersView === 'list' ? (
            <Button variant="primary" onClick={() => setMembersView('invite')}>
              Invite Member
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setMembersView('list')}>
                Back
              </Button>
              <Button variant="primary" onClick={handleInvite}>
                Send Invite
              </Button>
            </>
          )
        }
      >
        {membersView === 'list' ? (
          <div className="space-y-4">
            {boardMembers.map(member => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-surface border border-border rounded-md hover:bg-surface-muted transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                  <div className="relative shrink-0">
                    <Avatar name={member.name} size="md" />
                    {member.isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success-500 border-2 border-surface rounded-full"></span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-body-medium text-primary font-medium truncate">{member.name}</div>
                    <div className="text-small text-tertiary truncate">{member.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-[110px]">
                    <Select 
                      value={member.role}
                      onChange={(newRole) => handleUpdateMemberRole(member.id, newRole)}
                      options={[
                        { label: 'Manager', value: 'manager' },
                        { label: 'Member', value: 'member' }
                      ]}
                    />
                  </div>
                  <button 
                    onClick={() => handleRemoveMember(member.id)}
                    className="text-danger-500 hover:text-danger-600 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded hover:bg-danger-50 transition-colors shrink-0"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {inviteError && <div className="text-small text-danger-500">{inviteError}</div>}
            <div className="space-y-1">
              <label className="text-small text-primary font-medium">Email Address *</label>
              <Input 
                placeholder="colleague@example.com" 
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-small text-primary font-medium">Role</label>
              <Select 
                value={inviteForm.role}
                onChange={(val) => setInviteForm({ ...inviteForm, role: val })}
                options={[
                  { label: 'Manager', value: 'manager' },
                  { label: 'Member', value: 'member' }
                ]}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Board Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Board Settings"
        size="md"
        footer={
          <div className="flex justify-between w-full">
            <Button variant="ghost" className="text-danger-500 hover:text-danger-600 hover:bg-danger-50" onClick={handleDeleteBoard}>
              Delete Board
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} disabled={isSavingBoard}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleEditBoard} isLoading={isSavingBoard}>
                Save Changes
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-small text-primary font-medium">Board Name *</label>
            <Input 
              value={editBoardForm.name}
              onChange={(e) => setEditBoardForm({ ...editBoardForm, name: e.target.value })}
              disabled={isSavingBoard}
            />
          </div>
          <div className="space-y-1">
            <label className="text-small text-primary font-medium">Description</label>
            <textarea
              className="w-full bg-canvas border border-border rounded-md px-3 py-2 text-body text-primary focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed resize-y min-h-[80px]"
              value={editBoardForm.description}
              onChange={(e) => setEditBoardForm({ ...editBoardForm, description: e.target.value })}
              disabled={isSavingBoard}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Board;
