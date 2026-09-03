import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import apiClient from '../api/client';

const getActionMessage = (act) => {
  const meta = act.metadata || {};
  switch (act.action) {
    case 'board_created': return { text: 'created board', target: meta.boardName || '' };
    case 'member_added': return { text: 'added member', target: meta.addedEmail || '', detail: `as ${meta.role}` };
    case 'member_role_changed': return { text: 'changed role of member to', target: meta.newRole || '' };
    case 'member_removed': return { text: 'removed a member', target: '' };
    case 'task_created': return { text: 'created a new task', target: meta.taskTitle || '' };
    case 'task_moved': return { text: 'moved task', target: meta.taskTitle || '' };
    case 'task_assigned': return { text: 'assigned task', target: meta.taskTitle || '' };
    case 'task_updated': return { text: 'updated task', target: meta.taskTitle || '' };
    case 'task_deleted': return { text: 'deleted task', target: meta.taskTitle || '' };
    case 'comment_created': return { text: 'added a comment', target: '' };
    case 'comment_deleted': return { text: 'deleted a comment', target: '' };
    case 'attachment_uploaded': return { text: 'uploaded attachment', target: meta.originalFilename || '' };
    case 'attachment_deleted': return { text: 'deleted attachment', target: meta.originalFilename || '' };
    default: return { text: act.action, target: '' };
  }
};

const ActivityItem = ({ activity }) => {
  return (
    <div className="flex gap-4 p-4 hover:bg-surface-muted transition-colors cursor-pointer group">
      <div className="shrink-0 pt-0.5">
        <Avatar name={activity.user} size="md" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4">
        <div className="min-w-0">
          <p className="text-body text-primary truncate leading-snug">
            <span className="font-medium mr-1">{activity.user}</span>
            <span className="text-secondary">{activity.text}</span>
            <span className="font-medium mx-1">{activity.target}</span>
            {activity.detail && <span className="text-secondary">{activity.detail}</span>}
          </p>
          {activity.board && (
            <p className="text-small text-tertiary truncate mt-0.5">
              in <span className="hover:underline">{activity.board}</span>
            </p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-1.5 text-small text-tertiary sm:group-hover:text-secondary transition-colors">
          <Clock className="w-3.5 h-3.5 hidden sm:block" />
          <span>{activity.time}</span>
        </div>
      </div>
    </div>
  );
};

const Activity = () => {
  const [activities, setActivities] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        setIsLoading(true);
        setError('');
        const boardId = localStorage.getItem('lastOpenedBoardId');
        if (!boardId) {
          setError('Please open a board first to view its activity.');
          setIsLoading(false);
          return;
        }

        const res = await apiClient.get(`/boards/${boardId}/activity?page=${page}&limit=50`);
        if (page === 1) {
          setActivities(res.data.activities);
        } else {
          setActivities(prev => [...prev, ...res.data.activities]);
        }
        
        setHasMore(res.data.pagination.page < res.data.pagination.totalPages);
      } catch (err) {
        if (err.status === 401 || err.status === 403 || err.status === 404) {
          setError(err.message || 'Access denied.');
        } else {
          setError('Failed to load activity');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchActivity();
  }, [page]);

  const groupedActivities = activities.reduce((acc, curr) => {
    const date = new Date(curr.createdAt).toLocaleDateString();
    let group = acc.find(g => g.day === date);
    if (!group) {
      group = { day: date, events: [] };
      acc.push(group);
    }
    const msg = getActionMessage(curr);
    group.events.push({
      id: curr._id,
      user: curr.user?.name || 'Unknown',
      text: msg.text,
      target: msg.target,
      detail: msg.detail,
      time: new Date(curr.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    return acc;
  }, []);

  return (
    <div className="max-w-[800px] mx-auto w-full animate-in fade-in duration-300 pb-12">
      
      {/* Page Header */}
      <div className="mb-8 space-y-2">
        <h1 className="text-h1 text-primary">Activity</h1>
        <p className="text-body text-secondary">
          Track updates, changes, and progress for your currently opened board.
        </p>
      </div>

      {error ? (
        <div className="p-8 text-center text-danger-500 bg-surface border border-border rounded-md shadow-sm">
          {error}
        </div>
      ) : activities.length === 0 && !isLoading ? (
        <div className="p-8 text-center text-secondary bg-surface border border-border rounded-md shadow-sm">
          No activity found.
        </div>
      ) : (
        <>
          {/* Activity Feed */}
          <div className="space-y-8">
            {groupedActivities.map((group) => (
              <div key={group.day}>
                <h3 className="text-body-medium font-medium text-primary mb-3 px-1">
                  {group.day}
                </h3>
                <div className="bg-surface border border-border rounded-md shadow-sm overflow-hidden flex flex-col divide-y divide-border">
                  {group.events.map(activity => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Load More Action */}
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <Button 
                variant="secondary" 
                onClick={() => setPage(p => p + 1)}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Load older activity'}
              </Button>
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default Activity;
