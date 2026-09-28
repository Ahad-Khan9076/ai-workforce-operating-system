import { cn } from '@/lib/utils';

export function FormFieldError({
  message,
  className,
  id,
}: {
  message?: string;
  className?: string;
  id?: string;
}) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className={cn('text-sm text-destructive', className)}>
      {message}
    </p>
  );
}
