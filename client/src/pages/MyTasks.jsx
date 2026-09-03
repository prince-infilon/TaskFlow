import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import Card, { CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { Calendar, Paperclip, MessageSquare } from 'lucide-react';
import Button from '../components/ui/Button';

const MyTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const navigate = useNavigate();

  const fetchTasks = async (isLoadMore = false) => {
    try {
      setIsLoading(true);
      const currentPage = isLoadMore ? page + 1 : 1;
      const res = await apiClient.get(`/users/me/tasks?page=${currentPage}&limit=20`);
      
      const newTasks = res.data.tasks;
      if (isLoadMore) {
        setTasks(prev => [...prev, ...newTasks]);
      } else {
        setTasks(newTasks);
      }
      
      setPage(res.data.pagination.page);
      setHasMore(res.data.pagination.page < res.data.pagination.totalPages);
    } catch (err) {
      setError('Failed to load your tasks.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  if (isLoading && tasks.length === 0) {
    return <div className="p-8 text-secondary">Loading tasks...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <section>
        <h1 className="text-display text-primary tracking-tight">My Tasks</h1>
        <p className="text-small text-secondary mt-1">Tasks assigned to you across all boards.</p>
      </section>

      {error && <div className="text-danger-500">{error}</div>}

      <section>
        {tasks.length === 0 && !error ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-surface">
            <h3 className="text-h3 text-primary mb-2">You're all caught up!</h3>
            <p className="text-body text-secondary">No tasks are currently assigned to you.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tasks.map(task => {
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.column?.name !== 'Done';
              
              return (
                <Card 
                  key={task._id} 
                  hoverable 
                  className="cursor-pointer flex flex-col h-full"
                  onClick={() => navigate(`/app/boards/${task.board?._id}`)}
                >
                  <CardContent className="p-4 flex flex-col flex-1 gap-3">
                    <div className="flex justify-between items-start">
                      <Badge variant={task.priority} className="capitalize text-[10px] px-1.5 py-0.5">
                        {task.priority}
                      </Badge>
                      <span className="text-[10px] font-medium text-tertiary uppercase tracking-wider bg-surface-muted px-2 py-0.5 rounded truncate max-w-[120px]">
                        {task.board?.name || 'Unknown Board'}
                      </span>
                    </div>

                    <h4 className="text-body-medium text-primary line-clamp-2 leading-snug">
                      {task.title}
                    </h4>

                    {task.description && (
                      <p className="text-small text-secondary line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="mt-auto pt-2 flex items-center justify-between text-small text-tertiary">
                      {task.dueDate && (
                        <div className={`flex items-center gap-1 ${isOverdue ? 'text-danger-500 font-medium' : ''}`}>
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-[11px]">{new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3 ml-auto">
                        <div className="flex items-center gap-1">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span className="text-[11px]">{task.attachments?.length || task.attachments || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="text-[11px]">{task.comments?.length || task.comments || 0}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        
        {hasMore && (
          <div className="mt-8 flex justify-center">
            <Button variant="secondary" onClick={() => fetchTasks(true)} isLoading={isLoading}>
              Load More
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};

export default MyTasks;
