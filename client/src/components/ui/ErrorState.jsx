import React from 'react';
import { cn } from '../../utils/cn';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

const ErrorState = ({ 
  title = "Something went wrong", 
  description = "We couldn't load this content.", 
  onRetry,
  fullPage = false,
  className 
}) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center p-8", 
      fullPage && "min-h-[60vh]",
      className
    )}>
      <div className="text-danger-500 mb-4">
        <AlertTriangle className="w-12 h-12 stroke-[1.5]" />
      </div>
      <h3 className="text-h2 text-primary mb-2">{title}</h3>
      <p className="text-small text-secondary max-w-sm mb-6">{description}</p>
      
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {fullPage ? "Reload" : "Retry"}
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
