import { Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-8">
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={Sparkles}
        title="Coming in a future phase"
        description="This module is wired into the application shell and navigation. Business workflows, AI actions, and tenant-scoped APIs will be implemented in upcoming phases."
      />
    </div>
  );
}
