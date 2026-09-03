import React from 'react';
import { cn } from '../../utils/cn';

export const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-sm bg-inset",
        className
      )}
      {...props}
    />
  );
};

export const SkeletonCard = ({ className }) => {
  return (
    <div className={cn("bg-surface border border-border rounded-md p-4 flex flex-col gap-3", className)}>
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="mt-2 flex justify-between items-center">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
};

export default Skeleton;
