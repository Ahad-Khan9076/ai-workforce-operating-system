import { NavLink } from 'react-router-dom';
import { BrainCircuit, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sidebarNavigation } from '@/lib/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
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
    >
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <BrainCircuit className="h-5 w-5" />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">AI Workforce OS</p>
            <p className="truncate text-xs text-sidebar-muted">Enterprise HR Platform</p>
          </div>
        ) : null}
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-6">
          {sidebarNavigation.map((section) => (
            <div key={section.label}>
              {!collapsed ? (
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-sidebar-muted">
                  {section.label}
                </p>
              ) : null}
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      to={item.href}
                      end={item.href === '/'}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center rounded-md px-3 py-2 text-sm transition-colors',
                          collapsed && 'justify-center px-2',
                          isActive
                            ? 'bg-sidebar-accent text-white'
                            : 'text-sidebar-muted hover:bg-sidebar-accent/70 hover:text-white',
                        )
                      }
                      title={collapsed ? item.title : undefined}
                    >
                      {!collapsed ? item.title : item.title.charAt(0)}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="border-t border-white/10 p-3">
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          className="w-full text-sidebar-muted hover:bg-sidebar-accent hover:text-white"
          onClick={toggleSidebar}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed ? <span className="ml-2">Collapse</span> : null}
        </Button>
      </div>
    </aside>
  );
}
