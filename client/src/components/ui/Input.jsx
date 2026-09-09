import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

const Input = React.forwardRef(({ 
  className, 
  error,
  disabled,
  label,
  required,
  type = 'text',
  endAdornment,
  ...props 
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordType = type === 'password';
  const effectiveType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="flex flex-col gap-1 w-full relative">
      {label && (
        <label className="text-xs font-semibold text-primary flex items-center justify-between">
          <span>
            {label} {required && <span className="text-danger-500">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center w-full">
        <input
          ref={ref}
          disabled={disabled}
          type={effectiveType}
          className={cn(
            "flex h-[36px] w-full rounded-md border border-border-strong bg-surface px-3 text-body text-primary placeholder:text-tertiary transition-colors focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500 focus:ring-opacity-20 disabled:bg-surface-muted disabled:text-tertiary disabled:border-transparent",
            (isPasswordType || endAdornment) && "pr-10",
            error && "border-danger-500 focus:border-danger-500 focus:ring-danger-500 focus:ring-opacity-20",
            className
          )}
          {...props}
        />

        {isPasswordType ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary hover:text-primary focus:outline-none transition-colors p-1"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        ) : endAdornment ? (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center">
            {endAdornment}
          </div>
        ) : null}
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
