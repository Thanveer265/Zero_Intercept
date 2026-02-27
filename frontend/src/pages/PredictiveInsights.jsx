import { useState, useEffect } from 'react';
import { BrainCircuit, TrendingUp, AlertTriangle, Users } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { getWorkloadForecast, getBurnoutPrediction, getSurgeDetection } from '../services/api';
import PageHeader from '../components/PageHeader';
import ChartCard from '../components/ChartCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { motion } from 'framer-motion';

export default function PredictiveInsights({ embedded }) {
    const [forecast, setForecast] = useState(null);
    const [burnout, setBurnout] = useState([]);
    const [surge, setSurge] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getWorkloadForecast(), getBurnoutPrediction(), getSurgeDetection()])
            .then(([f, b, s]) => { setForecast(f); setBurnout(b); setSurge(s); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingSpinner />;

    const chartData = forecast ? [
        ...forecast.historical.map(d => ({ ...d, type: 'historical' })),
        ...forecast.forecast.map(d => ({ date: d.date, cases: d.predicted_cases, predicted: d.predicted_cases, lower: d.lower_bound, upper: d.upper_bound, type: 'forecast' }))
    ] : [];

    return (
        <div>
            {!embedded && <PageHeader title="Predictive Insights" subtitle="AI-powered forecasting, burnout detection, and surge alerts" icon={BrainCircuit} />}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[
                    { icon: TrendingUp, label: 'Forecast Confidence', value: forecast?.forecast?.[0]?.confidence_pct || 0, unit: '%', color: 'from-primary to-primary-light' },
                    { icon: Users, label: 'High Burnout Staff', value: burnout.filter(b => b.risk_level === 'High' || b.risk_level === 'Critical').length, color: 'from-critical to-critical-light' },
                    { icon: AlertTriangle, label: 'Surge Days Detected', value: surge?.stats?.total_surge_days || 0, color: 'from-warning to-warning-light' },
                ].map((item, i) => (
                    <motion.div key={item.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                        className="bg-surface-card rounded-2xl p-5 border border-border shadow-sm flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg`}>
                            <item.icon size={22} className="text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary font-medium">{item.label}</p>
                            <p className="text-2xl font-bold text-text-primary">{item.value}{item.unit || ''}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <ChartCard title="Workload Forecast" subtitle="7-day predicted case volume with confidence bands" delay={1} className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6B7280' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB' }} />
                            <Area type="monotone" dataKey="upper" stroke="transparent" fill="#22D3EE" fillOpacity={0.1} />
                            <Area type="monotone" dataKey="lower" stroke="transparent" fill="#FFFFFF" fillOpacity={1} />
                            <Line type="monotone" dataKey="cases" stroke="#0F766E" strokeWidth={2} dot={{ fill: '#0F766E', r: 3 }} name="Actual/Predicted" />
                            <Line type="monotone" dataKey="predicted" stroke="#14B8A6" strokeWidth={2} strokeDasharray="6 3" dot={{ fill: '#14B8A6', r: 3 }} name="Forecast" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Burnout Risk Analysis" subtitle="Staff members by risk level" delay={2}>
                    <div className="max-h-80 overflow-y-auto space-y-2">
                        {burnout.slice(0, 15).map((s) => (
                            <div key={s.staff_id} className="flex items-center justify-between p-2.5 rounded-xl bg-surface hover:bg-surface/80 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{s.name}</p>
                                    <p className="text-xs text-text-secondary">{s.department} • {s.overtime_hours}h overtime</p>
                                </div>
                                <div className="flex items-center gap-2 ml-3">
                                    <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${s.risk_probability > 0.8 ? 'bg-red-500' : s.risk_probability > 0.6 ? 'bg-amber-500' : s.risk_probability > 0.3 ? 'bg-yellow-400' : 'bg-green-400'
                                            }`} style={{ width: `${s.risk_probability * 100}%` }} />
                                    </div>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.risk_level === 'Critical' ? 'bg-red-100 text-red-700' :
                                        s.risk_level === 'High' ? 'bg-amber-100 text-amber-700' :
                                            s.risk_level === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                                        }`}>{s.risk_level}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartCard>

                <ChartCard title="Surge Detection Alerts" subtitle="Anomalous case volume spikes" delay={3}>
                    {surge && surge.alerts.length > 0 ? (
                        <div className="max-h-80 overflow-y-auto space-y-2">
                            {surge.alerts.slice(0, 10).map((a, i) => (
                                <div key={i} className={`p-3 rounded-xl border ${a.severity === 'Critical' ? 'border-red-200 bg-red-50' :
                                    a.severity === 'High' ? 'border-amber-200 bg-amber-50' : 'border-yellow-200 bg-yellow-50'
                                    }`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-semibold">{a.date}</span>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.severity === 'Critical' ? 'bg-red-200 text-red-800' : a.severity === 'High' ? 'bg-amber-200 text-amber-800' : 'bg-yellow-200 text-yellow-800'
                                            }`}>{a.severity}</span>
                                    </div>
                                    <p className="text-xs text-text-secondary">{a.cases} cases (expected: {a.expected}) • +{a.deviation_pct}% deviation • z-score: {a.z_score}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-text-secondary py-8 text-center">No surge alerts detected</p>
                    )}
                </ChartCard>
            </div>
        </div>
    );
}
