import React from 'react';
import { cn } from '../../utils/cn';
import Button from './Button';

const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  className 
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center p-8", className)}>
      {Icon && (
        <div className="text-tertiary mb-4">
          <Icon className="w-12 h-12 stroke-[1.5]" />
        </div>
      )}
      <h3 className="text-h2 text-primary mb-2">{title}</h3>
      {description && (
        <p className="text-small text-secondary max-w-sm mb-6">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
