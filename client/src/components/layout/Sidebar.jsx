import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { 
  LayoutDashboard, 
  KanbanSquare, 
  CheckSquare, 
  Activity, 
  Settings, 
  PanelLeftClose, 
  PanelLeftOpen,
  X
} from 'lucide-react';
import IconButton from '../ui/IconButton';
import Tooltip from '../ui/Tooltip';

const navItems = [
  { name: 'Dashboard', path: '/app', icon: LayoutDashboard },
  { name: 'Boards', path: '/app/boards', icon: KanbanSquare },
  { name: 'My Tasks', path: '/app/tasks', icon: CheckSquare },
  { name: 'Activity', path: '/app/activity', icon: Activity },
  { name: 'Settings', path: '/app/settings', icon: Settings },
];

const Sidebar = ({ isCollapsed, toggleCollapse, isMobileOpen, closeMobile }) => {
  return (
    <>
      {/* Mobile Scrim */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-primary/40 lg:hidden transition-opacity"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-surface border-r border-border transition-all duration-300 ease-in-out",
          // Desktop widths
          isCollapsed ? "hidden lg:flex lg:w-[64px]" : "w-[240px]",
          // Mobile translation
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo Area */}
        <div className="flex items-center justify-between h-[64px] px-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-accent-600 rounded-sm flex items-center justify-center shrink-0">
              <CheckSquare className="w-4 h-4 text-white" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <span className="text-h1 text-primary font-bold tracking-tight">TaskFlow</span>
            )}
          </div>
          
          {/* Mobile close button */}
          <div className="lg:hidden">
            <IconButton variant="ghost" onClick={closeMobile} aria-label="Close menu">
              <X className="w-5 h-5" />
            </IconButton>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const content = (
              <NavLink
                to={item.path}
                end={item.path === '/app'}
                className={({ isActive }) => cn(
                  "relative flex items-center h-[36px] rounded-sm transition-colors group",
                  isCollapsed && !isMobileOpen ? "justify-center px-0" : "px-2",
                  isActive 
                    ? "bg-accent-50 text-accent-600" 
                    : "text-secondary hover:bg-surface-muted hover:text-primary"
                )}
                onClick={() => {
                  if (window.innerWidth < 1024) closeMobile();
                }}
              >
                {({ isActive }) => (
                  <>
                    {/* Active Bar Indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-accent-600 rounded-r-sm" />
                    )}
                    <Icon className={cn("w-5 h-5 shrink-0", isCollapsed && !isMobileOpen ? "" : "mr-3")} />
                    {(!isCollapsed || isMobileOpen) && (
                      <span className="text-body-medium truncate">{item.name}</span>
                    )}
                  </>
                )}
              </NavLink>
            );

            return isCollapsed && !isMobileOpen ? (
              <Tooltip key={item.name} content={item.name} position="right">
                {content}
              </Tooltip>
            ) : (
              <React.Fragment key={item.name}>{content}</React.Fragment>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-border">
          <div className="hidden lg:flex items-center justify-start">
            <Tooltip content={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} position="right">
              <IconButton 
                variant="ghost" 
                onClick={toggleCollapse} 
                aria-label="Toggle sidebar"
                className={cn("w-full justify-start px-2", isCollapsed ? "justify-center" : "")}
              >
                {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                {!isCollapsed && <span className="ml-3 text-body-medium text-secondary">Collapse</span>}
              </IconButton>
            </Tooltip>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
