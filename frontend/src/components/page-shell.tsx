import { cn } from '@/lib/utils';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  /** Default comfortable reading width for SaaS pages */
  width?: 'default' | 'wide' | 'full';
}

const widthClass = {
  default: 'max-w-7xl',
  wide: 'max-w-[90rem]',
  full: 'max-w-none',
};

export function PageShell({
  children,
  className,
  width = 'default',
}: PageShellProps) {
  return (
    <div className={cn('mx-auto w-full space-y-6', widthClass[width], className)}>
      {children}
    </div>
  );
}
