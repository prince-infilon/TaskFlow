import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/client';
import { socket } from '../../api/socket';
import { 
  PieChart, 
  Activity, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  TrendingUp, 
  Users, 
  BarChart3, 
  Zap, 
  ShieldCheck
} from 'lucide-react';

const AnalyticsView = ({ boardId }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchAnalytics = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setIsLoading(true);
      else setIsRefreshing(true);

      const res = await apiClient.get(`/boards/${boardId}/analytics`);
      // Handle both res.data.data and direct res.data
      const analyticsData = res.data?.data || res.data;
      setData(analyticsData);
      setError('');
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics data.');
    } fontFinally: {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [boardId]);

  // Initial fetch & real-time socket event listeners
  useEffect(() => {
    if (!boardId) return;

    fetchAnalytics(true);

    const handleSocketEvent = () => {
      // Re-fetch analytics silently on live task/board changes
      fetchAnalytics(false);
    };

    socket.on('task_created', handleSocketEvent);
    socket.on('task_updated', handleSocketEvent);
    socket.on('task_deleted', handleSocketEvent);
    socket.on('task_moved', handleSocketEvent);
    socket.on('comment_created', handleSocketEvent);
    socket.on('attachment_uploaded', handleSocketEvent);
    socket.on('board_updated', handleSocketEvent);

    return () => {
      socket.off('task_created', handleSocketEvent);
      socket.off('task_updated', handleSocketEvent);
      socket.off('task_deleted', handleSocketEvent);
      socket.off('task_moved', handleSocketEvent);
      socket.off('comment_created', handleSocketEvent);
      socket.off('attachment_uploaded', handleSocketEvent);
      socket.off('board_updated', handleSocketEvent);
    };
  }, [boardId, fetchAnalytics]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-indigo-600"></div>
        <span className="text-xs font-medium">Loading real-time analytics...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">{error || 'No data available'}</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Check your network connection or try refreshing the board analytics.
        </p>
        <button
          onClick={() => fetchAnalytics(true)}
          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const {
    totalTasks = 0,
    completedTasks = 0,
    completionRate = 0,
    tasksByColumn = {},
    tasksByPriority = { low: 0, medium: 0, high: 0 },
    tasksByAssignee = {},
    overdueTasks = 0,
    recentActivityCount = 0
  } = data;

  // Project Health Calculation
  const healthScore = totalTasks === 0 
    ? 100 
    : Math.max(0, Math.min(100, Math.round(completionRate * 0.7 + (1 - overdueTasks / Math.max(1, totalTasks)) * 30)));

  const getHealthBadge = (score) => {
    if (score >= 80) return { label: 'Excellent', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' };
    if (score >= 50) return { label: 'Good', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200' };
    return { label: 'Needs Attention', color: 'bg-amber-500/10 text-amber-600 border-amber-200' };
  };

  const healthInfo = getHealthBadge(healthScore);

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-950 h-full overflow-y-auto text-slate-800 dark:text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Board Analytics</h2>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Socket Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time performance metrics • Last synced {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAnalytics(false)}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* 4 Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Completion Rate */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-indigo-500/30 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completion Rate</span>
              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{completionRate}%</h3>
              <span className="text-xs text-slate-500">({completedTasks}/{totalTasks})</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          {/* Total Tasks */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-indigo-500/30 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Tasks</span>
              <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{totalTasks}</h3>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3">
              Across all board workflow columns
            </p>
          </div>

          {/* Overdue Tasks */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-red-500/30 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Overdue Tasks</span>
              <div className={`p-2.5 rounded-xl ${overdueTasks > 0 ? 'bg-red-500/10 text-red-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className={`text-2xl font-extrabold ${overdueTasks > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>
                {overdueTasks}
              </h3>
              {overdueTasks > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/10 text-red-600">
                  Action Needed
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3">
              {overdueTasks === 0 ? 'All deadlines on track' : 'Past due date & uncompleted'}
            </p>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-indigo-500/30 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Recent Activity (7d)</span>
              <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{recentActivityCount}</h3>
              <span className="text-xs text-slate-500">events</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3">
              Task movements, updates & comments
            </p>
          </div>
        </div>

        {/* Detailed Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tasks by Column */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                Tasks by Column
              </h3>
              <span className="text-xs text-slate-400 font-medium">{Object.keys(tasksByColumn).length} Columns</span>
            </div>

            <div className="space-y-4">
              {Object.entries(tasksByColumn).map(([colName, count]) => {
                const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
                
                let barColor = 'bg-indigo-500';
                if (colName.toLowerCase().includes('done') || colName.toLowerCase().includes('complete')) {
                  barColor = 'bg-emerald-500';
                } else if (colName.toLowerCase().includes('progress')) {
                  barColor = 'bg-indigo-500';
                } else if (colName.toLowerCase().includes('review')) {
                  barColor = 'bg-amber-500';
                } else if (colName.toLowerCase().includes('to do')) {
                  barColor = 'bg-blue-500';
                }

                return (
                  <div key={colName} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700 dark:text-slate-300">{colName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900 dark:text-slate-100 font-bold">{count}</span>
                        <span className="text-slate-400 font-normal">({percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`${barColor} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {Object.keys(tasksByColumn).length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No columns defined for this board.</p>
              )}
            </div>
          </div>

          {/* Tasks by Priority */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Tasks by Priority
              </h3>
              <span className="text-xs text-slate-400 font-medium">3 Priority Levels</span>
            </div>

            <div className="space-y-5">
              {/* High */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> High Priority
                  </span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold">
                    {tasksByPriority.high} <span className="text-slate-400 font-normal">({totalTasks > 0 ? Math.round((tasksByPriority.high / totalTasks) * 100) : 0}%)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-red-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${totalTasks > 0 ? (tasksByPriority.high / totalTasks) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Medium */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Medium Priority
                  </span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold">
                    {tasksByPriority.medium} <span className="text-slate-400 font-normal">({totalTasks > 0 ? Math.round((tasksByPriority.medium / totalTasks) * 100) : 0}%)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${totalTasks > 0 ? (tasksByPriority.medium / totalTasks) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Low */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" /> Low Priority
                  </span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold">
                    {tasksByPriority.low} <span className="text-slate-400 font-normal">({totalTasks > 0 ? Math.round((tasksByPriority.low / totalTasks) * 100) : 0}%)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-slate-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${totalTasks > 0 ? (tasksByPriority.low / totalTasks) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Workload & Project Health Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Team Workload Breakdown */}
          <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                Team Workload Distribution
              </h3>
              <span className="text-xs text-slate-400 font-medium">{Object.keys(tasksByAssignee).length} Members</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(tasksByAssignee).map(([name, count]) => {
                const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
                return (
                  <div key={name} className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                        {name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{name}</p>
                        <p className="text-[10px] text-slate-500">{pct}% of board tasks</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold shrink-0">
                      {count} tasks
                    </span>
                  </div>
                );
              })}

              {Object.keys(tasksByAssignee).length === 0 && (
                <p className="text-xs text-slate-400 col-span-2 text-center py-4">No task assignments found.</p>
              )}
            </div>
          </div>

          {/* Project Health Score */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                  Health Index
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${healthInfo.color}`}>
                  {healthInfo.label}
                </span>
              </div>

              <div className="text-center py-3">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-indigo-500/20 bg-indigo-500/5 mb-2">
                  <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{healthScore}</span>
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Overall Board Score</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>Completed Tasks</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{completedTasks}</span>
              </div>
              <div className="flex justify-between">
                <span>Overdue Risk</span>
                <span className="font-semibold text-red-500">{overdueTasks} tasks</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;

