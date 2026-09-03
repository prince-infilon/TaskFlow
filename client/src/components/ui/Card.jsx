import React from 'react';
import { cn } from '../../utils/cn';

export const Card = ({ className, hoverable, children, ...props }) => {
  return (
    <div 
      className={cn(
        "bg-surface border border-border rounded-md overflow-hidden",
        hoverable && "transition-all duration-150 hover:border-border-strong hover:shadow-sm cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ className, children, ...props }) => (
  <div className={cn("px-4 pt-4 pb-2", className)} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ className, children, ...props }) => (
  <h3 className={cn("text-h2 text-primary", className)} {...props}>
    {children}
  </h3>
);

export const CardContent = ({ className, children, ...props }) => (
  <div className={cn("px-4 pb-4", className)} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ className, children, ...props }) => (
  <div className={cn("px-4 py-3 bg-surface-muted border-t border-border flex items-center", className)} {...props}>
    {children}
  </div>
);

export default Card;
