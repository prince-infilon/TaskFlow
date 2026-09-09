import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle, Info, CheckCircle2, ShieldAlert } from 'lucide-react';

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'primary'
  isLoading = false
}) => {
  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <div className="w-10 h-10 rounded-full bg-danger-50 flex items-center justify-center text-danger-600 shrink-0"><AlertTriangle className="w-5 h-5" /></div>;
      case 'warning':
        return <div className="w-10 h-10 rounded-full bg-warning-50 flex items-center justify-center text-warning-600 shrink-0"><ShieldAlert className="w-5 h-5" /></div>;
      default:
        return <div className="w-10 h-10 rounded-full bg-accent-50 flex items-center justify-center text-accent-600 shrink-0"><Info className="w-5 h-5" /></div>;
    }
  };

  const getConfirmButtonVariant = () => {
    if (variant === 'danger') return 'bg-danger-600 hover:bg-danger-700 text-white border-transparent';
    if (variant === 'warning') return 'bg-warning-600 hover:bg-warning-700 text-white border-transparent';
    return 'primary';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button 
            variant={variant === 'primary' ? 'primary' : 'secondary'}
            className={getConfirmButtonVariant()}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        {getIcon()}
        <div className="space-y-1">
          <p className="text-body text-secondary leading-relaxed m-0">
            {message}
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
