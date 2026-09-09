import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { PieChart, Activity, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const AnalyticsView = ({ boardId }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const res = await apiClient.get(`/boards/${boardId}/analytics`);
        setData(res.data);
      } catch (err) {
        setError('Failed to load analytics');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (boardId) {
      fetchAnalytics();
    }
  }, [boardId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-danger-500">
        <AlertTriangle className="w-12 h-12 mb-4" />
        <p>{error || 'No data available'}</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-canvas h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-h3 font-bold text-primary flex items-center gap-2">
          <PieChart className="w-6 h-6" />
          Board Analytics
        </h2>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-primary text-surface rounded-lg">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-small font-medium text-secondary">Completion Rate</p>
              <h3 className="text-h3 font-bold text-primary">{data.completionRate}%</h3>
            </div>
          </div>
          
          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-accent-500 text-surface rounded-lg">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-small font-medium text-secondary">Total Tasks</p>
              <h3 className="text-h3 font-bold text-primary">{data.totalTasks}</h3>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-danger-500 text-surface rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-small font-medium text-secondary">Overdue</p>
              <h3 className="text-h3 font-bold text-primary">{data.overdueTasks}</h3>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-success-500 text-surface rounded-lg">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-small font-medium text-secondary">Recent Activity (7d)</p>
              <h3 className="text-h3 font-bold text-primary">{data.recentActivityCount}</h3>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-body-large font-bold text-primary mb-4 border-b border-border pb-2">Tasks by Column</h3>
            <div className="space-y-4">
              {Object.entries(data.tasksByColumn).map(([col, count]) => {
                const percentage = data.totalTasks > 0 ? (count / data.totalTasks) * 100 : 0;
                return (
                  <div key={col}>
                    <div className="flex justify-between text-small mb-1">
                      <span className="font-medium text-secondary">{col}</span>
                      <span className="text-primary">{count}</span>
                    </div>
                    <div className="w-full bg-surface-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-body-large font-bold text-primary mb-4 border-b border-border pb-2">Tasks by Priority</h3>
            <div className="space-y-4">
              {/* High */}
              <div>
                <div className="flex justify-between text-small mb-1">
                  <span className="font-medium text-danger-600">High</span>
                  <span className="text-primary">{data.tasksByPriority.high}</span>
                </div>
                <div className="w-full bg-surface-muted rounded-full h-2">
                  <div className="bg-danger-500 h-2 rounded-full" style={{ width: `${data.totalTasks > 0 ? (data.tasksByPriority.high / data.totalTasks) * 100 : 0}%` }}></div>
                </div>
              </div>
              
              {/* Medium */}
              <div>
                <div className="flex justify-between text-small mb-1">
                  <span className="font-medium text-warning-600">Medium</span>
                  <span className="text-primary">{data.tasksByPriority.medium}</span>
                </div>
                <div className="w-full bg-surface-muted rounded-full h-2">
                  <div className="bg-warning-500 h-2 rounded-full" style={{ width: `${data.totalTasks > 0 ? (data.tasksByPriority.medium / data.totalTasks) * 100 : 0}%` }}></div>
                </div>
              </div>

              {/* Low */}
              <div>
                <div className="flex justify-between text-small mb-1">
                  <span className="font-medium text-success-600">Low</span>
                  <span className="text-primary">{data.tasksByPriority.low}</span>
                </div>
                <div className="w-full bg-surface-muted rounded-full h-2">
                  <div className="bg-success-500 h-2 rounded-full" style={{ width: `${data.totalTasks > 0 ? (data.tasksByPriority.low / data.totalTasks) * 100 : 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
