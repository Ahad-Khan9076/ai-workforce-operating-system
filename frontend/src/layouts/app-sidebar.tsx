import { BrainCircuit, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { SidebarNav } from '@/components/sidebar-nav';
import { useUiStore } from '@/stores/ui-store';

export function AppSidebar() {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  return (
    <aside
      className={cn(
        'hidden h-screen shrink-0 border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex lg:flex-col',
        collapsed ? 'w-[72px]' : 'w-72',
      )}
      aria-label="Sidebar"
    >
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <BrainCircuit className="h-5 w-5" aria-hidden />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">AI Workforce OS</p>
            <p className="truncate text-xs text-sidebar-muted">Enterprise HR Platform</p>
          </div>
        ) : null}
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <SidebarNav collapsed={collapsed} />
      </ScrollArea>

      <div className="border-t border-white/10 p-3">
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          className="w-full text-sidebar-muted hover:bg-sidebar-accent hover:text-white"
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed ? <span className="ml-2">Collapse</span> : null}
        </Button>
      </div>
    </aside>
  );
}
