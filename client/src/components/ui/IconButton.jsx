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
    ghost: "bg-transparent text-secondary hover:bg-neutral-100 hover:text-primary active:bg-neutral-200 disabled:text-neutral-400",
    secondary: "bg-white border border-border text-primary hover:bg-neutral-50 active:bg-neutral-100 disabled:bg-neutral-100 disabled:text-neutral-400",
    primary: "bg-black text-white hover:bg-neutral-800 active:bg-neutral-900 disabled:bg-neutral-200 disabled:text-neutral-400 shadow-sm",
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
