import React, { useState, useRef } from 'react';
import { cn } from '../../utils/cn';

const Tooltip = ({ children, content, position = 'top', className }) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 400);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  // Simple arrow positioning
  const arrowClasses = {
    top: "bottom-[-4px] left-1/2 -translate-x-1/2",
    bottom: "top-[-4px] left-1/2 -translate-x-1/2 rotate-180",
    left: "right-[-4px] top-1/2 -translate-y-1/2 -rotate-90",
    right: "left-[-4px] top-1/2 -translate-y-1/2 rotate-90",
  };

  return (
    <div 
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      
      {isVisible && (
        <div className={cn(
          "absolute z-50 px-2 py-1 bg-primary text-small rounded-sm shadow-sm whitespace-nowrap animate-in fade-in duration-150 flex items-center justify-center",
          positionClasses[position],
          className
        )} role="tooltip" style={{ color: '#ffffff' }}>
          <span>{content}</span>
          {/* Arrow */}
          <div className={cn(
            "absolute w-2 h-2 bg-primary transform rotate-45",
            arrowClasses[position]
          )} />
        </div>
      )}
    </div>
  );
};

export default Tooltip;
