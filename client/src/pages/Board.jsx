import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Search, Filter, Settings, Plus, Calendar as CalendarIcon, Paperclip, MessageSquare, Trash2, Download, LayoutDashboard, CalendarDays, BarChartHorizontal, Zap, PieChart } from 'lucide-react';
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
import CalendarView from '../components/views/CalendarView';
import GanttView from '../components/views/GanttView';
import AnalyticsView from '../components/views/AnalyticsView';
import AutomationsModal from '../components/board/AutomationsModal';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { socket, connectSocket, disconnectSocket } from '../api/socket';

const KanbanColumn = ({ title, count, statusColor, tasks, columnId, onTaskClick, isMember }) => {
  const { setNodeRef } = useDroppable({
    id: columnId,
    data: { type: 'Column', columnId }
  });

  return (
    <div className="flex flex-col bg-transparent w-[320px] shrink-0 p-2 h-full max-h-full overflow-hidden">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          {/* Status Dot */}
          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
          <h3 className="text-[12px] text-secondary font-bold uppercase tracking-wider">{title}</h3>
          <span className="text-[12px] text-tertiary font-medium ml-1">{count}</span>
        </div>
        {!isMember && (
          <IconButton variant="ghost" className="w-6 h-6" aria-label={`Add task to ${title}`}>
            <Plus className="w-4 h-4" />
          </IconButton>
        )}
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
      className="bg-surface border border-border rounded-2xl p-5 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing select-none"
    >
      <div className="flex flex-col gap-3">
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
                <CalendarIcon className="w-3.5 h-3.5" />
                <span className="text-[11px]">{task.dueDate}</span>
              </div>
            )}
            {task.attachments > 0 && (
              <div className="flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5" />
                <span className="text-[11px]">{task.attachments}</span>
              </div>
            )}
            {task.subtasks?.length > 0 && (
              <div className="flex items-center gap-1 text-accent-600">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                <span className="text-[11px]">{task.subtasks.filter(st => st.isCompleted).length}/{task.subtasks.length}</span>
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
  const { user, token } = useAuth();
  const isMember = user?.globalRole === 'member';
  
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [isLoadingBoard, setIsLoadingBoard] = useState(true);
  const [boardError, setBoardError] = useState('');

  const [columns, setColumns] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban', 'calendar', 'gantt', 'analytics'

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
  const [inviteError, setInviteError] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  
  // Automations Modal State
  const [isAutomationsModalOpen, setIsAutomationsModalOpen] = useState(false);

  // Generic Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Delete'
  });

  const fetchBoardData = async () => {
    try {
      const res = await apiClient.get(`/boards/${boardId}`);
      setBoard(res.data.board);
      if (res.data.organization) {
        localStorage.setItem('taskflow_active_org', JSON.stringify(res.data.organization));
      }
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
          const colTasks = allTasks.filter(t => {
            const taskColId = (t.column && typeof t.column === 'object') ? t.column._id?.toString() : (t.column || t.columnId)?.toString();
            return taskColId === col.id?.toString();
          }).map(t => ({
            id: t._id || t.id,
            title: t.title,
            description: t.description,
            priority: t.priority,
            startDate: t.startDate || '',
            dueDate: t.dueDate || '',
            subtasks: t.subtasks || [],
            attachments: t.attachments || 0,
            comments: t.comments || 0,
            assignee: t.assignee?.name || t.assignee || null,
            assigneeId: t.assignee?._id || t.assigneeId || null,
            columnId: (t.column && typeof t.column === 'object') ? t.column._id : (t.column || t.columnId),
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

      const joinBoardRoom = () => {
        socket.emit('join_board', boardId);
      };

      if (socket.connected) {
        joinBoardRoom();
      }

      socket.on('connect', joinBoardRoom);

      const triggerTaskUpdate = () => setSocketSignal({ type: 'task', timestamp: Date.now() });
      const triggerBoardUpdate = () => setSocketSignal({ type: 'board', timestamp: Date.now() });
      const triggerBothUpdate = () => setSocketSignal({ type: 'both', timestamp: Date.now() });

      // Socket Handlers - update local state directly for speed
      const handleTaskCreated = (data) => {
        if (!data || !data.task) return;
        const taskAssigneeId = data.task.assignee?._id?.toString() || data.task.assignee?.toString();
        // Members must strictly ONLY see tasks assigned to them
        if (isMember && taskAssigneeId !== user?._id?.toString()) {
          return;
        }

        const targetColId = (data.task.column && typeof data.task.column === 'object') ? data.task.column._id?.toString() : (data.task.column || data.task.columnId)?.toString();

        setColumns(prev => prev.map(col => {
          if (col.id?.toString() === targetColId) {
            const exists = col.tasks.some(t => t.id === data.task._id);
            if (exists) return col;

            const newTask = {
              id: data.task._id,
              title: data.task.title,
              description: data.task.description,
              priority: data.task.priority,
              startDate: data.task.startDate || '',
              dueDate: data.task.dueDate || '',
              subtasks: data.task.subtasks || [],
              attachments: 0,
              comments: 0,
              assignee: data.task.assignee?.name || null,
              assigneeId: data.task.assignee?._id || null,
              columnId: col.id
            };
            return { ...col, tasks: [...col.tasks, newTask] };
          }
          return col;
        }));
      };

      const handleTaskUpdated = (data) => {
        if (!data || !data.task) return;
        const updatedTask = data.task;
        const taskId = (updatedTask._id || updatedTask.id)?.toString();
        const taskAssigneeId = updatedTask.assignee?._id?.toString() || updatedTask.assignee?.toString() || updatedTask.assigneeId?.toString();

        if (isMember && taskAssigneeId !== user?._id?.toString()) {
          // If task is no longer assigned to this member, remove it from view
          setColumns(prev => prev.map(col => ({
            ...col,
            tasks: col.tasks.filter(t => (t.id || t._id)?.toString() !== taskId)
          })));
          setSelectedTask(prev => {
            if (prev && (prev.id?.toString() === taskId || prev._id?.toString() === taskId)) {
              setIsDrawerOpen(false);
              return null;
            }
            return prev;
          });
          return;
        }

        // Update selectedTask if currently open in task drawer
        setSelectedTask(prev => {
          if (prev && (prev.id?.toString() === taskId || prev._id?.toString() === taskId)) {
            return {
              ...prev,
              ...updatedTask,
              id: taskId,
              title: updatedTask.title,
              description: updatedTask.description,
              priority: updatedTask.priority,
              startDate: updatedTask.startDate || '',
              dueDate: updatedTask.dueDate || '',
              assignee: updatedTask.assignee?.name || (typeof updatedTask.assignee === 'string' ? updatedTask.assignee : prev.assignee),
              assigneeId: updatedTask.assignee?._id || updatedTask.assigneeId || prev.assigneeId,
              column: updatedTask.column,
              columnId: (updatedTask.column && typeof updatedTask.column === 'object') ? updatedTask.column._id?.toString() : (updatedTask.column || updatedTask.columnId)?.toString()
            };
          }
          return prev;
        });

        const targetColId = (updatedTask.column && typeof updatedTask.column === 'object')
          ? updatedTask.column._id?.toString()
          : (updatedTask.column || updatedTask.columnId)?.toString();

        setColumns(prevCols => {
          const cleanedCols = prevCols.map(col => ({
            ...col,
            tasks: col.tasks.filter(t => (t.id || t._id)?.toString() !== taskId)
          }));

          const formattedTask = {
            id: taskId,
            title: updatedTask.title,
            description: updatedTask.description,
            priority: updatedTask.priority,
            startDate: updatedTask.startDate || '',
            dueDate: updatedTask.dueDate || '',
            subtasks: updatedTask.subtasks || [],
            attachments: updatedTask.attachments ? (Array.isArray(updatedTask.attachments) ? updatedTask.attachments.length : updatedTask.attachments) : 0,
            comments: updatedTask.comments ? (Array.isArray(updatedTask.comments) ? updatedTask.comments.length : updatedTask.comments) : 0,
            assignee: updatedTask.assignee?.name || (typeof updatedTask.assignee === 'string' ? updatedTask.assignee : null),
            assigneeId: updatedTask.assignee?._id || updatedTask.assigneeId || null,
            columnId: targetColId,
            isOverdue: false
          };

          return cleanedCols.map(col => {
            if (col.id?.toString() === targetColId) {
              return {
                ...col,
                tasks: [...col.tasks, formattedTask]
              };
            }
            return col;
          });
        });
      };

      const handleTaskMoved = (data) => {
        if (!data || !data.task) return;
        const targetTask = data.task;
        const targetTaskId = targetTask._id || targetTask.id;
        const taskAssigneeId = targetTask.assignee?._id?.toString() || targetTask.assignee?.toString();

        if (isMember && taskAssigneeId !== user?._id?.toString()) {
          setColumns(prev => prev.map(col => ({
            ...col,
            tasks: col.tasks.filter(t => t.id !== targetTaskId)
          })));
          return;
        }

        const targetColId = (targetTask.column && typeof targetTask.column === 'object') ? targetTask.column._id?.toString() : (targetTask.column || targetTask.columnId)?.toString();

        setColumns(prev => {
          let movedItem = null;
          const cleanedCols = prev.map(col => {
            const match = col.tasks.find(t => t.id === targetTaskId);
            if (match) movedItem = match;
            return { ...col, tasks: col.tasks.filter(t => t.id !== targetTaskId) };
          });

          if (!movedItem) {
            return prev;
          }

          const updatedItem = {
            ...movedItem,
            columnId: targetColId
          };

          return cleanedCols.map(col => {
            if (col.id?.toString() === targetColId) {
              const newTasks = [...col.tasks];
              const pos = typeof targetTask.position === 'number' ? targetTask.position : newTasks.length;
              newTasks.splice(pos, 0, updatedItem);
              return { ...col, tasks: newTasks };
            }
            return col;
          });
        });
      };

      const handleTaskDeleted = (data) => {
        if (!data || !data.taskId) return;
        setColumns(prev => prev.map(col => ({
          ...col,
          tasks: col.tasks.filter(t => t.id !== data.taskId)
        })));
      };

      socket.on('task_created', handleTaskCreated);
      socket.on('task_updated', handleTaskUpdated);
      socket.on('task_moved', handleTaskMoved);
      socket.on('task_deleted', handleTaskDeleted);
      
      socket.on('member_added', triggerBothUpdate);
      socket.on('member_removed', triggerBothUpdate);
      socket.on('member_role_changed', triggerBoardUpdate);
      
      socket.on('comment_created', (data) => {
        handleTaskUpdated(data);
        triggerTaskUpdate();
      });
      socket.on('comment_deleted', (data) => {
        handleTaskUpdated(data);
        triggerTaskUpdate();
      });
      socket.on('attachment_uploaded', (data) => {
        handleTaskUpdated(data);
        triggerTaskUpdate();
      });
      socket.on('attachment_deleted', (data) => {
        handleTaskUpdated(data);
        triggerTaskUpdate();
      });
      
      socket.on('presence_update', (users) => {
        setOnlineUsers(users);
      });

      return () => {
        socket.off('connect', joinBoardRoom);
        socket.emit('leave_board', boardId);
        socket.off('task_created', handleTaskCreated);
        socket.off('task_updated', handleTaskUpdated);
        socket.off('task_moved', handleTaskMoved);
        socket.off('task_deleted', handleTaskDeleted);
        socket.off('member_added', triggerBothUpdate);
        socket.off('member_removed', triggerBothUpdate);
        socket.off('member_role_changed', triggerBoardUpdate);
        socket.off('comment_created');
        socket.off('comment_deleted');
        socket.off('attachment_uploaded');
        socket.off('attachment_deleted');
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
      // Revert state by fetching from server only if it fails
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

  const handleOpenEditTaskModal = (taskToEdit) => {
    const task = taskToEdit || selectedTask;
    if (!task) return;
    const colId = (task.column && typeof task.column === 'object')
      ? (task.column._id || task.column.id)
      : (task.column || task.columnId || (columns.length > 0 ? columns[0].id : ''));
    
    const assigneeVal = task.assigneeId || (typeof task.assignee === 'object' ? task.assignee?._id : (boardMembers.find(m => m.name === task.assignee)?.id || ''));

    setEditTaskForm({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      assignee: assigneeVal || '',
      startDate: task.startDate ? task.startDate.split('T')[0] : '',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      column: colId
    });
    setEditTaskFormError('');
    setIsEditTaskModalOpen(true);
  };

  const handleUpdateTask = async () => {
    if (!editTaskForm.title.trim()) {
      setEditTaskFormError('Task title is required.');
      return;
    }
    setEditTaskFormError('');
    setIsEditingTask(true);
    try {
      const res = await apiClient.patch(`/boards/${boardId}/tasks/${selectedTask.id || selectedTask._id}`, editTaskForm);
      if (res?.data?.task) {
        handleTaskUpdated({ task: res.data.task });
      } else {
        await fetchTasks(false);
      }
      setIsEditTaskModalOpen(false);
    } catch (err) {
      setEditTaskFormError(err.message || 'Failed to update task');
    } finally {
      setIsEditingTask(false);
    }
  };

  const handleDeleteTask = async () => {
    try {
      await apiClient.delete(`/boards/${boardId}/tasks/${selectedTask.id}`);
      await fetchTasks(false);
      setIsDrawerOpen(false);
      setTaskToDelete(false);
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
    try {
      await apiClient.delete(`/boards/${boardId}/tasks/${selectedTask.id}/comments/${commentId}`);
      setTaskComments(prev => prev.filter(c => c._id !== commentId));
      await fetchTasks(false);
      setCommentToDelete(null);
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
    try {
      await apiClient.delete(`/boards/${boardId}/tasks/${selectedTask.id}/attachments/${attachmentId}`);
      setTaskAttachments(prev => prev.filter(a => a._id !== attachmentId));
      await fetchTasks(false);
      setAttachmentToDelete(null);
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
    try {
      await apiClient.delete(`/boards/${boardId}/members/${userId}`);
      setBoardMembers(prev => prev.filter(m => m.id !== userId));
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleOpenEditBoardModal = () => {
    if (board) {
      setEditBoardForm({
        name: board.name || '',
        description: board.description || ''
      });
    }
    setBoardError('');
    setIsEditModalOpen(true);
  };

  const handleEditBoard = async () => {
    if (!editBoardForm.name?.trim()) {
      setBoardError('Board name is required.');
      return;
    }
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

              {/* View Switcher */}
              <div className="flex bg-surface-muted rounded-md p-1 shrink-0">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`p-1.5 rounded-sm transition-colors ${viewMode === 'kanban' ? 'bg-surface shadow-sm text-primary' : 'text-tertiary hover:text-secondary'}`}
                  title="Kanban View"
                >
                  <LayoutDashboard className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`p-1.5 rounded-sm transition-colors ${viewMode === 'calendar' ? 'bg-surface shadow-sm text-primary' : 'text-tertiary hover:text-secondary'}`}
                  title="Calendar View"
                >
                  <CalendarDays className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('gantt')}
                  className={`p-1.5 rounded-sm transition-colors ${viewMode === 'gantt' ? 'bg-surface shadow-sm text-primary' : 'text-tertiary hover:text-secondary'}`}
                  title="Gantt View"
                >
                  <BarChartHorizontal className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('analytics')}
                  className={`p-1.5 rounded-sm transition-colors ${viewMode === 'analytics' ? 'bg-surface shadow-sm text-primary' : 'text-tertiary hover:text-secondary'}`}
                  title="Analytics View"
                >
                  <PieChart className="w-4 h-4" />
                </button>
              </div>

              <div className="hidden sm:flex border-l border-border h-6 mx-1" />

              {!isMember && (
                <>
                  <Button variant="primary" size="sm" className="shrink-0" onClick={() => setIsModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Task
                  </Button>
                  
                  <IconButton 
                    variant="ghost" 
                    aria-label="Automations" 
                    className="shrink-0 h-[32px] w-[32px] text-accent-500 hover:bg-accent-50"
                    onClick={() => setIsAutomationsModalOpen(true)}
                    title="Automations"
                  >
                    <Zap className="w-4 h-4" />
                  </IconButton>
                  
                  <IconButton 
                    variant="ghost" 
                    aria-label="Board settings" 
                    className="shrink-0 h-[32px] w-[32px]"
                    onClick={handleOpenEditBoardModal}
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </IconButton>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'kanban' && (
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
                  isMember={isMember}
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
      )}

      {viewMode === 'calendar' && (
        <div className="flex-1 overflow-hidden pb-4">
          <CalendarView 
            tasks={columns.flatMap(c => c.tasks)} 
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
        </div>
      )}

      {viewMode === 'gantt' && (
        <div className="flex-1 overflow-hidden pb-4">
          <GanttView 
            tasks={columns.flatMap(c => c.tasks)} 
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
        </div>
      )}

      {viewMode === 'analytics' && (
        <div className="flex-1 overflow-hidden pb-4">
          <AnalyticsView boardId={boardId} />
        </div>
      )}

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
              {selectedTask.startDate && (
                <div className="flex items-center gap-1.5 text-small text-secondary">
                  <CalendarIcon className="w-4 h-4" />
                  <span>Start: {selectedTask.startDate}</span>
                </div>
              )}
              {selectedTask.dueDate && (
                <div className={`flex items-center gap-1.5 text-small ${selectedTask.isOverdue ? 'text-danger-500 font-medium' : 'text-secondary'}`}>
                  <CalendarIcon className="w-4 h-4" />
                  <span>Due: {selectedTask.dueDate}</span>
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

            {/* Subtasks Section */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-body-medium font-medium text-primary">Subtasks</h3>
              </div>
              <div className="w-full bg-surface-muted rounded-full h-1.5 mb-2">
                <div 
                  className="bg-accent-500 h-1.5 rounded-full transition-all duration-300" 
                  style={{ width: `${selectedTask.subtasks && selectedTask.subtasks.length > 0 ? (selectedTask.subtasks.filter(s => s.isCompleted).length / selectedTask.subtasks.length) * 100 : 0}%` }}
                ></div>
              </div>
              
              <div className="space-y-1.5">
                {(selectedTask.subtasks || []).map((subtask, idx) => (
                  <div key={idx} className="flex items-center gap-2 group">
                    <input 
                      type="checkbox" 
                      className="rounded border-border text-accent-600 focus:ring-accent-500 cursor-pointer w-4 h-4"
                      checked={subtask.isCompleted}
                      onChange={async (e) => {
                        const newSubtasks = [...selectedTask.subtasks];
                        newSubtasks[idx] = { ...subtask, isCompleted: e.target.checked };
                        setSelectedTask(prev => ({ ...prev, subtasks: newSubtasks }));
                        
                        try {
                          await apiClient.patch(`/boards/${boardId}/tasks/${selectedTask.id}`, { subtasks: newSubtasks });
                          fetchTasks(false);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                    />
                    <span className={`text-small flex-1 ${subtask.isCompleted ? 'line-through text-tertiary' : 'text-primary'}`}>
                      {subtask.title}
                    </span>
                    {!isMember && (
                      <button 
                        className="opacity-0 group-hover:opacity-100 text-tertiary hover:text-danger-500 transition-opacity p-1"
                        onClick={async () => {
                          const newSubtasks = selectedTask.subtasks.filter((_, i) => i !== idx);
                          setSelectedTask(prev => ({ ...prev, subtasks: newSubtasks }));
                          try {
                            await apiClient.patch(`/boards/${boardId}/tasks/${selectedTask.id}`, { subtasks: newSubtasks });
                            fetchTasks(false);
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {!isMember && (
                <div className="flex gap-2 items-center mt-2">
                  <Input 
                    placeholder="Add a subtask..." 
                    className="h-[32px] text-small"
                    id="new-subtask-input"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        const newSubtasks = [...(selectedTask.subtasks || []), { title: e.target.value.trim(), isCompleted: false }];
                        e.target.value = '';
                        setSelectedTask(prev => ({ ...prev, subtasks: newSubtasks }));
                        try {
                          await apiClient.patch(`/boards/${boardId}/tasks/${selectedTask.id}`, { subtasks: newSubtasks });
                          fetchTasks(false);
                        } catch (err) {
                          console.error(err);
                        }
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Assignee */}
            <div className="space-y-2 pt-4 border-t border-border">
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
                    <div key={att._id} className="flex flex-col bg-surface border border-border p-2 rounded-md">
                      <div className="flex items-center justify-between">
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
                          {(!isMember || att.uploadedBy?._id === user?._id || att.uploadedBy === user?._id) && (
                            <IconButton 
                              variant="ghost" 
                              className="w-7 h-7 text-danger-500" 
                              onClick={() => setConfirmDialog({
                                isOpen: true,
                                title: 'Delete Attachment',
                                message: 'Are you sure you want to delete this attachment?',
                                confirmText: 'Delete',
                                onConfirm: () => {
                                  handleDeleteAttachment(att._id);
                                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                }
                              })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </IconButton>
                          )}
                        </div>
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
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-small font-medium text-primary">{comment.author?.name || 'Unknown'}</span>
                            <span className="text-[11px] text-tertiary">{new Date(comment.createdAt).toLocaleString()}</span>
                          </div>
                          {(!isMember || comment.author?._id === user?._id || comment.author === user?._id) && (
                            <button 
                              onClick={() => setConfirmDialog({
                                isOpen: true,
                                title: 'Delete Comment',
                                message: 'Are you sure you want to delete this comment?',
                                confirmText: 'Delete',
                                onConfirm: () => {
                                  handleDeleteComment(comment._id);
                                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                }
                              })}
                              className="text-tertiary hover:text-danger-500 transition-colors"
                              aria-label="Delete comment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

            {!isMember && (
              <div className="pt-6 border-t border-border flex justify-between">
                <Button 
                  variant="ghost" 
                  className="text-danger-500 hover:text-danger-600 hover:bg-danger-50" 
                  onClick={() => setConfirmDialog({
                    isOpen: true,
                    title: 'Delete Task',
                    message: 'Are you sure you want to delete this task?',
                    confirmText: 'Delete Task',
                    onConfirm: () => {
                      handleDeleteTask();
                      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    }
                  })}
                >
                  Delete Task
                </Button>
                <Button variant="secondary" onClick={() => handleOpenEditTaskModal(selectedTask)}>
                  Edit Task
                </Button>
              </div>
            )}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-small text-primary font-medium">Start Date</label>
                <Input 
                  type="date"
                  value={newTaskForm.startDate || ''}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, startDate: e.target.value })}
                  disabled={isCreating}
                />
              </div>
              <div className="space-y-1">
                <label className="text-small text-primary font-medium">Due Date</label>
                <Input 
                  type="date"
                  value={newTaskForm.dueDate || ''}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })}
                  disabled={isCreating}
                />
              </div>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-small text-primary font-medium">Start Date</label>
                  <Input 
                    type="date"
                    value={editTaskForm.startDate || ''}
                    onChange={(e) => setEditTaskForm({ ...editTaskForm, startDate: e.target.value })}
                    disabled={isEditingTask}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-small text-primary font-medium">Due Date</label>
                  <Input 
                    type="date"
                    value={editTaskForm.dueDate || ''}
                    onChange={(e) => setEditTaskForm({ ...editTaskForm, dueDate: e.target.value })}
                    disabled={isEditingTask}
                  />
                </div>
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
              <Button variant="ghost" onClick={() => setMembersView('list')} disabled={isInviting}>
                Back
              </Button>
              <Button variant="primary" onClick={handleInvite} isLoading={isInviting} disabled={isInviting}>
                {isInviting ? 'Sending...' : 'Send Invite'}
              </Button>
            </>
          )
        }
      >
        {membersView === 'list' ? (
          <div className="space-y-4">
            {boardMembers.map(member => (
              <div key={member.id} className="flex flex-col p-3 bg-surface border border-border rounded-md hover:bg-surface-muted transition-colors">
                <div className="flex items-center justify-between">
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
                    {!isMember ? (
                      <>
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
                          onClick={() => setConfirmDialog({
                            isOpen: true,
                            title: 'Remove Member',
                            message: 'Are you sure you want to remove this member from the board?',
                            confirmText: 'Remove',
                            onConfirm: () => {
                              handleRemoveMember(member.id);
                              setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                            }
                          })}
                          className="text-danger-500 hover:text-danger-600 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded hover:bg-danger-50 transition-colors shrink-0"
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <Badge variant={member.role === 'manager' ? 'high' : 'neutral'} className="capitalize">
                        {member.role}
                      </Badge>
                    )}
                  </div>
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
            <Button 
              variant="ghost" 
              className="text-danger-500 hover:text-danger-600 hover:bg-danger-50" 
              onClick={() => setConfirmDialog({
                isOpen: true,
                title: 'Delete Board',
                message: 'Are you sure you want to delete this board? This cannot be undone.',
                confirmText: 'Delete Board',
                onConfirm: () => {
                  handleDeleteBoard();
                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }
              })}
            >
              Delete Board
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} disabled={isSavingBoard}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleEditBoard} isLoading={isSavingBoard}>
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setIsAutomationsModalOpen(true)}>
                Automations
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {boardError && <div className="text-small text-danger-500">{boardError}</div>}
          <div className="space-y-1">
            <label className="text-small text-primary font-medium">Board Name *</label>
            <Input 
              value={editBoardForm.name}
              onChange={(e) => setEditBoardForm({ ...editBoardForm, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-small text-primary font-medium">Description</label>
            <textarea
              className="w-full bg-canvas border border-border rounded-md px-3 py-2 text-body text-primary focus:outline-none focus:border-accent-500 transition-colors resize-y min-h-[80px]"
              value={editBoardForm.description}
              onChange={(e) => setEditBoardForm({ ...editBoardForm, description: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* Automations Modal */}
      <AutomationsModal 
        isOpen={isAutomationsModalOpen}
        onClose={() => setIsAutomationsModalOpen(false)}
        boardId={boardId}
        columns={columns}
      />

      {/* Confirmation Dialog */}
      <Modal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        title={confirmDialog.title}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}>
              Cancel
            </Button>
            <Button variant="primary" className="bg-danger-500 hover:bg-danger-600 text-white border-transparent" onClick={confirmDialog.onConfirm}>
              {confirmDialog.confirmText}
            </Button>
          </>
        }
      >
        <p className="text-body text-secondary">{confirmDialog.message}</p>
      </Modal>
    </div>
  );
};

export default Board;
