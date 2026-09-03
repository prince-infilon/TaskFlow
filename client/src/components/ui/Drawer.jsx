import React, { useEffect, useRef } from 'react';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';
import IconButton from './IconButton';

const Drawer = ({ 
  isOpen, 
  onClose, 
  title,
  children,
  className 
}) => {
  const overlayRef = useRef(null);
  const contentRef = useRef(null);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scrolling
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Trap focus basic implementation
  useEffect(() => {
    if (isOpen && contentRef.current) {
      contentRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "drawer-title" : undefined}
    >
      {/* Backdrop */}
      <div 
        ref={overlayRef}
        className="absolute inset-0 bg-[#0f172a]/40 animate-in fade-in duration-200"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      
      {/* Drawer Content */}
      <div 
        ref={contentRef}
        tabIndex="-1"
        className={cn(
          "relative w-full max-w-full sm:max-w-[480px] h-full bg-surface shadow-xl flex flex-col focus:outline-none animate-in slide-in-from-right duration-200",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          {title ? (
            <h2 id="drawer-title" className="text-h1 text-primary truncate pr-4">
              {title}
            </h2>
          ) : (
            <div />
          )}
          <IconButton 
            variant="ghost" 
            onClick={onClose} 
            aria-label="Close drawer"
            className="shrink-0"
          >
            <X className="w-5 h-5" />
          </IconButton>
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 hide-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Drawer;
