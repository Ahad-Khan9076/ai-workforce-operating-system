import { Link, useLocation } from 'react-router-dom';
import { Bell, ChevronRight } from 'lucide-react';
import { breadcrumbLabels } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MobileNav } from '@/components/mobile-nav';
import { useAuthStore } from '@/stores/auth-store';
import { logoutRequest } from '@/features/auth/api';

function buildBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs = [{ label: 'Dashboard', href: '/' }];

  let current = '';
  for (const segment of segments) {
    current += `/${segment}`;
    crumbs.push({
      label: breadcrumbLabels[segment] ?? segment.replace(/-/g, ' '),
      href: current,
    });
  }

  return crumbs;
}

export function TopNav() {
  const location = useLocation();
  const session = useAuthStore((state) => state.session);
  const clearSession = useAuthStore((state) => state.clearSession);
  const crumbs = buildBreadcrumbs(location.pathname);
  const initials = session
    ? `${session.user.firstName.charAt(0)}${session.user.lastName.charAt(0)}`
    : 'AW';

  const currentTitle = crumbs[crumbs.length - 1]?.label ?? 'Dashboard';

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-16 items-center gap-3 px-4 lg:gap-4 lg:px-6">
        <MobileNav />

        <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium md:hidden">{currentTitle}</p>
          <ol className="hidden min-w-0 items-center gap-1 text-sm text-muted-foreground md:flex">
            {crumbs.map((crumb, index) => (
              <li key={crumb.href} className="flex min-w-0 items-center gap-1">
                {index > 0 ? (
                  <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                ) : null}
                <Link
                  to={crumb.href}
                  className={
                    index === crumbs.length - 1
                      ? 'truncate font-medium text-foreground'
                      : 'truncate hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm'
                  }
                  aria-current={index === crumbs.length - 1 ? 'page' : undefined}
                >
                  {crumb.label}
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Notifications (coming soon)" disabled>
            <Bell className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2" aria-label="Account menu">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden text-left text-sm sm:block">
                  <span className="block font-medium leading-none">
                    {session?.user.firstName} {session?.user.lastName}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {session?.roleCode ?? 'Guest'}
                  </span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    await logoutRequest();
                  } finally {
                    clearSession();
                  }
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
