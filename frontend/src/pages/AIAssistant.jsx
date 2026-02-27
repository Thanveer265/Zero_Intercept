import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { queryAssistant } from '../services/api';
import PageHeader from '../components/PageHeader';

const SUGGESTIONS = [
    'Which departments are underperforming?',
    'Show burnout risk staff',
    'What are the root causes of delays?',
    'How is patient satisfaction?',
    'Give me a financial summary',
    'What is the current workload?',
];

export default function AIAssistant() {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! I\'m your Hospital Intelligence Assistant. Ask me about department performance, burnout risk, delays, finances, or any operational insights.', data: null }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (query = input) => {
        if (!query.trim()) return;
        const userMsg = { role: 'user', content: query };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await queryAssistant(query);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: res.response,
                insight: res.insight,
                data: res.data,
            }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error processing your query. Please try again.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-48px)]">
            <PageHeader title="AI Assistant" subtitle="Natural language queries for operational insights" icon={MessageSquare} />

            <div className="flex-1 bg-surface-card rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                                    <Bot size={16} className="text-white" />
                                </div>
                            )}
                            <div className={`max-w-[70%] ${msg.role === 'user'
                                ? 'bg-primary text-white rounded-2xl rounded-br-md px-4 py-3'
                                : 'bg-surface rounded-2xl rounded-bl-md px-4 py-3'}`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                {msg.insight && (
                                    <p className="text-xs mt-2 opacity-70 italic">💡 {msg.insight}</p>
                                )}
                                {msg.data && typeof msg.data === 'object' && !Array.isArray(msg.data) && (
                                    <div className="mt-2 bg-white/10 rounded-lg p-2 text-xs space-y-1">
                                        {Object.entries(msg.data).map(([k, v]) => (
                                            <div key={k} className="flex justify-between">
                                                <span className="opacity-70">{k.replace(/_/g, ' ')}</span>
                                                <span className="font-semibold">{typeof v === 'number' ? v.toLocaleString() : String(v)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {msg.data && Array.isArray(msg.data) && (
                                    <div className="mt-2 space-y-1">
                                        {msg.data.slice(0, 5).map((item, j) => (
                                            <div key={j} className="bg-white/10 rounded-lg p-2 text-xs flex justify-between">
                                                <span>{item.department || item.name}</span>
                                                <span className="font-semibold">{item.sla_compliance || item.overtime || item.staff_count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {msg.role === 'user' && (
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-secondary to-secondary-light flex items-center justify-center flex-shrink-0">
                                    <User size={16} className="text-white" />
                                </div>
                            )}
                        </motion.div>
                    ))}
                    {loading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                <Bot size={16} className="text-white" />
                            </div>
                            <div className="bg-surface rounded-2xl rounded-bl-md px-4 py-3">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>

                {/* Suggestions */}
                <div className="px-4 py-2 border-t border-border/50">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {SUGGESTIONS.map((s) => (
                            <button key={s} onClick={() => handleSend(s)}
                                className="px-3 py-1.5 rounded-full bg-surface text-xs text-text-secondary font-medium
                           whitespace-nowrap hover:bg-primary hover:text-white transition-colors cursor-pointer flex-shrink-0">
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Input */}
                <div className="p-4 border-t border-border">
                    <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about hospital operations..."
                            className="flex-1 px-4 py-3 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        <button type="submit" disabled={loading || !input.trim()}
                            className="px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white cursor-pointer hover:shadow-lg transition-all disabled:opacity-50">
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
