import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, Bell, CheckCircle2, MessageSquare, Briefcase, AlertCircle, Users, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import IconButton from '../ui/IconButton';
import Avatar from '../ui/Avatar';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import { cn } from '../../utils/cn';

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

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsNotifOpen(false);
        setIsProfileOpen(false);
      }
    };

    if (isNotifOpen || isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isNotifOpen, isProfileOpen]);

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
        <div className="flex items-center">
          {/* Desktop Search */}
          <div className="hidden sm:block w-[320px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
              <Input 
                placeholder="Search tasks, boards..." 
                className="pl-9 bg-canvas"
              />
            </div>
          </div>
          
          {/* Mobile Search Toggle */}
          <div className="sm:hidden">
            {isSearchExpanded ? (
              <div className="absolute inset-y-0 left-0 right-0 z-10 bg-surface flex items-center px-4">
                <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
                <Input 
                  placeholder="Search..." 
                  className="pl-9 w-full bg-canvas"
                  autoFocus
                  onBlur={() => setIsSearchExpanded(false)}
                />
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
