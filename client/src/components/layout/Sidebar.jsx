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
  X,
  CreditCard,
  Users
} from 'lucide-react';
import IconButton from '../ui/IconButton';
import Tooltip from '../ui/Tooltip';
import Select from '../ui/Select';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isCollapsed, toggleCollapse, isMobileOpen, closeMobile }) => {
  const { user, organizations = [], activeOrganization, switchOrganization } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/app', icon: LayoutDashboard, end: true },
    { name: 'Boards', path: '/app/boards', icon: KanbanSquare, end: false },
    { name: 'My Tasks', path: '/app/tasks', icon: CheckSquare, end: true },
    { name: 'Activity', path: '/app/activity', icon: Activity, end: true },
    ...(user?.globalRole === 'admin' ? [{ name: 'User Management', path: '/app/users', icon: Users, end: true }] : []),
    ...(user?.globalRole === 'manager' ? [{ name: 'My Team', path: '/app/team', icon: Users, end: true }] : []),
    { name: 'Workspace', path: '/app/settings/organization', icon: Settings, end: true },
    { name: 'Billing', path: '/app/settings/billing', icon: CreditCard, end: true },
    { name: 'Settings', path: '/app/settings', icon: Settings, end: true },
  ];


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
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-canvas transition-all duration-300 ease-in-out",
          // Desktop widths
          isCollapsed ? "hidden lg:flex lg:w-[64px]" : "w-[240px]",
          // Mobile translation
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo Area */}
        <div className="flex items-center justify-between h-[64px] px-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shrink-0">
              <CheckSquare className="w-5 h-5 text-white" />
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

        {/* Organization Switcher */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="px-4 pb-2">
            <Select 
              options={organizations.map(org => ({ label: org.name, value: org._id }))}
              value={activeOrganization?._id}
              onChange={(value) => {
                const org = organizations.find(o => o._id === value);
                if (org) switchOrganization(org);
              }}
              className="w-full"
            />
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const content = (
              <NavLink
                to={item.path}
                end={item.end !== undefined ? item.end : true}
                className={({ isActive }) => cn(
                  "relative flex items-center h-[40px] rounded-2xl transition-colors group",
                  isCollapsed && !isMobileOpen ? "justify-center px-0" : "px-4",
                  isActive 
                    ? "bg-black text-white" 
                    : "text-secondary hover:bg-surface-muted hover:text-primary"
                )}
                onClick={() => {
                  if (window.innerWidth < 1024) closeMobile();
                }}
              >
                {({ isActive }) => (
                  <>
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
            {isCollapsed && !isMobileOpen ? (
              <Tooltip content="Expand sidebar" position="right">
                <IconButton 
                  variant="ghost" 
                  onClick={toggleCollapse} 
                  aria-label="Toggle sidebar"
                  className="w-full justify-center px-2"
                >
                  <PanelLeftOpen className="w-5 h-5" />
                </IconButton>
              </Tooltip>
            ) : (
              <IconButton 
                variant="ghost" 
                onClick={toggleCollapse} 
                aria-label="Toggle sidebar"
                className="w-full justify-start px-2"
              >
                <PanelLeftClose className="w-5 h-5" />
                <span className="ml-3 text-body-medium text-secondary">Collapse</span>
              </IconButton>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
