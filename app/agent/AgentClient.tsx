'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { sendMessage } from './actions';

type Message = { role: 'user' | 'assistant'; content: string };

const QUICK_QUESTIONS = [
  'Co mam dziś ugotować?',
  'Co kupić w sobotę?',
  'Co się kończy w lodówce?',
  'Ile białka miałem w tym tygodniu?',
  'Kiedy płacę czynsz?',
  'Ile wydałem w tym miesiącu?',
  'Mam kurczaka i makaron — co ugotować?',
];

export default function AgentClient() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Cześć! Jestem Agentem Loszki. Znam Wasz plan obiadów, spiżarnię, budżet i rachunki. Możesz też wysłać mi zdjęcie paragonu — przeanalizuję co kupiłeś! 🏠',
    },
  ]);
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const [pendingImage, setPendingImage] = useState<{ base64: string; mime: string; preview: string } | null>(null);
  const [pendingFile, setPendingFile] = useState<{ base64: string; mime: string; name: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function compressImage(file: File, maxPx = 1280, quality = 0.75): Promise<{ base64: string; mime: string; preview: string }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const [meta, base64] = dataUrl.split(',');
        const mime = meta.match(/:(.*?);/)?.[1] || 'image/jpeg';
        resolve({ base64, mime, preview: dataUrl });
      };
      img.onerror = reject;
      img.src = objectUrl;
    });
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const compressed = await compressImage(file);
      setPendingImage(compressed);
      setInput(prev => prev || 'Przeanalizuj ten paragon i wypisz produkty');
    } catch {
      alert('Nie udało się wczytać zdjęcia. Spróbuj ponownie.');
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [meta, base64] = dataUrl.split(',');
      const mime = meta.match(/:(.*?);/)?.[1] || 'application/octet-stream';
      setPendingFile({ base64, mime, name: file.name });
      setPendingImage(null);
      setInput(prev => prev || `Przeanalizuj ten plik: ${file.name}`);
    };
    reader.readAsDataURL(file);
  }

  function handleSend(text?: string) {
    const msg = (text || input).trim();
    if (!msg && !pendingImage && !pendingFile) return;
    setInput('');

    let displayMsg = msg;
    if (pendingImage) displayMsg = `📸 ${msg || 'Zdjęcie'}`;
    if (pendingFile) displayMsg = `📄 ${msg || pendingFile.name}`;

    const newMessages: Message[] = [...messages, { role: 'user', content: displayMsg }];
    setMessages(newMessages);

    const img = pendingImage;
    const file = pendingFile;
    setPendingImage(null);
    setPendingFile(null);

    // Który załącznik idzie do API? Plik ma priorytet nad zdjęciem
    const attachBase64 = file?.base64 ?? img?.base64;
    const attachMime   = file?.mime   ?? img?.mime;

    startTransition(async () => {
      const apiMessages = [...messages, { role: 'user' as const, content: msg || displayMsg }];
      const response = await sendMessage(apiMessages.slice(-10), attachBase64, attachMime);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-zinc-200 bg-white">
        <h1 className="text-xl font-bold text-zinc-800">🤖 Agent Loszki</h1>
        <p className="text-xs text-zinc-400 mt-0.5">Plan obiadów · spiżarnia · budżet · rachunki · analiza paragonów</p>
      </div>

      {/* Quick questions */}
      <div className="px-6 pt-4 flex flex-wrap gap-2 bg-zinc-50 border-b border-zinc-100">
        {QUICK_QUESTIONS.map(q => (
          <button
            key={q}
            onClick={() => handleSend(q)}
            disabled={isPending}
            className="text-xs px-3 py-1.5 rounded-full bg-white border border-zinc-200 text-zinc-600 hover:border-emerald-400 hover:text-emerald-700 transition-colors disabled:opacity-50"
          >
            {q}
          </button>
        ))}
        <div className="w-full pb-3" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-emerald-600 text-white rounded-br-sm'
                : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-sm'
            }`}>
              <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
            </div>
          </div>
        ))}
        {isPending && (
          <div className="flex justify-start">
            <div className="bg-white border border-zinc-200 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Podgląd zdjęcia */}
      {pendingImage && (
        <div className="px-6 pb-2">
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pendingImage.preview} alt="podgląd" className="w-12 h-12 object-cover rounded-lg" />
            <p className="text-sm text-emerald-700 flex-1">Zdjęcie gotowe do wysłania</p>
            <button onClick={() => setPendingImage(null)} className="text-zinc-400 hover:text-zinc-700 text-lg">✕</button>
          </div>
        </div>
      )}

      {/* Podgląd pliku PDF/doc */}
      {pendingFile && (
        <div className="px-6 pb-2">
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
            <span className="text-2xl">📄</span>
            <p className="text-sm text-blue-700 flex-1 truncate">{pendingFile.name}</p>
            <button onClick={() => setPendingFile(null)} className="text-zinc-400 hover:text-zinc-700 text-lg">✕</button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-3 border-t border-zinc-200 bg-white flex flex-col gap-2">
        {/* Linia 1 — przyciski załączników */}
        <div className="flex gap-2">
          {/* Aparat — otwiera kamerę */}
          <input type="file" ref={cameraRef} accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
          {/* Skan dokumentu — kamera w trybie skanowania (iOS/Android) */}
          <input type="file" ref={scanRef} accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
          {/* Galeria — wybierz zdjęcie z dysku/galerii */}
          <input type="file" ref={fileRef} accept="image/*" onChange={handleImageChange} className="hidden" />
          {/* Pliki — PDF, DOC, TXT */}
          <input type="file" ref={pdfRef} accept=".pdf,.doc,.docx,.txt" onChange={handleFileChange} className="hidden" />
          <button
            onClick={() => cameraRef.current?.click()}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 rounded-xl text-xs text-zinc-500 hover:text-zinc-800 hover:border-zinc-400 transition-colors disabled:opacity-50"
            title="Zrób zdjęcie aparatem"
          >
            📷 <span>Aparat</span>
          </button>
          <button
            onClick={() => scanRef.current?.click()}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 rounded-xl text-xs text-zinc-500 hover:text-zinc-800 hover:border-zinc-400 transition-colors disabled:opacity-50"
            title="Skanuj dokument"
          >
            🔍 <span>Skan</span>
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 rounded-xl text-xs text-zinc-500 hover:text-zinc-800 hover:border-zinc-400 transition-colors disabled:opacity-50"
            title="Wybierz zdjęcie z galerii"
          >
            🖼️ <span>Galeria</span>
          </button>
          <button
            onClick={() => pdfRef.current?.click()}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 rounded-xl text-xs text-zinc-500 hover:text-zinc-800 hover:border-zinc-400 transition-colors disabled:opacity-50"
            title="Wgraj PDF lub dokument"
          >
            📄 <span>Plik</span>
          </button>
        </div>
        {/* Linia 2 — pole tekstowe + wyślij */}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Napisz cokolwiek… (Enter = wyślij)"
            rows={1}
            className="flex-1 px-4 py-2.5 text-sm border border-zinc-200 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            onClick={() => handleSend()}
            disabled={isPending || (!input.trim() && !pendingImage && !pendingFile)}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            Wyślij
          </button>
        </div>
      </div>
    </div>
  );
}

