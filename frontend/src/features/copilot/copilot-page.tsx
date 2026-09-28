import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Loader2, Plus, Sparkles, Wrench } from 'lucide-react';
import { PageShell } from '@/components/page-shell';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  confirmCopilotAction,
  createCopilotConversation,
  fetchCopilotConversation,
  fetchCopilotConversations,
  fetchCopilotPrompts,
  rejectCopilotAction,
  streamCopilotMessage,
} from '@/features/copilot/api';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: string;
  content: string;
}

interface PendingAction {
  id: string;
  summary: string;
  toolCode: string;
}

export function CopilotPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState('');
  const [overlayMessages, setOverlayMessages] = useState<ChatMessage[]>([]);
  const [overlayActions, setOverlayActions] = useState<PendingAction[] | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageIdRef = useRef(0);
  const nextMessageId = useCallback(() => {
    messageIdRef.current += 1;
    return `local-${messageIdRef.current}`;
  }, []);
  const queryClient = useQueryClient();

  const promptsQuery = useQuery({
    queryKey: ['copilot', 'prompts'],
    queryFn: fetchCopilotPrompts,
  });

  const conversationsQuery = useQuery({
    queryKey: ['copilot', 'conversations'],
    queryFn: fetchCopilotConversations,
  });

  const conversationQuery = useQuery({
    queryKey: ['copilot', 'conversation', conversationId],
    queryFn: () => fetchCopilotConversation(conversationId!),
    enabled: Boolean(conversationId),
  });

  const conversationPayload = conversationQuery.data as
    | { messages?: ChatMessage[]; actions?: PendingAction[] }
    | undefined;
  const serverMessages = conversationPayload?.messages ?? [];
  const displayMessages = useMemo(
    () => [...serverMessages, ...overlayMessages],
    [serverMessages, overlayMessages],
  );
  const pendingActions = overlayActions ?? conversationPayload?.actions ?? [];

  const resetConversationUi = useCallback(() => {
    setOverlayMessages([]);
    setOverlayActions(null);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages, streaming]);

  const newChat = useMutation({
    mutationFn: () => createCopilotConversation('Workforce copilot'),
    onSuccess: (conv) => {
      const id = (conv as { id: string }).id;
      setConversationId(id);
      resetConversationUi();
      queryClient.invalidateQueries({ queryKey: ['copilot', 'conversations'] });
    },
  });

  const confirmAction = useMutation({
    mutationFn: confirmCopilotAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copilot', 'conversation', conversationId] });
      setOverlayActions(null);
    },
  });

  const rejectAction = useMutation({
    mutationFn: rejectCopilotAction,
    onSuccess: () => {
      setOverlayActions(null);
      queryClient.invalidateQueries({ queryKey: ['copilot', 'conversation', conversationId] });
    },
  });

  const send = async (text: string) => {
    if (!text.trim()) return;
    let convId = conversationId;
    if (!convId) {
      const created = await createCopilotConversation('Workforce copilot');
      convId = (created as { id: string }).id;
      setConversationId(convId);
    }

    const userMsg: ChatMessage = {
      id: nextMessageId(),
      role: 'USER',
      content: text,
    };
    setOverlayMessages((m) => [...m, userMsg]);
    setInput('');
    setStreaming('');

    await streamCopilotMessage(convId, text, {
      onDelta: (chunk) => setStreaming((s) => s + chunk),
      onDone: async (payload) => {
        const p = payload as {
          content?: string;
          pendingActions?: PendingAction[];
        };
        setStreaming('');
        if (p.content) {
          setOverlayMessages((m) => [
            ...m,
            { id: nextMessageId(), role: 'ASSISTANT', content: p.content ?? '' },
          ]);
        }
        if (p.pendingActions?.length) {
          setOverlayActions(p.pendingActions);
        }
        await queryClient.invalidateQueries({ queryKey: ['copilot', 'conversation', convId] });
        setOverlayMessages([]);
      },
      onError: (message) => {
        setStreaming('');
        setOverlayMessages((m) => [
          ...m,
          { id: nextMessageId(), role: 'ASSISTANT', content: message },
        ]);
      },
    });
  };

  return (
    <PageShell width="full" className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      <PageHeader
        title="AI Workforce Copilot"
        description="Grounded in your tenant data via approved tools. Writes require your confirmation."
        actions={
          <Button variant="outline" disabled={newChat.isPending} onClick={() => newChat.mutate()}>
            <Plus className="mr-2 h-4 w-4" />
            New chat
          </Button>
        }
      />

      <div className="grid flex-1 gap-4 lg:grid-cols-[240px_1fr] min-h-0">
        <Card className="hidden lg:flex flex-col min-h-0">
          <CardContent className="p-3 flex flex-col gap-2 min-h-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground px-1">History</p>
            <ScrollArea className="flex-1">
              <div className="space-y-1">
                {(
                  (conversationsQuery.data as Array<{ id: string; title: string | null }>) ?? []
                ).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={cn(
                      'w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted',
                      conversationId === c.id && 'bg-muted font-medium',
                    )}
                    onClick={() => {
                      setConversationId(c.id);
                      resetConversationUi();
                    }}
                  >
                    {c.title ?? 'Conversation'}
                  </button>
                ))}
              </div>
            </ScrollArea>
            <div className="border-t pt-2 space-y-1">
              <p className="text-xs font-medium text-muted-foreground px-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Suggested
              </p>
              {((promptsQuery.data as string[]) ?? []).slice(0, 4).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="w-full text-left text-xs rounded-md px-2 py-1 hover:bg-muted text-muted-foreground"
                  onClick={() => send(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col min-h-0">
          <CardContent className="flex flex-1 flex-col gap-3 p-4 min-h-0">
            <ScrollArea className="flex-1 pr-3">
              <div className="space-y-4">
                {displayMessages.length === 0 && !streaming ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                    <Bot className="h-10 w-10 mb-3 opacity-60" />
                    <p className="text-sm">Ask about headcount, leave, overtime, training, risks, or hiring.</p>
                    <p className="text-xs mt-1">Answers use approved tools—never raw database access.</p>
                  </div>
                ) : null}
                {displayMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
                      msg.role === 'USER'
                        ? 'ml-auto bg-primary text-primary-foreground'
                        : 'border bg-card shadow-sm',
                    )}
                  >
                    {msg.role !== 'USER' ? (
                      <Badge variant="secondary" className="mb-2 gap-1">
                        <Bot className="h-3 w-3" aria-hidden />
                        AI Copilot
                      </Badge>
                    ) : null}
                    {msg.content}
                  </div>
                ))}
                {streaming ? (
                  <div className="max-w-[85%] rounded-lg border bg-card px-3 py-2 text-sm whitespace-pre-wrap shadow-sm">
                    <Badge variant="secondary" className="mb-2 gap-1">
                      <Bot className="h-3 w-3" aria-hidden />
                      AI Copilot
                    </Badge>
                    {streaming}
                    <Loader2 className="inline h-3 w-3 ml-2 animate-spin" aria-label="Generating" />
                  </div>
                ) : null}
                {pendingActions.map((action) => (
                  <div
                    key={action.id}
                    className="max-w-md rounded-lg border-2 border-primary/20 bg-primary/5 p-4 text-sm space-y-2"
                    role="region"
                    aria-label="Pending copilot action"
                  >
                    <div className="flex items-center gap-2">
                      <Badge className="gap-1">
                        <Wrench className="h-3 w-3" aria-hidden />
                        Confirm action
                      </Badge>
                      <span className="font-medium">{action.summary}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      System tool: <code className="rounded bg-muted px-1">{action.toolCode}</code>
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={confirmAction.isPending}
                        onClick={() => confirmAction.mutate(action.id)}
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={rejectAction.isPending}
                        onClick={() => rejectAction.mutate(action.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            {newChat.isError ? (
              <Alert variant="destructive">
                <AlertDescription>{getErrorMessage(newChat.error)}</AlertDescription>
              </Alert>
            ) : null}

            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the workforce copilot…"
                disabled={Boolean(streaming)}
                aria-label="Message to AI copilot"
              />
              <Button type="submit" disabled={Boolean(streaming) || !input.trim()}>
                Send
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
