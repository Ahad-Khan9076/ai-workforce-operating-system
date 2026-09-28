import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/layouts/app-sidebar';
import { TopNav } from '@/layouts/top-nav';
import { TooltipProvider } from '@/components/ui/tooltip';

export function AppLayout() {
  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNav />
          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
