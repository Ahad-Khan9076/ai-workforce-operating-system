import { cn } from '@/lib/utils';

export function HeadcountTrendChart({
  points,
  className,
}: {
  points: Array<{ month: string; count: number }>;
  className?: string;
}) {
  if (points.length === 0) return null;

  const max = Math.max(...points.map((p) => p.count), 1);
  const min = Math.min(...points.map((p) => p.count));
  const latest = points[points.length - 1]?.count ?? 0;
  const previous = points[points.length - 2]?.count ?? latest;
  const delta = latest - previous;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-end justify-between gap-2">
        {points.map((p) => {
          const heightPct = Math.max(12, Math.round((p.count / max) * 100));
          return (
            <div
              key={p.month}
              className="flex flex-1 flex-col items-center gap-2"
              title={`${p.month}: ${p.count}`}
            >
              <span className="text-xs font-medium tabular-nums text-foreground">{p.count}</span>
              <div className="flex h-24 w-full items-end justify-center">
                <div
                  className="w-full max-w-[2.5rem] rounded-t-md bg-primary/80 transition-all"
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="max-w-full truncate text-[10px] text-muted-foreground">
                {p.month.replace(/^\d{4}-/, '')}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Range {min}–{max} employees
        {delta !== 0 ? (
          <span className={cn('ml-2 font-medium', delta > 0 ? 'text-emerald-600' : 'text-amber-600')}>
            {delta > 0 ? '+' : ''}
            {delta} vs prior month
          </span>
        ) : null}
      </p>
    </div>
  );
}
