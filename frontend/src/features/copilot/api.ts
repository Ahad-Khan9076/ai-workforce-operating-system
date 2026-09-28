import { apiRequest } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '/api/v1';

export function fetchCopilotPrompts() {
  return apiRequest('/ai/copilot/prompts');
}

export function fetchCopilotConversations() {
  return apiRequest('/ai/copilot/conversations');
}

export function createCopilotConversation(title?: string) {
  return apiRequest('/ai/copilot/conversations', {
    method: 'POST',
    body: title ? { title } : {},
  });
}

export function fetchCopilotConversation(id: string) {
  return apiRequest(`/ai/copilot/conversations/${id}`);
}

export function sendCopilotMessage(conversationId: string, content: string) {
  return apiRequest(`/ai/copilot/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: { content },
  });
}

export async function streamCopilotMessage(
  conversationId: string,
  content: string,
  handlers: {
    onDelta: (text: string) => void;
    onDone: (payload: unknown) => void;
    onError: (message: string) => void;
  },
) {
  const token = useAuthStore.getState().session?.accessToken;
  const response = await fetch(
    `${API_BASE}/ai/copilot/conversations/${conversationId}/messages/stream`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content }),
      credentials: 'include',
    },
  );

  if (!response.ok || !response.body) {
    handlers.onError('Failed to start stream');
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      const lines = part.split('\n');
      let event = 'message';
      let data = '';
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!data) continue;
      try {
        const parsed = JSON.parse(data) as { text?: string; message?: string };
        if (event === 'delta' && parsed.text) handlers.onDelta(parsed.text);
        if (event === 'done') handlers.onDone(parsed);
        if (event === 'error') handlers.onError(parsed.message ?? 'Error');
      } catch {
        /* ignore parse errors */
      }
    }
  }
}

export function confirmCopilotAction(actionId: string) {
  return apiRequest(`/ai/copilot/actions/${actionId}/confirm`, { method: 'POST' });
}

export function rejectCopilotAction(actionId: string) {
  return apiRequest(`/ai/copilot/actions/${actionId}/reject`, { method: 'POST' });
}
