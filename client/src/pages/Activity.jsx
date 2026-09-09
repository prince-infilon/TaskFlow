import React, { useState, useEffect, useCallback } from 'react';
import { 
  Clock, Filter, Search, RefreshCw, CheckCircle2, MessageSquare, 
  Paperclip, UserPlus, FolderPlus, Layers, ArrowRight, Layout, Sparkles, AlertCircle
} from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import apiClient from '../api/client';
import { socket, connectSocket } from '../api/socket';
import { useNavigate } from 'react-router-dom';

const getActionDetails = (act) => {
  const meta = act.metadata || {};
  switch (act.action) {
    case 'board_created': 
      return { 
        text: 'created board', 
        target: meta.boardName || act.board?.name || 'a board', 
        icon: FolderPlus, 
        color: 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950/50 dark:border-indigo-800' 
      };
    case 'member_added': 
      return { 
        text: 'added member', 
        target: meta.addedEmail || 'a member', 
        detail: meta.role ? `as ${meta.role}` : '', 
        icon: UserPlus, 
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/50 dark:border-emerald-800' 
      };
    case 'member_role_changed': 
      return { 
        text: 'updated role of', 
        target: meta.addedEmail || 'member', 
        detail: meta.newRole ? `to ${meta.newRole}` : '', 
        icon: UserPlus, 
        color: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/50 dark:border-blue-800' 
      };
    case 'member_removed': 
      return { 
        text: 'removed a member from workspace', 
        target: '', 
        icon: UserPlus, 
        color: 'text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/50 dark:border-rose-800' 
      };
    case 'task_created': 
      return { 
        text: 'created new task', 
        target: meta.taskTitle || 'a task', 
        icon: Layers, 
        color: 'text-violet-600 bg-violet-50 border-violet-200 dark:text-violet-400 dark:bg-violet-950/50 dark:border-violet-800' 
      };
    case 'task_moved': 
      return { 
        text: 'moved task', 
        target: meta.taskTitle || 'a task', 
        detail: meta.toColumnName ? `to ${meta.toColumnName}` : '', 
        icon: ArrowRight, 
        color: 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/50 dark:border-amber-800' 
      };
    case 'task_assigned': 
      return { 
        text: 'assigned task', 
        target: meta.taskTitle || 'a task', 
        icon: Layers, 
        color: 'text-sky-600 bg-sky-50 border-sky-200 dark:text-sky-400 dark:bg-sky-950/50 dark:border-sky-800' 
      };
    case 'task_updated': 
      return { 
        text: 'updated task details for', 
        target: meta.taskTitle || 'a task', 
        icon: Layers, 
        color: 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700' 
      };
    case 'task_deleted': 
      return { 
        text: 'deleted task', 
        target: meta.taskTitle || 'a task', 
        icon: Layers, 
        color: 'text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/50 dark:border-rose-800' 
      };
    case 'comment_created': 
      return { 
        text: 'commented on task', 
        target: meta.taskTitle || 'a task', 
        detail: meta.text ? `"${meta.text.substring(0, 40)}${meta.text.length > 40 ? '...' : ''}"` : '', 
        icon: MessageSquare, 
        color: 'text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950/50 dark:border-purple-800' 
      };
    case 'attachment_uploaded': 
      return { 
        text: 'uploaded attachment', 
        target: meta.originalFilename || 'a file', 
        icon: Paperclip, 
        color: 'text-teal-600 bg-teal-50 border-teal-200 dark:text-teal-400 dark:bg-teal-950/50 dark:border-teal-800' 
      };
    default: 
      return { 
        text: act.action ? act.action.replace('_', ' ') : 'performed action', 
        target: '', 
        icon: Sparkles, 
        color: 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700' 
      };
  }
};

