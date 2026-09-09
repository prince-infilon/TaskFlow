import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import IconButton from '../ui/IconButton';

const CalendarView = ({ tasks, onTaskClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null); // Empty slots for offset
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Group tasks by date
  const tasksByDate = {};
  tasks.forEach(task => {
    if (task.dueDate) {
      if (!tasksByDate[task.dueDate]) tasksByDate[task.dueDate] = [];
      tasksByDate[task.dueDate].push(task);
    }
  });

  return (
    <div className="flex flex-col h-full bg-surface border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-body-medium font-bold text-primary">
          {monthNames[month]} {year}
        </h2>
        <div className="flex items-center gap-2">
          <IconButton variant="ghost" onClick={prevMonth}>
            <ChevronLeft className="w-5 h-5" />
          </IconButton>
          <IconButton variant="ghost" onClick={nextMonth}>
            <ChevronRight className="w-5 h-5" />
          </IconButton>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-border bg-surface-muted">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-small font-medium text-secondary">
            {day}
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
        {days.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="border-r border-b border-border bg-canvas/50 min-h-[100px]" />;
          
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayTasks = tasksByDate[dateStr] || [];
          const isToday = dateStr === new Date().toISOString().split('T')[0];

          return (
            <div key={`day-${day}`} className="border-r border-b border-border p-2 min-h-[100px] hover:bg-surface-muted transition-colors">
              <div className={`text-small font-medium mb-1 ${isToday ? 'w-6 h-6 rounded-full bg-primary text-surface flex items-center justify-center' : 'text-secondary'}`}>
                {day}
              </div>
              <div className="space-y-1 overflow-y-auto max-h-[100px] hide-scrollbar">
                {dayTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className="text-[10px] px-1.5 py-1 rounded bg-accent-50 border border-accent-100 text-accent-700 truncate cursor-pointer hover:bg-accent-100"
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;
