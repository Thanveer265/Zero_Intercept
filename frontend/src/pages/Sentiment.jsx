import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { getSentiment } from '../services/api';
import PageHeader from '../components/PageHeader';
import ChartCard from '../components/ChartCard';
import LoadingSpinner from '../components/LoadingSpinner';

const COLORS = { positive: '#14B8A6', neutral: '#F59E0B', negative: '#EF4444' };

export default function Sentiment({ embedded }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSentiment().then(setData).catch(console.error).finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingSpinner />;

    const pieData = data?.overall ? [
        { name: 'Positive', value: data.overall.sentiment_distribution.positive },
        { name: 'Neutral', value: data.overall.sentiment_distribution.neutral },
        { name: 'Negative', value: data.overall.sentiment_distribution.negative },
    ] : [];

    return (
        <div>
            {!embedded && <PageHeader title="Sentiment Intelligence" subtitle="NLP-powered patient feedback analysis" icon={Heart} />}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {data?.overall && [
                    { label: 'Avg Sentiment', value: data.overall.avg_score, color: data.overall.avg_score > 0 ? 'text-secondary' : 'text-critical' },
                    { label: 'Total Feedback', value: data.overall.total_feedback, color: 'text-primary' },
                    { label: 'Negative Count', value: data.overall.sentiment_distribution.negative, color: 'text-critical' },
                ].map((item, i) => (
                    <motion.div key={item.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                        className="bg-surface-card rounded-2xl p-4 border border-border shadow-sm text-center">
                        <p className="text-xs text-text-secondary font-medium mb-1">{item.label}</p>
                        <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <ChartCard title="Sentiment Distribution" delay={1}>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={55} paddingAngle={3}>
                                {pieData.map((entry) => <Cell key={entry.name} fill={COLORS[entry.name.toLowerCase()]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-2">
                        {pieData.map((d) => (
                            <div key={d.name} className="flex items-center gap-1.5 text-xs">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[d.name.toLowerCase()] }} />
                                <span className="text-text-secondary">{d.name}: {d.value}</span>
                            </div>
                        ))}
                    </div>
                </ChartCard>

                <ChartCard title="Department Dissatisfaction" subtitle="Ranked by negative feedback %" delay={2}>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={data?.departments || []} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} />
                            <YAxis dataKey="department" type="category" tick={{ fontSize: 11, fill: '#6B7280' }} width={85} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB' }} />
                            <Bar dataKey="dissatisfaction_pct" fill="#EF4444" radius={[0, 6, 6, 0]} name="Dissatisfaction %" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            <ChartCard title="Negative Feedback Samples" subtitle="Recent negative feedback by department" delay={3}>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {data?.departments?.flatMap(d => d.negative_samples.map(s => ({ ...s, department: d.department }))).slice(0, 15).map((f, i) => (
                        <div key={i} className="p-3 rounded-xl bg-red-50 border border-red-100">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-text-primary">{f.department}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-text-muted">Rating: {f.rating}/5</span>
                                    <span className="text-xs font-medium text-critical">Score: {f.score}</span>
                                </div>
                            </div>
                            <p className="text-xs text-text-secondary italic">"{f.text}"</p>
                        </div>
                    ))}
                </div>
            </ChartCard>
        </div>
    );
}
