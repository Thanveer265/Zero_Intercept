import { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { getDeptWorkload, getStaffWorkload, getHourlyHeatmap, getWeeklyTrend } from '../services/api';
import PageHeader from '../components/PageHeader';
import ChartCard from '../components/ChartCard';
import LoadingSpinner from '../components/LoadingSpinner';

const COLORS = ['#0F766E', '#0284C7', '#10B981', '#D97706', '#DC2626', '#7C3AED'];

export default function WorkloadAnalytics({ embedded }) {
    const [deptData, setDeptData] = useState([]);
    const [staffData, setStaffData] = useState([]);
    const [heatmap, setHeatmap] = useState(null);
    const [weekly, setWeekly] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getDeptWorkload(), getStaffWorkload(), getHourlyHeatmap(), getWeeklyTrend()])
            .then(([d, s, h, w]) => { setDeptData(d); setStaffData(s); setHeatmap(h); setWeekly(w); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingSpinner />;

    const getHeatColor = (val, max) => {
        const ratio = val / (max || 1);
        if (ratio > 0.8) return '#991B1B';
        if (ratio > 0.6) return '#DC2626';
        if (ratio > 0.4) return '#F59E0B';
        if (ratio > 0.2) return '#22D3EE';
        return '#E5E7EB';
    };

    const maxHeat = heatmap ? Math.max(...heatmap.data.flat()) : 1;

    return (
        <div>
            {!embedded && <PageHeader title="Workload Analytics" subtitle="Department and staff workload analysis" icon={BarChart3} />}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <ChartCard title="Department Workload" subtitle="Total cases per department" delay={0}>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={deptData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} />
                            <YAxis dataKey="department" type="category" tick={{ fontSize: 11, fill: '#6B7280' }} width={85} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB' }} />
                            <Bar dataKey="total_cases" fill="#0F766E" radius={[0, 6, 6, 0]} name="Total" />
                            <Bar dataKey="active_cases" fill="#0284C7" radius={[0, 6, 6, 0]} name="Active" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Case Distribution" subtitle="Pie breakdown by department" delay={1}>
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie data={deptData} dataKey="total_cases" nameKey="department" cx="50%" cy="50%" outerRadius={100} innerRadius={60} paddingAngle={3}>
                                {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-3 mt-1">
                        {deptData.map((d, i) => (
                            <div key={d.department} className="flex items-center gap-1.5 text-xs">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                                <span className="text-text-secondary">{d.department}</span>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <ChartCard title="Weekly Trend" subtitle="Case volume across weeks" delay={2}>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={weekly}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#6B7280' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB' }} />
                            <Line type="monotone" dataKey="cases" stroke="#0F766E" strokeWidth={2} dot={{ fill: '#0F766E', r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Hourly Heatmap" subtitle="Case creation patterns by day × hour" delay={3}>
                    {heatmap && (
                        <div className="overflow-x-auto">
                            <div className="inline-block min-w-full">
                                <div className="flex gap-0.5">
                                    <div className="w-16" />
                                    {heatmap.hours.filter((_, i) => i % 3 === 0).map(h => (
                                        <div key={h} className="text-[9px] text-text-muted text-center" style={{ width: `${100 / 8}%` }}>{h}:00</div>
                                    ))}
                                </div>
                                {heatmap.days.map((day, di) => (
                                    <div key={day} className="flex items-center gap-0.5 mb-0.5">
                                        <div className="w-16 text-[10px] text-text-secondary font-medium truncate pr-1">{day.slice(0, 3)}</div>
                                        <div className="flex-1 flex gap-0.5">
                                            {heatmap.data[di].map((val, hi) => (
                                                <div
                                                    key={hi}
                                                    className="flex-1 h-5 rounded-sm transition-colors"
                                                    style={{ backgroundColor: getHeatColor(val, maxHeat) }}
                                                    title={`${day} ${hi}:00 — ${val} cases`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </ChartCard>
            </div>

            <ChartCard title="Top Staff by Caseload" subtitle="Staff members handling most cases" delay={4}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-2.5 px-3 text-xs font-semibold text-text-secondary">Name</th>
                                <th className="text-left py-2.5 px-3 text-xs font-semibold text-text-secondary">Department</th>
                                <th className="text-right py-2.5 px-3 text-xs font-semibold text-text-secondary">Cases</th>
                                <th className="text-right py-2.5 px-3 text-xs font-semibold text-text-secondary">Shift (h)</th>
                                <th className="text-right py-2.5 px-3 text-xs font-semibold text-text-secondary">Overtime (h)</th>
                                <th className="text-right py-2.5 px-3 text-xs font-semibold text-text-secondary">Avg Resolution</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staffData.slice(0, 10).map((s) => (
                                <tr key={s.staff_id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                    <td className="py-2 px-3 font-medium">{s.name}</td>
                                    <td className="py-2 px-3 text-text-secondary">{s.department}</td>
                                    <td className="py-2 px-3 text-right font-semibold">{s.cases_handled}</td>
                                    <td className="py-2 px-3 text-right">{s.shift_hours}</td>
                                    <td className="py-2 px-3 text-right">
                                        <span className={s.overtime_hours > 10 ? 'text-critical font-semibold' : ''}>{s.overtime_hours}</span>
                                    </td>
                                    <td className="py-2 px-3 text-right">{s.avg_resolution_time}h</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </ChartCard>
        </div>
    );
}
