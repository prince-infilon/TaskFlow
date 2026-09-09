import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Menu, Search, Bell, CheckCircle2, MessageSquare, Briefcase, AlertCircle, Users, LogOut, Paperclip, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import IconButton from '../ui/IconButton';
import Avatar from '../ui/Avatar';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import { cn } from '../../utils/cn';
import apiClient from '../../api/client';
import { socket } from '../../api/socket';

const NotificationIcon = ({ type }) => {
  switch(type) {
    case 'task_assigned':
    case 'assignment': return <Briefcase className="w-4 h-4 text-indigo-500" />;
    case 'comment_added':
    case 'comment': return <MessageSquare className="w-4 h-4 text-blue-500" />;
    case 'attachment_added': return <Paperclip className="w-4 h-4 text-amber-500" />;
    case 'status_changed':
    case 'status': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case 'priority': return <AlertCircle className="w-4 h-4 text-red-500" />;
    case 'invite': return <Users className="w-4 h-4 text-purple-500" />;
    default: return <Bell className="w-4 h-4 text-indigo-500" />;
  }
};

const Header = ({ openMobileSidebar, pageTitle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const searchRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ boards: [], tasks: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Fetch real notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get('/notifications');
      const list = res.data?.data?.notifications || res.data?.notifications || [];
      const count = res.data?.data?.unreadCount ?? list.filter(n => !n.isRead).length;

      setNotifications(list);
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Listen to real-time socket notifications
    const handleNotification = (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    socket.on('notification_received', handleNotification);

    return () => {
      socket.off('notification_received', handleNotification);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const res = await apiClient.get(`/users/me/search?q=${encodeURIComponent(searchQuery)}`);
          if (res && res.data) {
            setSearchResults(res.data);
          } else {
            setSearchResults({ boards: [], tasks: [] });
          }
          setSelectedIndex(-1);
          setIsSearchDropdownOpen(true);
        } catch (err) {
          console.error("Search failed", err);
          setSearchResults({ boards: [], tasks: [] });
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults({ boards: [], tasks: [] });
        setIsSearchDropdownOpen(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchDropdownOpen(false);
        if (isSearchExpanded) setIsSearchExpanded(false);
      }
    };
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsNotifOpen(false);
        setIsProfileOpen(false);
        setIsSearchDropdownOpen(false);
        if (isSearchExpanded) setIsSearchExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isNotifOpen, isProfileOpen, isSearchExpanded]);

  const handleKeyDown = (e) => {
    const totalItems = (searchResults?.boards?.length || 0) + (searchResults?.tasks?.length || 0);
    if (totalItems === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < totalItems) {
        const flattened = [
          ...(searchResults?.boards || []).map(b => ({ ...b, type: 'board' })),
          ...(searchResults?.tasks || []).map(t => ({ ...t, type: 'task' }))
        ];
        const item = flattened[selectedIndex];
        if (item.type === 'board') {
          navigate(`/app/boards/${item._id}`);
        } else {
          navigate(`/app/boards/${item.board?._id || item.board}`);
        }
        setIsSearchDropdownOpen(false);
        setIsSearchExpanded(false);
        setSearchQuery('');
        setSelectedIndex(-1);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Click handler for deep navigation & mark as read
  const handleNotificationClick = async (notif) => {
    const notifId = notif._id || notif.id;
    try {
      if (!notif.isRead) {
        await apiClient.patch(`/notifications/${notifId}/read`);
        setNotifications(prev => prev.map(n => (n._id === notifId || n.id === notifId) ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }

    setIsNotifOpen(false);

    // Deep navigation to exact board, task, and target section!
    const boardId = notif.board?._id || notif.board;
    const taskId = notif.task?._id || notif.task;
    const targetSection = notif.targetSection || 'comments';

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
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-[64px] bg-canvas flex items-center justify-between px-4 lg:px-8 border-b border-slate-200/60 dark:border-slate-800/60">
      {/* Left Area */}
      <div className="flex items-center gap-4">
        <div className="lg:hidden">
          <IconButton variant="ghost" onClick={openMobileSidebar} aria-label="Open sidebar">
            <Menu className="w-5 h-5" />
          </IconButton>
        </div>
        
        <div className={cn(
          "text-h1 text-primary truncate",
          isSearchExpanded ? "hidden sm:block" : "block"
        )}>
          {pageTitle || "Dashboard"}
        </div>
      </div>

      {/* Right Area */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Search */}
        <div className="flex items-center" ref={searchRef}>
          <div className="hidden sm:block w-[320px] relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
              <Input 
                placeholder="Search tasks, boards..." 
                className="pl-9 bg-canvas"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchQuery.length >= 2) setIsSearchDropdownOpen(true); }}
                onKeyDown={handleKeyDown}
              />
            </div>
            
            {isSearchDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border shadow-lg rounded-md z-40 max-h-[400px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                {isSearching ? (
                  <div className="p-4 text-center text-small text-tertiary">Searching...</div>
                ) : (
                  <>
                    {(searchResults?.boards?.length || 0) === 0 && (searchResults?.tasks?.length || 0) === 0 ? (
                      <div className="p-4 text-center text-small text-tertiary">No results found</div>
                    ) : (
                      <div className="py-2">
                        {(searchResults?.boards?.length || 0) > 0 && (
                          <div className="mb-2">
                            <div className="px-3 py-1 text-xs font-semibold text-tertiary uppercase tracking-wider">Boards</div>
                            {searchResults.boards.map((board, idx) => {
                              const isActive = idx === selectedIndex;
                              return (
                                <button 
                                  key={board._id}
                                  className={cn(
                                    "w-full text-left px-4 py-2 flex flex-col focus:outline-none",
                                    isActive ? "bg-surface-muted" : "hover:bg-surface-muted"
                                  )}
                                  onClick={() => {
                                    navigate(`/app/boards/${board._id}`);
                                    setIsSearchDropdownOpen(false);
                                    setSearchQuery('');
                                    setSelectedIndex(-1);
                                  }}
                                >
                                  <span className="text-small font-medium text-primary">{board.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {(searchResults?.tasks?.length || 0) > 0 && (
                          <div>
                            <div className="px-3 py-1 text-xs font-semibold text-tertiary uppercase tracking-wider">Tasks</div>
                            {searchResults.tasks.map((task, idx) => {
                              const boardCount = searchResults.boards.length;
                              const isActive = (idx + boardCount) === selectedIndex;
                              return (
                                <button 
                                  key={task._id}
                                  className={cn(
                                    "w-full text-left px-4 py-2 flex flex-col focus:outline-none",
                                    isActive ? "bg-surface-muted" : "hover:bg-surface-muted"
                                  )}
                                  onClick={() => {
                                    navigate(`/app/boards/${task.board?._id || task.board}`);
                                    setIsSearchDropdownOpen(false);
                                    setSearchQuery('');
                                    setSelectedIndex(-1);
                                  }}
                                >
                                  <span className="text-small font-medium text-primary truncate max-w-[280px]">{task.title}</span>
                                  <span className="text-xs text-tertiary">in {task.board?.name || 'Board'}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          
          <div className="sm:hidden">
            {isSearchExpanded ? (
              <div className="absolute inset-y-0 left-0 right-0 z-10 bg-surface flex flex-col">
                <div className="flex items-center px-4 h-[64px] border-b border-border">
                  <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
                  <Input 
                    placeholder="Search..." 
                    className="pl-9 w-full bg-canvas"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <IconButton variant="ghost" className="ml-2" onClick={() => setIsSearchExpanded(false)}>
                    <Menu className="w-5 h-5 text-tertiary rotate-90" />
                  </IconButton>
                </div>
              </div>
            ) : (
              <IconButton variant="ghost" onClick={() => setIsSearchExpanded(true)} aria-label="Search">
                <Search className="w-5 h-5" />
              </IconButton>
            )}
          </div>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative flex items-center justify-center" ref={notifRef}>
          <IconButton 
            variant="ghost" 
            aria-label="Notifications"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900 animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </IconButton>

          {/* Live Notification Dropdown Panel */}
          {isNotifOpen && (
            <div className="absolute top-full right-0 mt-2 w-[340px] sm:w-[400px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              
              <div className="flex flex-col max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div 
                      key={n._id || n.id}
                      className={cn(
                        "flex gap-3 p-3.5 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60 group",
                        !n.isRead ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                      )}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className="shrink-0 relative">
                        <Avatar name={n.sender?.name || 'System'} size="sm" />
                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-xs border border-slate-200 dark:border-slate-700">
                          <NotificationIcon type={n.type} />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {n.title || 'Activity Update'}
                          </p>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {n.message || n.text}
                        </p>
                        {n.targetSection && (
                          <div className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mt-1 group-hover:translate-x-0.5 transition-transform">
                            <span>Open {n.targetSection}</span>
                            <ChevronRight className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      {!n.isRead && (
                        <div className="shrink-0 flex items-center">
                          <div className="w-2 h-2 rounded-full bg-indigo-600" />
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No notifications yet. You're all caught up!
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-2 text-center">
                <Link 
                  to="/app/notifications" 
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline w-full block py-1"
                  onClick={() => setIsNotifOpen(false)}
                >
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar */}
        <div className="relative flex items-center justify-center" ref={profileRef}>
          <button 
            className="flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-full shrink-0 ml-1"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            <Avatar name={user?.name || "User"} size="md" />
          </button>

          {isProfileOpen && (
            <div className="absolute top-full right-0 mt-2 w-[200px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{user?.name || "User"}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email || ""}</p>
              </div>
              <div className="p-1">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors text-left focus:outline-none font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

