import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { getResolutionTrend, getDelayedPercentage, getDeptEfficiency, getViolationRisk } from '../services/api';
import PageHeader from '../components/PageHeader';
import ChartCard from '../components/ChartCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ResolutionSLA({ embedded }) {
    const [trend, setTrend] = useState([]);
    const [delayed, setDelayed] = useState(null);
    const [efficiency, setEfficiency] = useState([]);
    const [risk, setRisk] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getResolutionTrend(), getDelayedPercentage(), getDeptEfficiency(), getViolationRisk()])
            .then(([t, d, e, r]) => { setTrend(t); setDelayed(d); setEfficiency(e); setRisk(r); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingSpinner />;

    return (
        <div>
            {!embedded && <PageHeader title="Resolution & SLA Intelligence" subtitle="Monitor resolution performance and SLA compliance" icon={Clock} />}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {delayed && [
                    { label: 'On-Time Rate', value: `${delayed.on_time_pct}%`, color: delayed.on_time_pct > 85 ? 'text-secondary' : 'text-critical' },
                    { label: 'Delayed Cases', value: delayed.delayed_count, color: 'text-warning' },
                    { label: 'Delay Rate', value: `${delayed.delayed_pct}%`, color: delayed.delayed_pct > 15 ? 'text-critical' : 'text-warning' },
                    { label: 'Total Resolved', value: delayed.total_resolved, color: 'text-primary' },
                ].map((item) => (
                    <div key={item.label} className="bg-surface-card rounded-2xl p-4 border border-border shadow-sm">
                        <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mb-1">{item.label}</p>
                        <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <ChartCard title="Resolution Trend" subtitle="Daily avg resolution time" delay={1}>
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={trend.slice(-30)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6B7280' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB' }} />
                            <Line type="monotone" dataKey="avg_resolution_hrs" stroke="#0F766E" strokeWidth={2} name="Avg Hours" />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Department Efficiency" subtitle="Efficiency score ranking" delay={2}>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={efficiency} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#6B7280' }} />
                            <YAxis dataKey="department" type="category" tick={{ fontSize: 11, fill: '#6B7280' }} width={85} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB' }} />
                            <Bar dataKey="efficiency_score" fill="#14B8A6" radius={[0, 6, 6, 0]} name="Efficiency" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            <ChartCard title="SLA Violation Risk" subtitle="Top cases at risk of SLA breach" delay={3}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-2.5 px-3 text-xs font-semibold text-text-secondary">Case ID</th>
                                <th className="text-left py-2.5 px-3 text-xs font-semibold text-text-secondary">Department</th>
                                <th className="text-left py-2.5 px-3 text-xs font-semibold text-text-secondary">Severity</th>
                                <th className="text-right py-2.5 px-3 text-xs font-semibold text-text-secondary">Hours Left</th>
                                <th className="text-right py-2.5 px-3 text-xs font-semibold text-text-secondary">Risk %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {risk.slice(0, 10).map((r) => (
                                <tr key={r.case_id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                    <td className="py-2 px-3 font-medium">#{r.case_id}</td>
                                    <td className="py-2 px-3 text-text-secondary">{r.department}</td>
                                    <td className="py-2 px-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                                            r.severity === 'High' ? 'bg-amber-100 text-amber-700' :
                                                r.severity === 'Medium' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                            }`}>{r.severity}</span>
                                    </td>
                                    <td className="py-2 px-3 text-right">{r.hours_remaining}h</td>
                                    <td className="py-2 px-3 text-right">
                                        <span className={`font-semibold ${r.risk_pct >= 70 ? 'text-critical' : r.risk_pct >= 50 ? 'text-warning' : 'text-secondary'}`}>
                                            {r.risk_pct}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </ChartCard>
        </div>
    );
}
