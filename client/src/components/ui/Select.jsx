import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';
import { ChevronDown, Check } from 'lucide-react';

const Select = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = 'Select...',
  className,
  disabled
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={cn("relative w-full text-body", className)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between h-[36px] w-full rounded-sm border border-border-strong bg-surface px-3 text-primary transition-colors focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500 focus:ring-opacity-20 disabled:bg-surface-muted disabled:text-tertiary disabled:border-transparent",
          !selectedOption && "text-tertiary"
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className="w-4 h-4 text-secondary shrink-0 ml-2" />
      </button>

      {isOpen && (
        <ul 
          className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-md shadow-sm py-2 max-h-60 overflow-auto focus:outline-none"
          role="listbox"
        >
          {options.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={value === option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={cn(
                "flex items-center h-[32px] px-3 cursor-pointer hover:bg-surface-muted transition-colors",
                value === option.value && "bg-accent-50"
              )}
            >
              <span className="flex-1 truncate">{option.label}</span>
              {value === option.value && <Check className="w-4 h-4 text-accent-600 shrink-0 ml-2" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Select;
