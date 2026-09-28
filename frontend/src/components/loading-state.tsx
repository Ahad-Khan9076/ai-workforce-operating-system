import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LoadingState({
  label = 'Loading…',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-[160px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground',
        className,
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin" />
      <span>{label}</span>
    </div>
  );
}
