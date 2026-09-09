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
  const baseStyles = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-opacity-40 focus-visible:ring-offset-2 disabled:pointer-events-none rounded-md";
  
  const variants = {
    primary: "bg-black text-white hover:bg-neutral-800 active:bg-neutral-900 disabled:bg-neutral-200 disabled:text-neutral-500 shadow-sm",
    secondary: "bg-white border border-border text-primary hover:bg-neutral-50 active:bg-neutral-100 disabled:bg-neutral-100 disabled:text-neutral-400",
    outline: "bg-transparent border border-border text-primary hover:bg-neutral-50 active:bg-neutral-100 disabled:text-neutral-400",
    ghost: "bg-transparent text-primary hover:bg-neutral-100 active:bg-neutral-200 disabled:text-neutral-400",
    destructive: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-neutral-200 disabled:text-neutral-500 shadow-sm",
  };

  const sizes = {
    sm: "h-[30px] px-2.5 text-xs",
    md: "h-[36px] px-3.5 text-sm",
    lg: "h-[40px] px-4 text-sm",
  };

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(baseStyles, variants[variant] || variants.primary, sizes[size] || sizes.md, className)}
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
