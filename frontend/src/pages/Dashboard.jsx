import { useState, useEffect } from 'react';
import { LayoutDashboard, Activity, CheckCircle, Clock, ShieldCheck, AlertTriangle, HeartPulse } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { getDashboardSummary, getDeptWorkload, getWeeklyTrend } from '../services/api';
import KPICard from '../components/KPICard';
import PageHeader from '../components/PageHeader';
import ChartCard from '../components/ChartCard';
import LoadingSpinner from '../components/LoadingSpinner';

const COLORS = ['#0F766E', '#0284C7', '#10B981', '#D97706', '#DC2626', '#7C3AED'];

export default function Dashboard() {
    const [summary, setSummary] = useState(null);
    const [deptWork, setDeptWork] = useState([]);
    const [weeklyData, setWeeklyData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getDashboardSummary(), getDeptWorkload(), getWeeklyTrend()])
            .then(([s, d, w]) => { setSummary(s); setDeptWork(d); setWeeklyData(w); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingSpinner />;

    const kpis = summary ? [
        { title: 'Active Cases', value: summary.active_cases, icon: Activity, color: 'primary', trend: summary.trends?.cases_trend },
        { title: 'Resolved Cases', value: summary.resolved_cases, icon: CheckCircle, color: 'green' },
        { title: 'Avg Resolution', value: summary.avg_resolution_time_hrs, unit: 'hrs', icon: Clock, color: 'accent' },
        { title: 'SLA Compliance', value: summary.sla_compliance_pct, unit: '%', icon: ShieldCheck, color: 'secondary', trend: summary.trends?.sla_trend },
        { title: 'Burnout Risk', value: summary.burnout_risk_pct, unit: '%', icon: AlertTriangle, color: 'warning', trend: summary.trends?.burnout_trend },
        { title: 'Health Index', value: summary.health_index, unit: '/100', icon: HeartPulse, color: summary.health_index > 70 ? 'green' : 'critical' },
    ] : [];

    return (
        <div>
            <PageHeader title="Executive Dashboard" subtitle="Real-time hospital operational intelligence" icon={LayoutDashboard} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
                {kpis.map((kpi, i) => (
                    <KPICard key={kpi.title} {...kpi} delay={i} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <ChartCard title="Department Workload" subtitle="Active vs total cases by department" delay={1}>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={deptWork}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#CCFBF1" />
                            <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#6B7280' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                            <Bar dataKey="total_cases" fill="#0F766E" radius={[6, 6, 0, 0]} name="Total" />
                            <Bar dataKey="active_cases" fill="#0284C7" radius={[6, 6, 0, 0]} name="Active" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Weekly Case Trend" subtitle="Case volume over recent weeks" delay={2}>
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={weeklyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#CCFBF1" />
                            <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#6B7280' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB' }} />
                            <Line type="monotone" dataKey="cases" stroke="#0F766E" strokeWidth={2} dot={{ fill: '#0F766E', r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <ChartCard title="Cases by Department" subtitle="Distribution of total cases" delay={3}>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={deptWork} dataKey="total_cases" nameKey="department" cx="50%" cy="50%" outerRadius={90} innerRadius={55} paddingAngle={3}>
                                {deptWork.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                        {deptWork.map((d, i) => (
                            <div key={d.department} className="flex items-center gap-1.5 text-xs">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                                <span className="text-text-secondary">{d.department}</span>
                            </div>
                        ))}
                    </div>
                </ChartCard>

                <ChartCard title="System Status" subtitle="Current operational overview" delay={4} className="lg:col-span-2">
                    {summary && (
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Total Cases', value: summary.total_cases, color: 'text-primary' },
                                { label: 'Resolution Rate', value: `${((summary.resolved_cases / summary.total_cases) * 100).toFixed(1)}%`, color: 'text-secondary' },
                                { label: 'Open Cases', value: summary.active_cases, color: 'text-warning' },
                                { label: 'Avg Resolution', value: `${summary.avg_resolution_time_hrs}h`, color: 'text-accent' },
                            ].map((item) => (
                                <div key={item.label} className="bg-surface rounded-xl p-4">
                                    <p className="text-xs text-text-secondary mb-1">{item.label}</p>
                                    <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </ChartCard>
            </div>
        </div>
    );
}
