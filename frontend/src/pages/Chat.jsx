import { useState, useRef, useEffect } from 'react';
import api from '../api/client';
import { Send, Bot, User } from 'lucide-react';

export default function Chat() {
  const [msgs, setMsgs] = useState([
    { role: 'bot', text: 'Bonjour 👋 Je suis l\'assistant TontineDigital. Comment puis-je vous aider ?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async () => {
    if (!input.trim()) return;
    const question = input;
    setMsgs((prev) => [...prev, { role: 'user', text: question }]);
    setInput(''); setLoading(true);
    try {
      const { data } = await api.post('/chat', { question });
      setMsgs((prev) => [...prev, { role: 'bot', text: data.answer, engine: data.engine }]);
    } catch {
      setMsgs((prev) => [...prev, { role: 'bot', text: 'Désolé, une erreur est survenue.' }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    'Quel est mon score ?',
    'Ma prochaine cotisation',
    'Comment créer une tontine ?',
    'Comment fonctionne la sécurité ?',
  ];

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Assistant</h1>
        <p className="text-slate-500 mt-1">Posez vos questions à l'assistant TontineDigital.</p>
      </div>

      <div className="card flex flex-col h-[60vh]">
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {msgs.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role === 'bot' && (
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                  <Bot size={16} />
                </div>
              )}
              <div className={`px-4 py-2 rounded-2xl max-w-[80%] whitespace-pre-line ${
                m.role === 'user' ? 'bg-primary-600 text-white' : 'bg-slate-100'
              }`}>
                {m.text}
              </div>
              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <User size={16} />
                </div>
              )}
            </div>
          ))}
          {loading && <div className="text-sm text-slate-400 italic">L'assistant réfléchit…</div>}
          <div ref={endRef} />
        </div>
        <div className="border-t p-3">
          <div className="flex gap-2 mb-2 flex-wrap">
            {suggestions.map((s) => (
              <button key={s} onClick={() => setInput(s)} className="text-xs px-2 py-1 rounded-full bg-slate-100 hover:bg-slate-200">
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Posez votre question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button onClick={send} className="btn-primary"><Send size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
