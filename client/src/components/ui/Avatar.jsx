import React from 'react';
import { cn } from '../../utils/cn';

// Helper to get initials
function getInitials(name) {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

// Simple hash for deterministic background
function getBgColor(name) {
  if (!name) return 'bg-inset';
  const colors = [
    'bg-surface-muted text-secondary',
    'bg-accent-50 text-accent-700',
    'bg-info-50 text-info-500',
    'bg-warning-50 text-warning-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const Avatar = ({ 
  src, 
  name, 
  size = 'md', 
  isOnline = false,
  className 
}) => {
  const sizes = {
    xs: "w-[20px] h-[20px] text-[10px]",
    sm: "w-[24px] h-[24px] text-[10px]",
    md: "w-[32px] h-[32px] text-caption",
    lg: "w-[40px] h-[40px] text-body-medium",
  };

  const indicatorSizes = {
    xs: "w-1.5 h-1.5",
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3 border-[2px]",
  };

  return (
    <div className={cn("relative inline-block rounded-full", sizes[size], className)}>
      {src ? (
        <img 
          src={src} 
          alt={name} 
          className="w-full h-full rounded-full object-cover bg-inset"
        />
      ) : (
        <div className={cn(
          "flex items-center justify-center w-full h-full rounded-full",
          getBgColor(name)
        )}>
          {getInitials(name)}
        </div>
      )}
      
      {isOnline && (
        <span 
          className={cn(
            "absolute bottom-0 right-0 bg-success-500 border-[1.5px] border-surface rounded-full",
            indicatorSizes[size]
          )} 
        />
      )}
    </div>
  );
};

export const AvatarGroup = ({ children, max = 3, className }) => {
  const avatars = React.Children.toArray(children);
  const visibleAvatars = avatars.slice(0, max);
  const excess = avatars.length - max;

  return (
    <div className={cn("flex items-center", className)}>
      {visibleAvatars.map((avatar, i) => (
        <div 
          key={i} 
          className="rounded-full border-2 border-surface -ml-2 first:ml-0 overflow-hidden"
          style={{ zIndex: visibleAvatars.length - i }}
        >
          {avatar}
        </div>
      ))}
      {excess > 0 && (
        <div 
          className="flex items-center justify-center rounded-full border-2 border-surface bg-inset text-secondary text-caption -ml-2 w-[32px] h-[32px]"
          style={{ zIndex: 0 }}
        >
          +{excess}
        </div>
      )}
    </div>
  );
};

export default Avatar;
