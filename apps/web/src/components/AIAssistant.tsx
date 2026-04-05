'use client';

import { useState, useRef, useEffect } from 'react';
import { API_BASE } from '@/lib/apiBase';
import { useAuth } from '@/hooks/useAuth';

const KangarooLogo = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className="drop-shadow-md"
  >
    {/* Background circle with gradient */}
    <defs>
      <linearGradient id="kangaroo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>
    <circle cx="24" cy="24" r="23" fill="url(#kangaroo-bg)" stroke="#fff" strokeWidth="2" />
    {/* Kangaroo silhouette */}
    <g fill="#fff">
      {/* Body */}
      <ellipse cx="26" cy="28" rx="8" ry="10" />
      {/* Head */}
      <circle cx="30" cy="16" r="6" />
      {/* Ears */}
      <ellipse cx="27" cy="11" rx="2" ry="4" transform="rotate(-15 27 11)" />
      <ellipse cx="33" cy="11" rx="2" ry="4" transform="rotate(15 33 11)" />
      {/* Snout */}
      <ellipse cx="34" cy="17" rx="3" ry="2" />
      {/* Eye */}
      <circle cx="29" cy="15" r="1.5" fill="#F59E0B" />
      {/* Tail */}
      <path d="M18 32 Q12 30 10 24 Q9 22 11 22 Q14 24 18 28 Z" />
      {/* Front leg */}
      <ellipse cx="28" cy="36" rx="2" ry="4" />
      {/* Back leg */}
      <ellipse cx="22" cy="36" rx="3" ry="5" />
      {/* Baby joey pouch hint */}
      <ellipse cx="28" cy="26" rx="3" ry="4" fill="#F59E0B" opacity="0.3" />
    </g>
  </svg>
);

