import { useEffect } from 'react';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · AI Workforce OS` : 'AI Workforce OS';
    return () => {
      document.title = previous;
    };
  }, [title]);
}
