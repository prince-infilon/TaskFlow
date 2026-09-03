import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { cn } from '../../utils/cn';

const AppShell = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();

  // Handle escape key for mobile sidebar
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false);
      }
    };
    
    if (isMobileSidebarOpen) {
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
      document.addEventListener('keydown', handleEscape);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileSidebarOpen]);

  // Determine page title based on path
  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/app': return 'Dashboard';
      case '/app/boards': return 'Boards';
      case '/app/tasks': return 'My Tasks';
      case '/app/activity': return 'Activity';
      case '/app/settings': return 'Settings';
      case '/app/notifications': return 'Notifications';
      default: {
        if (pathname.startsWith('/app/boards/')) return 'Board';
        return 'TaskFlow';
      }
    }
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="min-h-screen bg-canvas flex flex-col lg:flex-row">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
        isMobileOpen={isMobileSidebarOpen}
        closeMobile={() => setIsMobileSidebarOpen(false)}
      />
      
      {/* Main Content Wrapper */}
      <div 
        className={cn(
          "flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ease-in-out",
          // Push content based on sidebar width on desktop
          isSidebarCollapsed ? "lg:pl-[64px]" : "lg:pl-[240px]"
        )}
      >
        <Header 
          openMobileSidebar={() => setIsMobileSidebarOpen(true)} 
          pageTitle={pageTitle}
        />
        
        {/* Scrollable Main Area */}
        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-[1280px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
