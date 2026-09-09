import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, MessageSquare, Briefcase, AlertCircle, Users, Bell, Paperclip, ChevronRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import { cn } from '../utils/cn';
import apiClient from '../api/client';
import { socket } from '../api/socket';

const NotificationIcon = ({ type }) => {
  switch(type) {
    case 'task_assigned':
    case 'assignment': return <Briefcase className="w-4.5 h-4.5 text-indigo-500" />;
    case 'comment_added':
    case 'comment': return <MessageSquare className="w-4.5 h-4.5 text-blue-500" />;
    case 'attachment_added': return <Paperclip className="w-4.5 h-4.5 text-amber-500" />;
    case 'status_changed':
    case 'status': return <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />;
    case 'priority': return <AlertCircle className="w-4.5 h-4.5 text-red-500" />;
    case 'invite': return <Users className="w-4.5 h-4.5 text-purple-500" />;
    default: return <Bell className="w-4.5 h-4.5 text-indigo-500" />;
  }
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/notifications');
      const list = res.data?.data?.notifications || res.data?.notifications || [];
      setNotifications(list);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const handleNotification = (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
    };

    socket.on('notification_received', handleNotification);

    return () => {
      socket.off('notification_received', handleNotification);
    };
  }, [fetchNotifications]);

  const handleNotificationClick = async (n) => {
    const notifId = n._id || n.id;
    try {
      if (!n.isRead) {
        await apiClient.patch(`/notifications/${notifId}/read`);
        setNotifications(prev => prev.map(item => (item._id === notifId || item.id === notifId) ? { ...item, isRead: true } : item));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }

    const boardId = n.board?._id || n.board;
    const taskId = n.task?._id || n.task;
    const targetSection = n.targetSection || 'comments';

    if (boardId) {
      if (taskId) {
        navigate(`/app/boards/${boardId}?taskId=${taskId}&section=${targetSection}`);
      } else {
        navigate(`/app/boards/${boardId}`);
      }
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-[840px] mx-auto w-full animate-in fade-in duration-300 pb-12 text-slate-800 dark:text-slate-100">
      {/* Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time updates & activity on tasks assigned to or involving you.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700 shrink-0"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Notifications Feed */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col divide-y divide-slate-100 dark:divide-slate-800/60">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Loading notifications...
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((n) => (
            <div 
              key={n._id || n.id}
              className={cn(
                "flex items-start gap-4 p-4.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group",
                !n.isRead ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
              )}
              onClick={() => handleNotificationClick(n)}
            >
              <div className="shrink-0 relative pt-0.5">
                <Avatar name={n.sender?.name || 'System'} size="md" />
                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-1 border border-slate-200 dark:border-slate-700 shadow-xs">
                  <NotificationIcon type={n.type} />
                </div>
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {n.title || 'Activity Update'}
                  </h4>
                  <span className="text-xs text-slate-400 shrink-0">
                    {n.createdAt ? new Date(n.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {n.message || n.text}
                </p>

                {n.targetSection && (
                  <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-1 group-hover:translate-x-1 transition-transform">
                    <span>Direct Open Task {n.targetSection}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </div>

              {!n.isRead && (
                <div className="shrink-0 flex items-center pt-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">
            You're all caught up! No notifications to show right now.
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;

