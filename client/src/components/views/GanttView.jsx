import React, { useState, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Layers, Clock, AlertCircle, CheckCircle2, CircleDashed } from 'lucide-react';
import IconButton from '../ui/IconButton';

const STATUS_CONFIG = {
  done: { label: 'Done', bg: 'bg-emerald-500', text: 'text-emerald-500', lightBg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 },
  in_progress: { label: 'In Progress', bg: 'bg-indigo-500', text: 'text-indigo-500', lightBg: 'bg-indigo-50', border: 'border-indigo-200', icon: Clock },
  in_review: { label: 'In Review', bg: 'bg-amber-500', text: 'text-amber-500', lightBg: 'bg-amber-50', border: 'border-amber-200', icon: CircleDashed },
  todo: { label: 'To Do', bg: 'bg-blue-500', text: 'text-blue-500', lightBg: 'bg-blue-50', border: 'border-blue-200', icon: CircleDashed },
};

const PRIORITY_CONFIG = {
  high: { label: 'High', dot: 'bg-red-500', border: 'border-red-400' },
  medium: { label: 'Medium', dot: 'bg-amber-500', border: 'border-amber-400' },
  low: { label: 'Low', dot: 'bg-slate-400', border: 'border-slate-300' },
};

const GanttView = ({ tasks = [], onTaskClick }) => {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 4);
    return d;
  });

  const [daysToView, setDaysToView] = useState(30);
  const leftPaneRef = useRef(null);
  const rightPaneRef = useRef(null);

  const handleScroll = (e) => {
    const target = e.target;
    if (target === leftPaneRef.current && rightPaneRef.current) {
      rightPaneRef.current.scrollTop = target.scrollTop;
    } else if (target === rightPaneRef.current && leftPaneRef.current) {
      leftPaneRef.current.scrollTop = target.scrollTop;
    }
  };

  const shiftDays = (days) => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + days);
    setStartDate(newDate);
  };

  const resetToToday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 4);
    setStartDate(d);
  };

  const dates = useMemo(() => {
    const arr = [];
    for (let i = 0; i < daysToView; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [startDate, daysToView]);

  const monthGroups = useMemo(() => {
    const groups = [];
    let currentMonth = null;
    let count = 0;

    dates.forEach((d) => {
      const monthYear = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (monthYear !== currentMonth) {
        if (currentMonth) {
          groups.push({ month: currentMonth, count });
        }
        currentMonth = monthYear;
        count = 1;
      } else {
        count++;
      }
    });

    if (currentMonth) {
      groups.push({ month: currentMonth, count });
    }

    return groups;
  }, [dates]);

  const processedTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return tasks.map(task => {
      let startStr = task.startDate;
      let endStr = task.dueDate;

      if (!startStr && !endStr) {
        startStr = task.createdAt ? new Date(task.createdAt).toISOString().split('T')[0] : todayStr;
        endStr = startStr;
      } else if (!startStr) {
        startStr = endStr;
      } else if (!endStr) {
        endStr = startStr;
      }

      const tStart = new Date(startStr);
      const tEnd = new Date(endStr);
      tStart.setHours(0, 0, 0, 0);
      tEnd.setHours(0, 0, 0, 0);

      if (tEnd < tStart) {
        tEnd.setTime(tStart.getTime());
      }

      return {
        ...task,
        effectiveStart: tStart,
        effectiveEnd: tEnd,
        startStr,
        endStr
      };
    }).sort((a, b) => a.effectiveStart.getTime() - b.effectiveStart.getTime());
  }, [tasks]);

  const gridStart = useMemo(() => {
    const d = new Date(startDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [startDate]);

  const cellWidth = 48;

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden text-slate-800">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Gantt Timeline</h2>
            <p className="text-xs text-slate-500">
              Showing {processedTasks.length} tasks across {daysToView} days
            </p>
          </div>
        </div>

        {/* Timeline controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            {[14, 30, 60].map(days => (
              <button
                key={days}
                onClick={() => setDaysToView(days)}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  daysToView === days
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-slate-200" />

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => shiftDays(-7)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
              title="Previous 7 Days"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={resetToToday}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Today
            </button>

            <button
              onClick={() => shiftDays(7)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
              title="Next 7 Days"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Task List Sidebar */}
        <div className="w-64 shrink-0 border-r border-slate-200 flex flex-col bg-white z-10 shadow-xs">
          <div className="h-[65px] border-b border-slate-200 flex items-center px-4 bg-slate-50 shrink-0 font-semibold text-xs text-slate-500 uppercase tracking-wider">
            <span>Task Title ({processedTasks.length})</span>
          </div>

          <div 
            ref={leftPaneRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto divide-y divide-slate-100 no-scrollbar"
          >
            {processedTasks.map(task => {
              const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
              const prioCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low;

              return (
                <div
                  key={task.id || task._id}
                  onClick={() => onTaskClick && onTaskClick(task)}
                  className="h-12 px-4 flex items-center gap-2.5 hover:bg-slate-50 cursor-pointer transition-colors group shrink-0"
                  title={task.title}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${prioCfg.dot}`} />
                  <span className="text-xs font-medium text-slate-800 truncate group-hover:text-indigo-600">
                    {task.title}
                  </span>
                </div>
              );
            })}

            {processedTasks.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-400">
                No tasks available
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Timeline Chart */}
        <div 
          ref={rightPaneRef}
          onScroll={handleScroll}
          className="flex-1 overflow-auto flex flex-col bg-slate-50/30"
        >
          <div className="inline-flex flex-col min-w-full">
            {/* Header: Months & Days */}
            <div className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 shrink-0">
              {/* Row 1: Month Groups */}
              <div className="flex border-b border-slate-200/80 h-7 text-xs font-bold text-slate-600">
                {monthGroups.map((group, i) => (
                  <div
                    key={i}
                    style={{ width: `${group.count * cellWidth}px` }}
                    className="shrink-0 px-3 flex items-center border-r border-slate-200 bg-slate-100/50 truncate text-[11px]"
                  >
                    {group.month}
                  </div>
                ))}
              </div>

              {/* Row 2: Day Columns */}
              <div className="flex h-9 text-[11px]">
                {dates.map((date, i) => {
                  const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                  return (
                    <div
                      key={i}
                      style={{ width: `${cellWidth}px` }}
                      className={`shrink-0 border-r border-slate-200 flex flex-col items-center justify-center ${
                        isToday
                          ? 'bg-indigo-50 text-indigo-600 font-bold'
                          : isWeekend
                          ? 'bg-slate-100/40 text-slate-400'
                          : 'text-slate-600'
                      }`}
                    >
                      <span className="text-[10px] font-medium leading-none">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span className={`text-xs mt-0.5 ${isToday ? 'bg-indigo-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]' : ''}`}>
                        {date.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timeline Task Rows & Bars */}
            <div className="relative flex-1">
              <div className="absolute inset-0 flex pointer-events-none">
                {dates.map((date, i) => {
                  const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                  return (
                    <div
                      key={i}
                      style={{ width: `${cellWidth}px` }}
                      className={`shrink-0 border-r border-slate-200/60 h-full ${
                        isToday
                          ? 'bg-indigo-500/5 border-r-2 border-r-indigo-500/50'
                          : isWeekend
                          ? 'bg-slate-100/30'
                          : ''
                      }`}
                    />
                  );
                })}
              </div>

              {/* Task Bars */}
              <div className="divide-y divide-slate-100 relative z-10">
                {processedTasks.map((task) => {
                  const startDiff = Math.floor((task.effectiveStart - gridStart) / (1000 * 60 * 60 * 24));
                  const duration = Math.max(1, Math.floor((task.effectiveEnd - task.effectiveStart) / (1000 * 60 * 60 * 24)) + 1);

                  const leftPx = startDiff * cellWidth;
                  const widthPx = duration * cellWidth;

                  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;

                  const isVisible = startDiff + duration > 0 && startDiff < daysToView;

                  return (
                    <div key={task.id || task._id} className="h-12 relative flex items-center">
                      {isVisible && (
                        <div
                          onClick={() => onTaskClick && onTaskClick(task)}
                          style={{
                            left: `${Math.max(4, leftPx + 2)}px`,
                            width: `${Math.max(36, widthPx - 4)}px`,
                          }}
                          className={`absolute h-7 rounded-lg px-2.5 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md ${statusCfg.bg} text-white shadow-xs z-10 group overflow-hidden`}
                          title={`${task.title} | ${statusCfg.label} | ${task.startStr} -> ${task.endStr}`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 pr-1">
                            <span className="text-xs font-semibold truncate leading-tight">
                              {task.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 text-[10px] font-medium opacity-90">
                            <span className="hidden sm:inline bg-black/20 px-1.5 py-0.5 rounded text-[9px] font-mono">
                              {duration}d
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttView;
