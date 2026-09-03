import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, Bell, CheckCircle2, MessageSquare, Briefcase, AlertCircle, Users, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import IconButton from '../ui/IconButton';
import Avatar from '../ui/Avatar';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import { cn } from '../../utils/cn';
import apiClient from '../../api/client';

const initialNotifications = [];

const NotificationIcon = ({ type }) => {
  switch(type) {
    case 'assignment': return <Briefcase className="w-4 h-4 text-accent-500" />;
    case 'comment': return <MessageSquare className="w-4 h-4 text-info-500" />;
    case 'status': return <CheckCircle2 className="w-4 h-4 text-success-500" />;
    case 'priority': return <AlertCircle className="w-4 h-4 text-warning-500" />;
    case 'invite': return <Users className="w-4 h-4 text-secondary" />;
    default: return <Bell className="w-4 h-4 text-secondary" />;
  }
};

const Header = ({ openMobileSidebar, pageTitle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const searchRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ boards: [], tasks: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const unreadCount = notifications.filter(n => !n.isRead).length;

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
          setSelectedIndex(-1); // Reset selection
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
        // Also collapse mobile search if clicking outside
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

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <header className="sticky top-0 z-30 h-[64px] bg-surface border-b border-border flex items-center justify-between px-4 lg:px-8">
      {/* Left Area */}
      <div className="flex items-center gap-4">
        {/* Mobile Hamburger */}
        <div className="lg:hidden">
          <IconButton variant="ghost" onClick={openMobileSidebar} aria-label="Open sidebar">
            <Menu className="w-5 h-5" />
          </IconButton>
        </div>
        
        {/* Page Title */}
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
          {/* Desktop Search */}
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
            
            {/* Desktop Search Results Dropdown */}
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
          
          {/* Mobile Search Toggle */}
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
                
                {/* Mobile Search Results */}
                {searchQuery.length >= 2 && (
                  <div className="flex-1 bg-surface overflow-y-auto h-[calc(100vh-64px)] absolute top-[64px] left-0 right-0 z-50">
                    {isSearching ? (
                      <div className="p-4 text-center text-small text-tertiary">Searching...</div>
                    ) : (
                      <>
                        {(searchResults?.boards?.length || 0) === 0 && (searchResults?.tasks?.length || 0) === 0 ? (
                          <div className="p-4 text-center text-small text-tertiary">No results found</div>
                        ) : (
                          <div className="py-2 pb-8">
                            {(searchResults?.boards?.length || 0) > 0 && (
                              <div className="mb-4">
                                <div className="px-4 py-1 text-xs font-semibold text-tertiary uppercase tracking-wider bg-canvas">Boards</div>
                                {searchResults.boards.map((board, idx) => {
                                  const isActive = idx === selectedIndex;
                                  return (
                                    <button 
                                      key={board._id}
                                      className={cn(
                                        "w-full text-left px-5 py-3 border-b border-border flex flex-col",
                                        isActive ? "bg-surface-muted" : "hover:bg-surface-muted"
                                      )}
                                      onClick={() => {
                                        navigate(`/app/boards/${board._id}`);
                                        setIsSearchExpanded(false);
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
                                <div className="px-4 py-1 text-xs font-semibold text-tertiary uppercase tracking-wider bg-canvas">Tasks</div>
                                {searchResults.tasks.map((task, idx) => {
                                  const boardCount = searchResults.boards.length;
                                  const isActive = (idx + boardCount) === selectedIndex;
                                  return (
                                    <button 
                                      key={task._id}
                                      className={cn(
                                        "w-full text-left px-5 py-3 border-b border-border flex flex-col",
                                        isActive ? "bg-surface-muted" : "hover:bg-surface-muted"
                                      )}
                                      onClick={() => {
                                        navigate(`/app/boards/${task.board?._id || task.board}`);
                                        setIsSearchExpanded(false);
                                        setSearchQuery('');
                                        setSelectedIndex(-1);
                                      }}
                                    >
                                      <span className="text-small font-medium text-primary">{task.title}</span>
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
            ) : (
              <IconButton variant="ghost" onClick={() => setIsSearchExpanded(true)} aria-label="Search">
                <Search className="w-5 h-5" />
              </IconButton>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="relative flex items-center justify-center" ref={notifRef}>
          <IconButton 
            variant="ghost" 
            aria-label="Notifications"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
          >
            <Bell className="w-5 h-5" />
          </IconButton>
          {unreadCount > 0 && (
            <Badge variant="unread" className="absolute top-1 right-1 text-[10px] px-1 min-w-[16px] h-[16px] flex items-center justify-center border border-surface pointer-events-none">
              {unreadCount}
            </Badge>
          )}

          {/* Dropdown Panel */}
          {isNotifOpen && (
            <div className="absolute top-full right-0 mt-2 w-[320px] sm:w-[380px] bg-surface border border-border shadow-lg rounded-md z-40 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between p-3 border-b border-border bg-canvas/30">
                <h3 className="text-body-medium font-medium text-primary">Notifications</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-small text-accent-600 hover:text-accent-700 focus:outline-none focus:underline"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              
              <div className="flex flex-col max-h-[360px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((n, i) => (
                    <div 
                      key={n.id}
                      className={cn(
                        "flex gap-3 p-3 cursor-pointer transition-colors hover:bg-surface-muted",
                        !n.isRead ? "bg-accent-50/30" : "",
                        i !== notifications.length - 1 ? "border-b border-border" : ""
                      )}
                      onClick={() => markAsRead(n.id)}
                    >
                      <div className="shrink-0 relative">
                        <Avatar name={n.user} size="sm" />
                        <div className="absolute -bottom-1 -right-1 bg-surface rounded-full p-0.5 border border-border shadow-sm">
                          <NotificationIcon type={n.type} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <p className="text-small text-primary leading-tight">
                          {n.text} <span className="font-medium text-primary truncate inline-block max-w-[200px] align-bottom">{n.target}</span>
                        </p>
                        <span className="text-[11px] text-tertiary">{n.time}</span>
                      </div>
                      {!n.isRead && (
                        <div className="shrink-0 flex items-center">
                          <div className="w-2 h-2 rounded-full bg-accent-500" />
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-small text-tertiary">
                    No notifications
                  </div>
                )}
              </div>

              <div className="border-t border-border bg-canvas/30 p-2 text-center">
                <Link 
                  to="/app/notifications" 
                  className="text-small font-medium text-primary hover:text-accent-600 focus:outline-none focus:underline w-full block py-1"
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
            className="flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded-full shrink-0 ml-1"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            <Avatar name={user?.name || "User"} size="md" />
          </button>

          {isProfileOpen && (
            <div className="absolute top-full right-0 mt-2 w-[200px] bg-surface border border-border shadow-lg rounded-md z-40 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3 border-b border-border bg-canvas/30">
                <p className="text-body-medium font-medium text-primary truncate">{user?.name || "User"}</p>
                <p className="text-small text-tertiary truncate">{user?.email || ""}</p>
              </div>
              <div className="p-1">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-small text-danger-600 hover:bg-danger-50 rounded-sm transition-colors text-left focus:outline-none"
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
