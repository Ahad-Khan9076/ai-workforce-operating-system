import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarNav } from '@/components/sidebar-nav';
import { useUiStore } from '@/stores/ui-store';

export function MobileNav() {
  const open = useUiStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);

  return (
    <Sheet open={open} onOpenChange={setMobileNavOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(100vw-2rem,20rem)] bg-sidebar p-0 text-sidebar-foreground">
        <SheetHeader className="border-b border-white/10 px-4 py-4 text-left">
          <SheetTitle className="text-sidebar-foreground">Menu</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-4rem)] px-3 py-4">
          <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
