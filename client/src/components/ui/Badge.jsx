import React from 'react';
import { cn } from '../../utils/cn';

const Badge = ({ 
  children, 
  variant = 'neutral',
  className,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center px-2 py-1 rounded-sm text-caption tracking-[0.02em] font-medium leading-none";
  
  const variants = {
    neutral: "bg-inset text-primary",
    unread: "bg-accent-600 text-on-accent rounded-full px-1.5",
    
    // Priorities
    low: "bg-surface-muted text-secondary", // Slate 100/500 equivalent approx. we'll just use mapped colors if possible, but the spec says Low: bg slate-100, text slate-500
    medium: "bg-warning-50 text-warning-500",
    high: "bg-danger-50 text-danger-500",
    
    // Statuses
    todo: "bg-surface-muted text-secondary",
    inProgress: "bg-accent-50 text-accent-600",
    done: "bg-success-50 text-success-500",
  };

  return (
    <span className={cn(baseStyles, variants[variant], className)} {...props}>
      {children}
    </span>
  );
};

export default Badge;
