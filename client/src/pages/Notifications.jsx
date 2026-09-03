import React, { useState } from 'react';
import { CheckCircle2, MessageSquare, Briefcase, AlertCircle, Users, Bell } from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import { cn } from '../utils/cn';

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

const Notifications = () => {
  const [notifications, setNotifications] = useState(initialNotifications);

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-[800px] mx-auto w-full animate-in fade-in duration-300 pb-12">
      
      {/* Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-h1 text-primary">Notifications</h1>
          <p className="text-body text-secondary">
            Stay up to date with activity assigned to or involving you.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" onClick={markAllAsRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notifications Feed */}
      <div className="bg-surface border border-border rounded-md shadow-sm overflow-hidden flex flex-col divide-y divide-border">
        {notifications.length > 0 ? (
          notifications.map((n) => (
            <div 
              key={n.id}
              className={cn(
                "flex gap-4 p-4 transition-colors hover:bg-surface-muted cursor-pointer",
                !n.isRead ? "bg-accent-50/30" : ""
              )}
              onClick={() => markAsRead(n.id)}
            >
              <div className="shrink-0 relative pt-0.5">
                <Avatar name={n.user} size="md" />
                <div className="absolute -bottom-1 -right-1 bg-surface rounded-full p-0.5 border border-border shadow-sm">
                  <NotificationIcon type={n.type} />
                </div>
              </div>
              <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4">
                <div className="min-w-0 flex flex-col gap-0.5">
                  <p className="text-body text-primary leading-snug">
                    {n.text}{' '}
                    <span className="font-medium inline-block max-w-[280px] truncate align-bottom">
                      {n.target}
                    </span>
                  </p>
                  <span className="text-small text-tertiary">{n.time}</span>
                </div>
                {!n.isRead && (
                  <div className="shrink-0 flex items-center pt-1.5 sm:pt-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-accent-500" />
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-body text-tertiary">
            You're all caught up! No notifications to show.
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