export default function AIAssistant() {
  const { user, token, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>(() => {
    try {
      const raw = localStorage.getItem('gimbi:ai:messages');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      // localStorage may be unavailable in privacy mode
      return [];
    }
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('gimbi:ai:messages', JSON.stringify(messages));
    } catch (e) {
      // ignore storage errors (privacy mode)
    }
    // auto-scroll
    setTimeout(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
    }, 60);
  }, [messages, open]);

  // Load or create a conversation when opened (if authenticated)
  useEffect(() => {
    if (!open || !isAuthenticated || !token) return;

    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/ai/conversations`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to fetch conversations');
        const payload = await res.json();
        const convs = payload.conversations || [];
        if (convs.length > 0) {
          const first = convs[0];
          setConversationId(first.id);
          // load messages for this conversation
          const r2 = await fetch(`${API_BASE}/ai/conversations/${first.id}`, { headers: { Authorization: `Bearer ${token}` } });
          if (r2.ok) {
            const p = await r2.json();
            if (!cancelled && p.conversation?.messages) {
              setMessages(p.conversation.messages.map((m: any) => ({ role: m.role === 'assistant' ? 'ai' : 'user', text: m.content })));
            }
          }
        } else {
          // create a conversation
          const r3 = await fetch(`${API_BASE}/ai/conversations`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ title: 'Conversation with Athena' }) });
          if (r3.ok) {
            const p = await r3.json();
            setConversationId(p.conversation.id);
            setMessages([]);
          }
        }
      } catch (err) {
        console.debug('Could not initialize AI conversation', err);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [open, isAuthenticated, token]);

  const ask = async (question: string) => {
    setError(null);
    setLoading(true);
    try {
      if (isAuthenticated && conversationId && token) {
        // Post to conversation messages endpoint
        const res = await fetch(`${API_BASE}/ai/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ role: 'user', content: question }),
        });

        if (res.status === 429) {
          setError('AI requests rate limited. Please try again later.');
          setMessages((prev) => [...prev, { role: 'ai', text: 'Rate limit exceeded. Please wait and try again.' }]);
          return;
        }

        if (!res.ok) throw new Error('AI service error');
        const d = await res.json();
        if (d && d.assistantMessage) {
          // Handle safety-filtered responses differently
          const isSafetyFiltered = d.source === 'safety';
          const text = isSafetyFiltered
            ? (d.assistantMessage.content || 'Content removed due to safety.')
            : (d.assistantMessage.content || d.assistantMessage.text || 'No response');
          setMessages((prev) => [...prev, { role: 'ai', text }]);
        } else {
          setMessages((prev) => [...prev, { role: 'ai', text: "Sorry, I couldn't find anything. Try rephrasing." }]);
        }
      } else {
        // Fallback for unauthenticated users: call concierge directly
        const res = await fetch(`${API_BASE}/ai/concierge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: isAuthenticated ? user?.id : undefined, context: question }),
        });
        if (!res.ok) throw new Error('AI service error');
        const data = await res.json();
        if (data.suggestions && data.suggestions.length) {
          const text = data.suggestions.map((s: string) => `• ${s}`).join('\n');
          setMessages((prev) => [...prev, { role: 'ai', text }]);
        } else if (data.text) {
          setMessages((prev) => [...prev, { role: 'ai', text: data.text }]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: 'ai', text: "Sorry, I couldn't find anything. Try rephrasing." },
          ]);
        }
      }
    } catch (err) {
      console.error('AI ask error', err);
      setError('Failed to contact AI assistant.');
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: 'Sorry, the assistant is unavailable right now.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    const q = input.trim();
    if (!q) return;
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setInput('');

    // Ensure conversation exists for authenticated users
    if (isAuthenticated && !conversationId && token) {
      try {
        const r = await fetch(`${API_BASE}/ai/conversations`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ title: 'Conversation with Athena' }) });
        if (r.ok) {
          const p = await r.json();
          setConversationId(p.conversation.id);
        }
      } catch (err) {
        console.debug('Failed to create conversation', err);
      }
    }

    await ask(q);
    setOpen(true);
  };

  return (
    <>
      <button
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg bg-gradient-to-br from-amber-400 to-pink-500 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-pink-500"
        aria-label="Open AI Assistant"
        onClick={() => setOpen(true)}
      >
        <KangarooLogo />
        <span className="font-bold text-white text-base">AI</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />

          <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl w-full max-w-lg z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <KangarooLogo />
                <div>
                  <h3 className="font-bold text-lg">Gimbi AI Assistant</h3>
                  <div className="text-sm text-slate-500">
                    Ask for grants, application help, or resources.
                  </div>
                </div>
              </div>
              <button
                className="text-slate-400 hover:text-pink-500"
                onClick={() => setOpen(false)}
                aria-label="Close AI Assistant"
              >
                ×
              </button>
            </div>

            <div
              ref={logRef}
              className="max-h-64 overflow-y-auto mb-3 bg-slate-50 rounded-lg p-3 space-y-2"
            >
              {messages.length === 0 && (
                <div className="text-sm text-slate-400">
                  Say hello to Athena — type a question below.
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`text-sm p-2 rounded ${m.role === 'ai' ? 'bg-white' : 'bg-pink-50 text-slate-800'}`}
                >
                  {m.role === 'ai' ? (
                    <strong className="text-emerald-600">Athena:</strong>
                  ) : (
                    <strong className="text-pink-600">You:</strong>
                  )}{' '}
                  <span className="ml-2 whitespace-pre-wrap">{m.text}</span>
                </div>
              ))}
            </div>

            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void submit();
                  }
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="Ask Athena for help..."
                aria-label="Ask Athena"
              />
              <button
                className={`px-4 py-2 rounded-full text-white font-bold ${loading || input.trim() === '' ? 'bg-amber-200' : 'bg-amber-400 hover:scale-105'}`}
                onClick={() => void submit()}
                disabled={loading || input.trim() === ''}
              >
                {loading ? 'Thinking…' : 'Ask'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