const Activity = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [boards, setBoards] = useState([]);
  const [stats, setStats] = useState({ totalToday: 0, tasksMovedToday: 0, commentsToday: 0, totalAllTime: 0 });
  const [selectedBoard, setSelectedBoard] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchActivities = useCallback(async (pageNum = 1, isManualRefresh = false) => {
    try {
      if (pageNum === 1) {
        if (isManualRefresh) setIsRefreshing(true);
        else setIsLoading(true);
      }
      setError('');

      let url = `/activity?page=${pageNum}&limit=40`;
      if (selectedBoard) url += `&boardId=${selectedBoard}`;
      if (selectedEntity !== 'all') url += `&entityType=${selectedEntity}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await apiClient.get(url);
      const data = res.data || res;
      const loadedActivities = data.activities || [];
      const loadedBoards = data.boards || [];
      const loadedStats = data.stats || { totalToday: 0, tasksMovedToday: 0, commentsToday: 0, totalAllTime: 0 };
      const pagination = data.pagination || { page: 1, totalPages: 1 };

      if (pageNum === 1) {
        setActivities(loadedActivities);
      } else {
        setActivities(prev => [...prev, ...loadedActivities]);
      }

      setBoards(loadedBoards);
      setStats(loadedStats);
      setHasMore(pagination.page < pagination.totalPages);
    } catch (err) {
      console.error('Fetch activity error:', err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to load activity');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedBoard, selectedEntity, searchQuery]);

  useEffect(() => {
    setPage(1);
    fetchActivities(1);
  }, [selectedBoard, selectedEntity, searchQuery, fetchActivities]);

  useEffect(() => {
    if (page > 1) {
      fetchActivities(page);
    }
  }, [page, fetchActivities]);

  // Realtime Socket updates
  useEffect(() => {
    const token = localStorage.getItem('taskflow_token');
    if (token) {
      connectSocket(token);

      const handleRealtimeActivity = () => {
        fetchActivities(1, true);
      };

      const events = [
        'task_created', 'task_updated', 'task_moved', 'task_deleted',
        'comment_created', 'comment_deleted', 'attachment_uploaded',
        'attachment_deleted', 'board_created', 'board_updated', 'board_deleted',
        'member_added', 'member_role_changed', 'member_removed', 'notification_received'
      ];

      events.forEach(ev => socket.on(ev, handleRealtimeActivity));

      return () => {
        events.forEach(ev => socket.off(ev, handleRealtimeActivity));
      };
    }
  }, [fetchActivities]);

  const handleActivityClick = (act) => {
    const boardId = act.board?._id || act.board;
    const taskId = act.entityType === 'task' ? act.entityId : act.metadata?.taskId;
    if (boardId) {
      if (taskId) {
        navigate(`/app/boards/${boardId}?taskId=${taskId}&section=comments`);
      } else {
        navigate(`/app/boards/${boardId}`);
      }
    }
  };

  // Group activities by date string
  const groupedActivities = activities.reduce((acc, curr) => {
    const dateObj = new Date(curr.createdAt);
    const today = new Date().toLocaleDateString();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
    const dateStr = dateObj.toLocaleDateString();
    
    let label = dateStr;
    if (dateStr === today) label = 'Today';
    else if (dateStr === yesterday) label = 'Yesterday';

    let group = acc.find(g => g.label === label);
    if (!group) {
      group = { label, events: [] };
      acc.push(group);
    }

    const details = getActionDetails(curr);
    group.events.push({
      id: curr._id,
      user: curr.user,
      userName: curr.user?.name || 'Team Member',
      boardName: curr.board?.name || curr.metadata?.boardName || '',
      boardId: curr.board?._id || curr.board,
      text: details.text,
      target: details.target,
      detail: details.detail,
      Icon: details.icon,
      colorClass: details.colorClass || details.color,
      time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      raw: curr
    });
    return acc;
  }, []);

  return (
    <div className="max-w-5xl mx-auto w-full animate-in fade-in duration-300 pb-16">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Activity Log
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time audit trail of board updates, task movements, comments, and workspace activity.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchActivities(1, true)}
          disabled={isRefreshing || isLoading}
          className="self-start sm:self-auto gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Today</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.totalToday}</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Task Movements</span>
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.tasksMovedToday}</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">New Comments</span>
          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{stats.commentsToday}</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Recorded Events</span>
          <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats.totalAllTime}</span>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 mb-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Board Selector */}
          <div className="w-full sm:w-64">
            <Select
              value={selectedBoard}
              onChange={(val) => setSelectedBoard(val)}
              options={[
                { label: 'All Boards', value: '' },
                ...boards.map(b => ({ label: b.name, value: b._id }))
              ]}
            />
          </div>

          {/* Search Filter */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by title, file, or member..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {/* Entity Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 dark:border-slate-800">
          {[
            { id: 'all', label: 'All Activity' },
            { id: 'task', label: 'Tasks' },
            { id: 'comment', label: 'Comments' },
            { id: 'attachment', label: 'Attachments' },
            { id: 'member', label: 'Members' },
            { id: 'board', label: 'Boards' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedEntity(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                selectedEntity === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Timeline Stream */}
      {error ? (
        <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{error}</p>
        </div>
      ) : isLoading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
          <p className="text-sm">Loading activity feed...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm">
          <Clock className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No activity recorded</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Activity events will appear here automatically as team members interact with tasks and boards.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedActivities.map((group) => (
            <div key={group.label}>
              {/* Date Section Header */}
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3 py-1 rounded-full">
                  {group.label}
                </h3>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
              </div>

              {/* Feed Group */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
                {group.events.map(ev => {
                  const Icon = ev.Icon;
                  return (
                    <div 
                      key={ev.id} 
                      onClick={() => handleActivityClick(ev.raw)}
                      className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer flex items-start gap-4 group"
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <Avatar name={ev.userName} src={ev.user?.avatarUrl} size="md" />
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border border-white dark:border-slate-900 flex items-center justify-center ${ev.colorClass}`}>
                          <Icon className="w-3 h-3" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm text-slate-800 dark:text-slate-200 leading-snug">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 mr-1.5">{ev.userName}</span>
                            <span className="text-slate-600 dark:text-slate-400 mr-1.5">{ev.text}</span>
                            {ev.target && (
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline mr-1.5">
                                {ev.target}
                              </span>
                            )}
                            {ev.detail && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                {ev.detail}
                              </span>
                            )}
                          </p>

                          {ev.boardName && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                              <span>in board</span>
                              <span className="font-medium text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">
                                {ev.boardName}
                              </span>
                            </p>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className="shrink-0 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{ev.time}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Load More Button */}
          {hasMore && (
            <div className="pt-4 flex justify-center">
              <Button 
                variant="outline" 
                onClick={() => setPage(p => p + 1)}
                disabled={isLoading}
                className="gap-2 text-xs font-semibold"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Loading older events...
                  </>
                ) : (
                  'Load older activity'
                )}
              </Button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default Activity;
