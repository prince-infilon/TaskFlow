import React from 'react';
import { cn } from '../../utils/cn';

const Button = React.forwardRef(({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false,
  disabled,
  children,
  ...props 
}, ref) => {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-opacity-40 focus-visible:ring-offset-2 disabled:pointer-events-none rounded-sm";
  
  const variants = {
    primary: "bg-accent-600 text-on-accent hover:bg-accent-700 active:bg-accent-700 disabled:bg-inset disabled:text-tertiary",
    secondary: "bg-surface border border-border-strong text-primary hover:bg-surface-muted active:bg-surface-muted disabled:bg-inset disabled:text-tertiary",
    ghost: "bg-transparent text-primary hover:bg-surface-muted active:bg-surface-muted disabled:text-tertiary",
    destructive: "bg-danger-500 text-on-accent hover:bg-danger-500/90 active:bg-danger-500/90 disabled:bg-inset disabled:text-tertiary",
  };

  const sizes = {
    sm: "h-[28px] px-2 text-small",
    md: "h-[36px] px-3 text-body-medium",
    lg: "h-[40px] px-4 text-body-medium",
  };

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
