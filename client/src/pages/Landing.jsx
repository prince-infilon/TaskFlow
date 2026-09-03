import React from 'react';
import { Link } from 'react-router-dom';
import { KanbanSquare, Users, Activity, CheckSquare } from 'lucide-react';
import Button from '../components/ui/Button';

const Landing = () => {
  return (
    <div className="min-h-screen bg-canvas flex flex-col font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-surface/90 backdrop-blur-sm border-b border-border">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-accent-600 rounded-sm flex items-center justify-center shrink-0">
              <CheckSquare className="w-4 h-4 text-white" />
            </div>
            <span className="text-h1 text-primary font-bold tracking-tight">TaskFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hidden sm:block">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link to="/register">
              <Button variant="primary">Sign up</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        <section className="px-4 py-20 sm:py-32 flex flex-col items-center text-center max-w-4xl mx-auto">
          <h1 className="text-[40px] leading-[48px] sm:text-[56px] sm:leading-[64px] font-bold text-primary tracking-tight mb-6">
            The calm, confident way to manage your work.
          </h1>
          <p className="text-[18px] sm:text-[20px] text-secondary mb-10 max-w-2xl">
            A professional kanban tool designed for clarity and speed. Real-time collaboration, zero clutter, and everything you need to get things done.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link to="/register" className="w-full sm:w-auto">
              <Button variant="primary" size="lg" className="w-full">
                Get started
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto sm:hidden">
              <Button variant="secondary" size="lg" className="w-full">
                Log in
              </Button>
            </Link>
          </div>
        </section>

        {/* Feature Summary */}
        <section className="bg-surface border-y border-border py-20">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
              
              {/* Feature 1 */}
              <div className="flex flex-col items-start">
                <div className="w-12 h-12 rounded-md bg-accent-50 flex items-center justify-center mb-5 border border-accent-100">
                  <KanbanSquare className="w-6 h-6 text-accent-600" />
                </div>
                <h3 className="text-h1 text-primary mb-3">Intuitive Boards</h3>
                <p className="text-body text-secondary">
                  Organize tasks across To Do, In Progress, and Done. Effortless drag-and-drop mechanics keep your workflow fluid.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col items-start">
                <div className="w-12 h-12 rounded-md bg-accent-50 flex items-center justify-center mb-5 border border-accent-100">
                  <Users className="w-6 h-6 text-accent-600" />
                </div>
                <h3 className="text-h1 text-primary mb-3">Real-time Sync</h3>
                <p className="text-body text-secondary">
                  Collaborate seamlessly. See updates from your team instantly without ever refreshing the page.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col items-start">
                <div className="w-12 h-12 rounded-md bg-accent-50 flex items-center justify-center mb-5 border border-accent-100">
                  <Activity className="w-6 h-6 text-accent-600" />
                </div>
                <h3 className="text-h1 text-primary mb-3">Activity Tracking</h3>
                <p className="text-body text-secondary">
                  Never lose context. A complete audit log of who did what and when, ensuring total transparency.
                </p>
              </div>

            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface py-10 border-t border-border">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-small text-tertiary">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            <span>&copy; {new Date().getFullYear()} TaskFlow. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-secondary transition-colors">Privacy</a>
            <a href="#" className="hover:text-secondary transition-colors">Terms</a>
            <a href="#" className="hover:text-secondary transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
