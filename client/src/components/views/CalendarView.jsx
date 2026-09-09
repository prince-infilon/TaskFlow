import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, Circle } from 'lucide-react';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';

const CalendarView = ({ tasks = [], onTaskClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Helper to format date to YYYY-MM-DD
  const formatYMD = (yearNum, monthNum, dayNum) => {
    const y = yearNum;
    const m = String(monthNum + 1).padStart(2, '0');
    const d = String(dayNum).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Normalize task dates to YYYY-MM-DD
  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach(task => {
      if (task.dueDate) {
        try {
          const dateObj = new Date(task.dueDate);
          if (!isNaN(dateObj.getTime())) {
            const key = dateObj.toISOString().split('T')[0];
            if (!map[key]) map[key] = [];
            map[key].push(task);
          }
        } catch (e) {
          // fallback string check
          const key = String(task.dueDate).split('T')[0];
          if (!map[key]) map[key] = [];
          map[key].push(task);
        }
      }
    });
    return map;
  }, [tasks]);

  // Generate full calendar grid including previous/next month padding days
  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];

    // 1. Prev Month Padding
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const prevDay = daysInPrevMonth - i;
      const prevMonthNum = month === 0 ? 11 : month - 1;
      const prevYearNum = month === 0 ? year - 1 : year;
      cells.push({
        dayNumber: prevDay,
        dateStr: formatYMD(prevYearNum, prevMonthNum, prevDay),
        isCurrentMonth: false,
        isToday: false
      });
    }

    // 2. Current Month Days
    const todayStr = new Date().toISOString().split('T')[0];
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const dateStr = formatYMD(year, month, day);
      cells.push({
        dayNumber: day,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr
      });
    }

    // 3. Next Month Padding to complete grid rows (35 or 42 cells)
    const totalCellsSoFar = cells.length;
    const targetTotalCells = totalCellsSoFar > 35 ? 42 : 35;
    const nextDaysNeeded = targetTotalCells - totalCellsSoFar;

    for (let day = 1; day <= nextDaysNeeded; day++) {
      const nextMonthNum = month === 11 ? 0 : month + 1;
      const nextYearNum = month === 11 ? year + 1 : year;
      cells.push({
        dayNumber: day,
        dateStr: formatYMD(nextYearNum, nextMonthNum, day),
        isCurrentMonth: false,
        isToday: false
      });
    }

    return cells;
  }, [year, month]);

  const getPriorityStyle = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-danger-50 text-danger-700 border-danger-200 hover:bg-danger-100';
      case 'medium':
        return 'bg-warning-50 text-warning-700 border-warning-200 hover:bg-warning-100';
      default:
        return 'bg-accent-50 text-accent-700 border-accent-200 hover:bg-accent-100';
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-canvas/50">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-accent-600" />
          <h2 className="text-h2 text-primary font-bold tracking-tight m-0">
            {monthNames[month]} <span className="text-secondary font-normal">{year}</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={goToToday} className="text-small font-medium">
            Today
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <IconButton variant="ghost" onClick={prevMonth} aria-label="Previous Month">
            <ChevronLeft className="w-5 h-5" />
          </IconButton>
          <IconButton variant="ghost" onClick={nextMonth} aria-label="Next Month">
            <ChevronRight className="w-5 h-5" />
          </IconButton>
        </div>
      </div>

      {/* Weekday Names */}
      <div className="grid grid-cols-7 border-b border-border bg-surface-muted/60 text-center select-none">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="py-2.5 text-[11px] font-semibold uppercase tracking-wider text-secondary">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr border-b border-border bg-border/20 gap-px overflow-y-auto">
        {calendarCells.map((cell, idx) => {
          const dayTasks = tasksByDate[cell.dateStr] || [];
          const maxVisible = 3;
          const visibleTasks = dayTasks.slice(0, maxVisible);
          const hiddenCount = dayTasks.length - maxVisible;

          return (
            <div
              key={`${cell.dateStr}-${idx}`}
              className={`flex flex-col p-2 bg-surface min-h-[110px] transition-colors relative ${
                !cell.isCurrentMonth ? 'bg-surface-muted/40 text-tertiary' : 'hover:bg-canvas/60'
              }`}
            >
              {/* Date Header */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center ${
                    cell.isToday
                      ? 'bg-accent-600 text-white shadow-sm font-bold'
                      : cell.isCurrentMonth
                      ? 'text-primary'
                      : 'text-tertiary'
                  }`}
                >
                  {cell.dayNumber}
                </span>
                {dayTasks.length > 0 && (
                  <span className="text-[10px] font-medium text-tertiary">
                    {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                  </span>
                )}
              </div>

              {/* Task Items */}
              <div className="flex-1 space-y-1.5 overflow-hidden">
                {visibleTasks.map((task) => (
                  <div
                    key={task.id || task._id}
                    onClick={() => onTaskClick(task)}
                    className={`group flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium cursor-pointer transition-all truncate shadow-2xs hover:shadow-xs ${getPriorityStyle(
                      task.priority
                    )}`}
                    title={`${task.title} (${task.priority || 'Medium'} Priority)`}
                  >
                    <span className="truncate flex-1">{task.title}</span>
                  </div>
                ))}

                {hiddenCount > 0 && (
                  <div 
                    onClick={() => onTaskClick(dayTasks[0])}
                    className="text-[10px] font-semibold text-accent-600 hover:text-accent-700 cursor-pointer pl-1"
                  >
                    +{hiddenCount} more...
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;
