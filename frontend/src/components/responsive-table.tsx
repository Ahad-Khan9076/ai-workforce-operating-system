import { cn } from '@/lib/utils';

/** Horizontal scroll wrapper so shadcn tables stay usable on mobile/tablet */
export function ResponsiveTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('w-full overflow-x-auto rounded-lg border bg-card', className)}>
      <div className="min-w-[640px]">{children}</div>
    </div>
  );
}
