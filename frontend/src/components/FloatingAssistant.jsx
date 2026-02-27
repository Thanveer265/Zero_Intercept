import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, User, Stethoscope, Sparkles } from 'lucide-react';
import { queryAssistant } from '../services/api';

const SUGGESTIONS = [
    'Which departments are underperforming?',
    'Show burnout risk staff',
    'What are the root causes of delays?',
    'How is patient satisfaction?',
    'Give me a financial summary',
    'What is the current workload?',
];

export default function FloatingAssistant() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hello! I'm MedBot — your Hospital Intelligence Assistant. Ask me anything about operations, staff, finances, or patient insights.", data: null }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (query = input) => {
        if (!query.trim()) return;
        setMessages(prev => [...prev, { role: 'user', content: query }]);
        setInput('');
        setLoading(true);
        try {
            const res = await queryAssistant(query);
            setMessages(prev => [...prev, {
                role: 'assistant', content: res.response,
                insight: res.insight, data: res.data,
            }]);
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
        } finally { setLoading(false); }
    };

    return (
        <>
            {/* Floating Button */}
            <AnimatePresence>
                {!open && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setOpen(true)}
                        className="fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-2xl
                       bg-gradient-to-br from-primary to-primary-dark
                       text-white shadow-2xl shadow-primary/40
                       flex items-center justify-center cursor-pointer
                       group transition-shadow hover:shadow-primary/60"
                        title="MedBot — AI Assistant"
                    >
                        <Stethoscope size={24} className="group-hover:hidden transition-all" />
                        <Sparkles size={24} className="hidden group-hover:block transition-all" />

                        {/* Pulse ring */}
                        <span className="absolute inset-0 rounded-2xl animate-ping bg-primary/20 pointer-events-none" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Panel */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-6 right-6 z-[100] w-[420px] h-[600px]
                       bg-surface-card rounded-3xl border border-border
                       shadow-2xl shadow-black/15 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-primary to-primary-dark text-white rounded-t-3xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                    <Stethoscope size={22} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold">MedBot</h3>
                                    <p className="text-[10px] text-white/70">Hospital Intelligence Assistant</p>
                                </div>
                            </div>
                            <button onClick={() => setOpen(false)}
                                className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                            {messages.map((msg, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                    className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                    {msg.role === 'assistant' && (
                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Bot size={14} className="text-white" />
                                        </div>
                                    )}
                                    <div className={`max-w-[80%] ${msg.role === 'user'
                                        ? 'bg-primary text-white rounded-2xl rounded-br-md px-3.5 py-2.5'
                                        : 'bg-surface rounded-2xl rounded-bl-md px-3.5 py-2.5'}`}>
                                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                        {msg.insight && (
                                            <p className="text-[11px] mt-1.5 opacity-70 italic">💡 {msg.insight}</p>
                                        )}
                                        {msg.data && typeof msg.data === 'object' && !Array.isArray(msg.data) && (
                                            <div className="mt-2 bg-white/10 rounded-lg p-2 text-[11px] space-y-0.5">
                                                {Object.entries(msg.data).slice(0, 6).map(([k, v]) => (
                                                    <div key={k} className="flex justify-between">
                                                        <span className="opacity-70">{k.replace(/_/g, ' ')}</span>
                                                        <span className="font-semibold">{typeof v === 'number' ? v.toLocaleString('en-IN') : String(v)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {msg.data && Array.isArray(msg.data) && (
                                            <div className="mt-2 space-y-0.5">
                                                {msg.data.slice(0, 4).map((item, j) => (
                                                    <div key={j} className="bg-white/10 rounded-lg p-1.5 text-[11px] flex justify-between">
                                                        <span>{item.department || item.name}</span>
                                                        <span className="font-semibold">{item.sla_compliance || item.overtime || item.staff_count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-secondary to-secondary-light flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <User size={14} className="text-white" />
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                            {loading && (
                                <div className="flex gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                        <Bot size={14} className="text-white" />
                                    </div>
                                    <div className="bg-surface rounded-2xl rounded-bl-md px-3.5 py-2.5">
                                        <div className="flex gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={scrollRef} />
                        </div>

                        {/* Quick Suggestions */}
                        <div className="px-3 py-1.5 border-t border-border/50">
                            <div className="flex gap-1.5 overflow-x-auto pb-1">
                                {SUGGESTIONS.map((s) => (
                                    <button key={s} onClick={() => handleSend(s)}
                                        className="px-2.5 py-1 rounded-full bg-surface text-[11px] text-text-secondary font-medium
                               whitespace-nowrap hover:bg-primary hover:text-white transition-colors cursor-pointer flex-shrink-0">
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Input */}
                        <div className="px-3 pb-3 pt-1.5">
                            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                                <input value={input} onChange={e => setInput(e.target.value)}
                                    placeholder="Ask MedBot..."
                                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                <button type="submit" disabled={loading || !input.trim()}
                                    className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white
                             cursor-pointer hover:shadow-lg transition-all disabled:opacity-40">
                                    <Send size={16} />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
