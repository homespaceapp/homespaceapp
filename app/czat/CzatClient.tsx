'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { sendChatMessage, getMessages } from './actions';

type Message = { id: string; owner: string; text: string; created_at: string };

const ownerStyles: Record<string, string> = {
  adrian: 'bg-blue-500 text-white',
  kasia: 'bg-pink-400 text-white',
};

export default function CzatClient({ initialMessages }: { initialMessages: Message[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [owner, setOwner] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('czat_owner') || 'adrian';
    return 'adrian';
  });
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('czat_owner', owner);
  }, [owner]);

  // Polling co 5 sekund
  useEffect(() => {
    const interval = setInterval(async () => {
      const latest = await getMessages();
      setMessages(latest as Message[]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    startTransition(async () => {
      await sendChatMessage(owner, text);
      const latest = await getMessages();
      setMessages(latest as Message[]);
    });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-200 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-800">💬 Czat</h1>
          <p className="text-xs text-zinc-400">Adrian & Kasia</p>
        </div>
        <div className="flex gap-2">
          {['adrian', 'kasia'].map(o => (
            <button
              key={o}
              onClick={() => setOwner(o)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${owner === o ? ownerStyles[o] : 'bg-zinc-100 text-zinc-500'}`}
            >
              {o === 'adrian' ? 'Adrian' : 'Kasia'}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-zinc-400 text-sm">Brak wiadomości — napisz coś!</p>
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.owner === owner;
          const time = new Date(msg.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2 items-end`}>
              {!isMe && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold shrink-0 mb-1 ${ownerStyles[msg.owner] || 'bg-zinc-200 text-zinc-600'}`}>
                  {msg.owner === 'adrian' ? 'A' : 'K'}
                </span>
              )}
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? `${ownerStyles[owner] || 'bg-zinc-600 text-white'} rounded-br-sm` : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-sm'}`}>
                <p className="leading-relaxed">{msg.text}</p>
                <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-zinc-400'}`}>{time}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-zinc-200 bg-white">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Piszesz jako ${owner === 'adrian' ? 'Adrian' : 'Kasia'}…`}
            rows={1}
            className="flex-1 px-4 py-2.5 text-sm border border-zinc-200 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            onClick={handleSend}
            disabled={isPending || !input.trim()}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            Wyślij
          </button>
        </div>
      </div>
    </div>
  );
}
