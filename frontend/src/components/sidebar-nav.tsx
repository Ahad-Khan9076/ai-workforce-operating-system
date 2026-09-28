import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sidebarNavigation } from '@/lib/navigation';

export function SidebarNav({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-6" aria-label="Main">
      {sidebarNavigation.map((section) => (
        <div key={section.label}>
          {!collapsed ? (
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-sidebar-muted">
              {section.label}
            </p>
          ) : null}
          <ul className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    end={item.href === '/'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                        collapsed && 'justify-center px-2',
                        isActive
                          ? 'bg-sidebar-accent font-medium text-white'
                          : 'text-sidebar-muted hover:bg-sidebar-accent/70 hover:text-white',
                      )
                    }
                    title={collapsed ? item.title : undefined}
                  >
                    {Icon ? (
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    ) : null}
                    {!collapsed ? <span className="truncate">{item.title}</span> : null}
                    {collapsed && Icon ? (
                      <span className="sr-only">{item.title}</span>
                    ) : null}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export type { LucideIcon };
