import { cn } from '@/lib/utils';

export function Alert({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'destructive';
}) {
  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4 text-sm',
        variant === 'default' && 'bg-background text-foreground',
        variant === 'destructive' &&
          'border-destructive/50 text-destructive dark:border-destructive',
        className,
      )}
      {...props}
    />
  );
}

export function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...props}
    />
  );
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <div className={cn('text-sm opacity-90', className)} {...props} />;
}
