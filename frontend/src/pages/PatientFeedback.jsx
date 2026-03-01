import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Star, Send, TrendingUp } from 'lucide-react';
import axios from 'axios';

export default function PatientFeedback() {
    const [data, setData] = useState({ feedback: [], total: 0, avg_rating: 0, avg_sentiment: 0 });
    const [loading, setLoading] = useState(true);
    const user = JSON.parse(sessionStorage.getItem('zi_user') || '{}');

    // New feedback form
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [text, setText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const fetchFeedback = async () => {
        try {
            const dept = user.department ? `?department=${encodeURIComponent(user.department)}` : '';
            const res = await axios.get(`/api/patient/feedback${dept}`);
            setData(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchFeedback(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!rating || !text.trim()) return;
        setSubmitting(true);
        try {
            await axios.post('/api/patient/feedback', {
                department: user.department || 'General',
                feedback_text: text,
                rating,
            });
            setSubmitted(true);
            setRating(0); setText('');
            setTimeout(() => setSubmitted(false), 3000);
            fetchFeedback();
        } catch (err) { console.error(err); }
        finally { setSubmitting(false); }
    };

    const sentimentLabel = (s) => {
        if (s > 0.3) return { text: 'Positive', color: 'text-emerald-600', bg: 'bg-emerald-50' };
        if (s < -0.3) return { text: 'Negative', color: 'text-red-600', bg: 'bg-red-50' };
        return { text: 'Neutral', color: 'text-amber-600', bg: 'bg-amber-50' };
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                    <MessageSquare size={24} className="text-primary" /> Feedback
                </h1>
                <p className="text-sm text-text-secondary mt-1">Share your experience & view feedback</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                    <p className="text-2xl font-bold text-amber-700 flex items-center gap-1">
                        <Star size={20} fill="currentColor" /> {data.avg_rating || '—'}
                    </p>
                    <p className="text-xs text-amber-600">Average Rating</p>
                </div>
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                    <p className="text-2xl font-bold text-blue-700">{data.total}</p>
                    <p className="text-xs text-blue-600">Total Reviews</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <p className="text-2xl font-bold text-emerald-700 flex items-center gap-1">
                        <TrendingUp size={18} /> {data.avg_sentiment > 0 ? '+' : ''}{data.avg_sentiment || '—'}
                    </p>
                    <p className="text-xs text-emerald-600">Avg Sentiment</p>
                </div>
            </div>

            {/* Submit form */}
            <form onSubmit={handleSubmit} className="p-5 rounded-2xl bg-surface-card border border-border space-y-4">
                <h3 className="text-sm font-bold text-text-primary">Submit Feedback</h3>

                {/* Star rating */}
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                        <button
                            key={s} type="button"
                            onMouseEnter={() => setHoverRating(s)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(s)}
                            className="cursor-pointer transition-transform hover:scale-110"
                        >
                            <Star
                                size={28}
                                className={`transition-colors ${(hoverRating || rating) >= s ? 'text-amber-400' : 'text-slate-200'}`}
                                fill={(hoverRating || rating) >= s ? 'currentColor' : 'none'}
                            />
                        </button>
                    ))}
                    <span className="ml-2 text-sm text-text-muted self-center">
                        {rating > 0 ? `${rating}/5` : 'Click to rate'}
                    </span>
                </div>

                <textarea
                    value={text} onChange={e => setText(e.target.value)}
                    placeholder="Tell us about your experience..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                />

                {submitted && (
                    <p className="text-emerald-600 text-xs bg-emerald-50 px-3 py-2 rounded-lg">✓ Thank you for your feedback!</p>
                )}

                <button
                    type="submit" disabled={submitting || !rating || !text.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-sm
                        shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50 transition-all"
                >
                    <Send size={14} /> {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
            </form>

            {/* Feedback list */}
            {loading ? (
                <div className="text-center py-12 text-text-muted">Loading feedback...</div>
            ) : (
                <div className="space-y-2">
                    <h3 className="text-sm font-bold text-text-primary">Recent Feedback ({data.total})</h3>
                    {data.feedback.slice(0, 25).map((f, i) => {
                        const sent = sentimentLabel(f.sentiment_score);
                        return (
                            <motion.div
                                key={f.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.02 }}
                                className="p-4 rounded-xl bg-surface-card border border-border"
                            >
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <Star key={s} size={12}
                                                className={s <= f.rating ? 'text-amber-400' : 'text-slate-200'}
                                                fill={s <= f.rating ? 'currentColor' : 'none'} />
                                        ))}
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${sent.bg} ${sent.color}`}>
                                        {sent.text}
                                    </span>
                                    <span className="text-[10px] text-text-muted ml-auto">{f.department}</span>
                                </div>
                                <p className="text-xs text-text-secondary leading-relaxed">{f.text}</p>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
