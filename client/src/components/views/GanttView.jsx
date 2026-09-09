import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import IconButton from '../ui/IconButton';

const GanttView = ({ tasks, onTaskClick }) => {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 5);
    return d;
  });

  const shiftDays = (days) => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + days);
    setStartDate(newDate);
  };

  const daysToView = 30;

  const dates = useMemo(() => {
    const arr = [];
    for (let i = 0; i < daysToView; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [startDate]);

  const sortedTasks = useMemo(() => {
    // Only tasks with at least a start or due date
    return [...tasks].filter(t => t.startDate || t.dueDate).sort((a, b) => {
      const aStart = a.startDate || a.dueDate;
      const bStart = b.startDate || b.dueDate;
      return new Date(aStart).getTime() - new Date(bStart).getTime();
    });
  }, [tasks]);

  return (
    <div className="flex flex-col h-full bg-surface border border-border rounded-lg overflow-hidden">
      {/* Header controls */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-body-medium font-bold text-primary">
          Timeline
        </h2>
        <div className="flex items-center gap-2">
          <IconButton variant="ghost" onClick={() => shiftDays(-7)}>
            <ChevronLeft className="w-5 h-5" />
          </IconButton>
          <button 
            className="text-small text-secondary hover:text-primary font-medium px-2"
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 5);
              setStartDate(d);
            }}
          >
            Today
          </button>
          <IconButton variant="ghost" onClick={() => shiftDays(7)}>
            <ChevronRight className="w-5 h-5" />
          </IconButton>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex">
        {/* Left pane: Task list */}
        <div className="w-[250px] shrink-0 border-r border-border bg-surface flex flex-col">
          <div className="h-10 border-b border-border flex items-center px-4 bg-surface-muted shrink-0">
            <span className="text-small font-medium text-secondary">Task</span>
          </div>
          <div className="flex-1">
            {sortedTasks.map(task => (
              <div 
                key={task.id} 
                className="h-12 border-b border-border flex items-center px-4 hover:bg-surface-muted cursor-pointer truncate text-small text-primary"
                onClick={() => onTaskClick(task)}
                title={task.title}
              >
                {task.title}
              </div>
            ))}
          </div>
        </div>

        {/* Right pane: Timeline Grid */}
        <div className="flex-1 overflow-x-auto">
          <div className="inline-flex flex-col min-w-full">
            {/* Timeline Header (Dates) */}
            <div className="flex h-10 border-b border-border bg-surface-muted shrink-0">
              {dates.map((date, i) => {
                const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                return (
                  <div 
                    key={i} 
                    className={`w-12 shrink-0 border-r border-border flex flex-col items-center justify-center ${isToday ? 'bg-accent-50' : ''}`}
                  >
                    <span className={`text-[10px] ${isToday ? 'text-accent-600 font-bold' : 'text-tertiary'}`}>
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className={`text-[11px] font-medium ${isToday ? 'text-accent-700' : 'text-secondary'}`}>
                      {date.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Timeline Body (Bars) */}
            <div className="flex-1 relative">
              {/* Vertical Grid Lines */}
              <div className="absolute inset-0 flex pointer-events-none">
                {dates.map((date, i) => {
                  const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                  return (
                    <div 
                      key={i} 
                      className={`w-12 shrink-0 border-r border-border h-full ${isToday ? 'bg-accent-50/30' : ''}`} 
                    />
                  );
                })}
              </div>

              {/* Task Bars */}
              {sortedTasks.map((task, rowIndex) => {
                const tStartStr = task.startDate || task.dueDate;
                const tEndStr = task.dueDate || task.startDate;
                
                if (!tStartStr || !tEndStr) {
                  return <div key={task.id} className="h-12 border-b border-border" />;
                }

                const tStart = new Date(tStartStr);
                const tEnd = new Date(tEndStr);
                
                // Zero out time for date diffing
                tStart.setHours(0,0,0,0);
                tEnd.setHours(0,0,0,0);
                
                const gridStart = new Date(startDate);
                gridStart.setHours(0,0,0,0);

                const startDiff = Math.floor((tStart - gridStart) / (1000 * 60 * 60 * 24));
                const length = Math.max(1, Math.floor((tEnd - tStart) / (1000 * 60 * 60 * 24)) + 1);

                // Check if task is visible
                const isVisible = startDiff + length > 0 && startDiff < daysToView;

                return (
                  <div key={task.id} className="h-12 border-b border-border relative flex items-center">
                    {isVisible && (
                      <div 
                        className="absolute h-6 bg-accent-500 rounded-sm shadow-sm opacity-90 cursor-pointer hover:opacity-100 hover:bg-accent-600 transition-colors z-10"
                        style={{
                          left: `${Math.max(0, startDiff * 48)}px`, // 48px is w-12
                          width: `${Math.min((daysToView - Math.max(0, startDiff)) * 48, length * 48 - (startDiff < 0 ? Math.abs(startDiff)*48 : 0))}px`
                        }}
                        onClick={() => onTaskClick(task)}
                        title={`${task.title} (${tStartStr} to ${tEndStr})`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttView;
