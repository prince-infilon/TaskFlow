import React from 'react';
import { cn } from '../../utils/cn';

const IconButton = React.forwardRef(({ 
  className, 
  variant = 'ghost',
  disabled,
  children,
  'aria-label': ariaLabel,
  ...props 
}, ref) => {
  const baseStyles = "inline-flex items-center justify-center w-[32px] h-[32px] rounded-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-opacity-40 focus-visible:ring-offset-2 disabled:pointer-events-none";
  
  const variants = {
    ghost: "bg-transparent text-secondary hover:bg-surface-muted active:bg-surface-muted disabled:text-tertiary",
    secondary: "bg-surface border border-border-strong text-secondary hover:bg-surface-muted active:bg-surface-muted disabled:bg-inset disabled:text-tertiary",
    primary: "bg-accent-600 text-on-accent hover:bg-accent-700 active:bg-accent-700 disabled:bg-inset disabled:text-tertiary",
  };

  return (
    <button
      ref={ref}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
});

IconButton.displayName = 'IconButton';
export default IconButton;
