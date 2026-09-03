import React from 'react';
import { cn } from '../../utils/cn';
import { AlertCircle } from 'lucide-react';

const Input = React.forwardRef(({ 
  className, 
  error,
  disabled,
  endAdornment,
  ...props 
}, ref) => {
  return (
    <div className="flex flex-col gap-1 w-full relative">
      <div className="relative flex items-center w-full">
        <input
          ref={ref}
        disabled={disabled}
        className={cn(
          "flex h-[36px] w-full rounded-sm border border-border-strong bg-surface px-3 text-body text-primary placeholder:text-tertiary transition-colors focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500 focus:ring-opacity-20 disabled:bg-surface-muted disabled:text-tertiary disabled:border-transparent",
          error && "border-danger-500 focus:border-danger-500 focus:ring-danger-500 focus:ring-opacity-20",
          className
        )}
        {...props}
      />
      {endAdornment && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center">
          {endAdornment}
        </div>
      )}
      </div>
      {error && (
        <span className="flex items-center text-small text-danger-500 mt-1">
          <AlertCircle className="w-3.5 h-3.5 mr-1" />
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
