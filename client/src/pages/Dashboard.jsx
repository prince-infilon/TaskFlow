import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Calendar } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Avatar, { AvatarGroup } from '../components/ui/Avatar';
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';

const StatTile = ({ title, count, colorClass, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-surface border border-border border-l-4 ${colorClass} rounded-md p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col`}
    >
      <span className="text-display text-primary font-bold leading-none mb-1">{count}</span>
      <span className="text-small text-secondary">{title}</span>
    </div>
  );
};

const Dashboard = () => {
  const [boards, setBoards] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({ dueToday: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.name?.split(' ')[0] || "User";
  
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [boardsRes, dashRes] = await Promise.all([
          apiClient.get('/boards'),
          apiClient.get('/users/me/dashboard')
        ]);
        setBoards(boardsRes.data.boards);
        setTasks(dashRes.data.recentTasks);
        setActivities(dashRes.data.recentActivity);
        setStats({ dueToday: dashRes.data.tasksDueToday });
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Greeting Section */}
      <section>
        <h1 className="text-display text-primary tracking-tight">Good morning, {firstName}</h1>
        <p className="text-small text-secondary mt-1">
          It's {today}. You have {stats.dueToday} tasks due today.
        </p>
      </section>

      {/* 2. Compact Statistic Tiles */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatTile 
            title="Due Today" 
            count={stats.dueToday.toString()} 
            colorClass="border-l-warning-500" 
            onClick={() => console.log('Navigate to Due Today')}
          />
          <StatTile 
            title="Recent Tasks" 
            count={tasks.length.toString()} 
            colorClass="border-l-accent-600" 
            onClick={() => console.log('Navigate to In Progress')}
          />
          <StatTile 
            title="Recent Activity" 
            count={activities.length.toString()} 
            colorClass="border-l-success-500" 
            onClick={() => console.log('Navigate to Completed')}
          />
        </div>
      </section>

      {/* 3. My Tasks */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h2 text-primary">My Tasks</h2>
          <Link to="/tasks" className="text-small text-accent-600 hover:text-accent-700 font-medium focus:outline-none focus:underline">
            View all
          </Link>
        </div>
        <div className="bg-surface border border-border rounded-md shadow-sm overflow-hidden flex flex-col">
          {tasks.length === 0 ? (
            <div className="p-4 text-small text-tertiary">No assigned tasks.</div>
          ) : tasks.map((task, index) => (
            <div 
              key={task._id}
              className={`flex items-center justify-between p-3 sm:p-4 hover:bg-surface-muted transition-colors cursor-pointer ${index !== tasks.length - 1 ? 'border-b border-border' : ''}`}
              onClick={() => navigate(`/app/boards/${task.board?._id}`)}
            >
              {/* Left side: Title and Board */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 flex-1 min-w-0 pr-4">
                <span className="text-body-medium text-primary truncate">{task.title}</span>
                <span className="text-caption text-secondary bg-surface-muted px-2 py-0.5 rounded-sm truncate w-max">
                  {task.board?.name}
                </span>
              </div>
              
              {/* Right side: Priority, Date, Avatar */}
              <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                <Badge variant={task.priority} className="hidden sm:inline-flex capitalize">
                  {task.priority}
                </Badge>
                
                <div className={`flex items-center gap-1.5 text-small text-tertiary`}>
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}</span>
                </div>
                
                <Avatar name={task.assignee?.name || 'Unassigned'} size="sm" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h2 text-primary">Recent Activity</h2>
          <Link to="/app/activity" className="text-small text-accent-600 hover:text-accent-700 font-medium focus:outline-none focus:underline">
            View all
          </Link>
        </div>
        <div className="bg-surface border border-border rounded-md shadow-sm overflow-hidden flex flex-col">
          {activities.length === 0 ? (
            <div className="p-4 text-small text-tertiary">No recent activity.</div>
          ) : activities.map((activity, index) => {
            const date = new Date(activity.createdAt).toLocaleDateString();
            return (
              <div 
                key={activity._id}
                className={`flex items-center gap-3 p-3 sm:p-4 hover:bg-surface-muted transition-colors cursor-pointer ${index !== activities.length - 1 ? 'border-b border-border' : ''}`}
                onClick={() => navigate(`/app/boards/${activity.board?._id}`)}
              >
                <div className="shrink-0">
                  <Avatar name={activity.user?.name || 'Unknown'} size="md" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body text-primary truncate leading-tight">
                    <span className="font-medium mr-1">{activity.user?.name || 'Unknown'}</span>
                    <span className="text-secondary">{activity.action.replace(/_/g, ' ')}</span>
                    <span className="font-medium mx-1">{activity.metadata?.taskTitle || activity.metadata?.originalFilename || ''}</span>
                  </p>
                  {activity.board?.name && (
                    <p className="text-small text-tertiary truncate mt-0.5">
                      in {activity.board.name}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-small text-tertiary whitespace-nowrap pl-2">
                  {date}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. My Boards */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h2 text-primary">My Boards</h2>
          <Link to="/boards" className="text-small text-accent-600 hover:text-accent-700 font-medium focus:outline-none focus:underline">
            View all
          </Link>
        </div>
        
        {/* Horizontal scroll on mobile/tablet, grid on desktop to avoid overflow */}
        <div className="flex overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0 lg:pb-0 lg:grid lg:grid-cols-4 gap-4 hide-scrollbar">
          {isLoading ? (
            <div className="text-small text-tertiary">Loading boards...</div>
          ) : boards.length === 0 ? (
            <div className="text-small text-tertiary">No boards found. Create one to get started!</div>
          ) : boards.map(board => (
            <Card 
              key={board._id} 
              hoverable 
              className="flex-shrink-0 w-[260px] lg:w-auto flex flex-col cursor-pointer"
              onClick={() => navigate(`/app/boards/${board._id}`)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="truncate">{board.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                <p className="text-small text-secondary line-clamp-2 min-h-[36px]">
                  {board.description || 'No description provided.'}
                </p>
                
                {/* Progress Indicator placeholder since tasks aren't linked yet */}
                <div className="space-y-1.5 mt-auto">
                  <div className="flex items-center justify-between text-caption">
                    <span className="text-tertiary">Progress</span>
                    <span className="font-medium text-secondary">0%</span>
                  </div>
                  <div className="w-full h-1.5 bg-inset rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent-600 rounded-full" 
                      style={{ width: '0%' }}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-between bg-transparent border-none pt-0 pb-4">
                <AvatarGroup max={3}>
                  <Avatar name="Owner" size="sm" />
                </AvatarGroup>
                <span className="text-[11px] text-tertiary">
                  Updated {new Date(board.updatedAt).toLocaleDateString()}
                </span>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
