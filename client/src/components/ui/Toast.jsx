import React, { useEffect } from 'react';
import { cn } from '../../utils/cn';
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import IconButton from './IconButton';

const Toast = ({ 
  id,
  type = 'info', // success, warning, danger, info
  message, 
  onClose,
  duration = 4000,
  action,
  className
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const typeStyles = {
    success: { bar: 'bg-success-500', icon: <CheckCircle className="w-5 h-5 text-success-500" /> },
    warning: { bar: 'bg-warning-500', icon: <AlertTriangle className="w-5 h-5 text-warning-500" /> },
    danger: { bar: 'bg-danger-500', icon: <XCircle className="w-5 h-5 text-danger-500" /> },
    info: { bar: 'bg-info-500', icon: <Info className="w-5 h-5 text-info-500" /> },
  };

  const style = typeStyles[type] || typeStyles.info;

  return (
    <div 
      className={cn(
        "relative flex items-start w-full max-w-[360px] p-4 bg-surface border border-border rounded-md shadow-md overflow-hidden pointer-events-auto animate-in slide-in-from-right-8 fade-in duration-200",
        className
      )}
      role="alert"
    >
      {/* Accent Bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-[3px]", style.bar)} />
      
      <div className="flex-shrink-0 mr-3">
        {style.icon}
      </div>

      <div className="flex-1 flex flex-col pt-0.5">
        <p className="text-body text-primary">{message}</p>
        {action && (
          <button 
            onClick={action.onClick}
            className="mt-2 text-small font-medium text-accent-600 hover:text-accent-700 self-start focus:outline-none focus:underline"
          >
            {action.label}
          </button>
        )}
      </div>

      <IconButton 
        variant="ghost" 
        className="ml-4 -mt-1 -mr-2 w-7 h-7 flex-shrink-0 text-tertiary hover:text-secondary" 
        onClick={() => onClose(id)}
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </IconButton>
    </div>
  );
};

// Simple Toast Container example layout
export const ToastContainer = ({ children }) => {
  return (
    <div className="fixed bottom-0 right-0 z-50 p-6 flex flex-col gap-3 pointer-events-none sm:items-end w-full sm:max-w-md">
      {children}
    </div>
  );
};

export default Toast;
