import React, { useEffect, useRef } from 'react';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';
import IconButton from './IconButton';

const Modal = ({ 
  isOpen, 
  onClose, 
  title,
  size = 'sm', // sm: 480px, md: 640px
  children,
  footer
}) => {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Scrim */}
      <div 
        className="fixed inset-0 bg-primary/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Scrollable Container wrapper to center modal safely */}
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Modal Dialog */}
        <div 
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className={cn(
            "relative bg-surface rounded-lg shadow-md flex flex-col w-full transform transition-all animate-in fade-in slide-in-from-bottom-1 duration-150 ease-out",
            size === 'sm' ? "max-w-[480px]" : "max-w-[640px]"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
            <h2 id="modal-title" className="text-h1 text-primary m-0">{title}</h2>
            <IconButton variant="ghost" onClick={onClose} aria-label="Close modal" className="-mr-2">
              <X className="w-5 h-5" />
            </IconButton>
          </div>

          {/* Body */}
          <div className="p-6">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="p-4 border-t border-border flex justify-end gap-3 bg-canvas/50 rounded-b-lg">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
