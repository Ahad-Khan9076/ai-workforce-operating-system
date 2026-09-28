import { BrainCircuit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}

export function AuthLayout({
  title,
  description,
  children,
  footer,
  wide,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-muted/40 to-background px-4 py-10">
      <div className="mx-auto mb-8 flex items-center gap-2 text-foreground">
        <Link to="/login" className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BrainCircuit className="h-5 w-5" aria-hidden />
          </span>
          <span>
            <span className="block text-sm font-semibold leading-tight">AI Workforce OS</span>
            <span className="block text-xs text-muted-foreground">Enterprise HR platform</span>
          </span>
        </Link>
      </div>
      <Card className={`mx-auto w-full shadow-sm ${wide ? 'max-w-lg' : 'max-w-md'}`}>
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      {footer ? (
        <div className="mx-auto mt-6 w-full max-w-md text-center text-sm text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
