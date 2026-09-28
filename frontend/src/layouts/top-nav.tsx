import { Link, useLocation } from 'react-router-dom';
import { Bell, ChevronRight, Search } from 'lucide-react';
import { breadcrumbLabels } from '@/lib/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth-store';
import { logoutRequest } from '@/features/auth/api';

function buildBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs = [{ label: 'Dashboard', href: '/' }];

  let current = '';
  for (const segment of segments) {
    current += `/${segment}`;
    crumbs.push({
      label: breadcrumbLabels[segment] ?? segment,
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

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
        <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 md:flex">
          <ol className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
            {crumbs.map((crumb, index) => (
              <li key={crumb.href} className="flex min-w-0 items-center gap-1">
                {index > 0 ? <ChevronRight className="h-4 w-4 shrink-0" /> : null}
                <Link
                  to={crumb.href}
                  className={
                    index === crumbs.length - 1
                      ? 'truncate font-medium text-foreground'
                      : 'truncate hover:text-foreground'
                  }
                >
                  {crumb.label}
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden w-64 lg:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search workforce…" />
          </div>

          <Button variant="outline" size="icon" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            Phase 0
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
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
