import { useState, useEffect } from 'react';
import { Cpu, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { getOptimization } from '../services/api';
import PageHeader from '../components/PageHeader';
import ChartCard from '../components/ChartCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function OptimizationEngine({ embedded }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getOptimization().then(setData).catch(console.error).finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingSpinner />;

    return (
        <div>
            {!embedded && <PageHeader title="Optimization Engine" subtitle="AI-generated optimal staffing and resource allocation" icon={Cpu} />}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {data && [
                    { label: 'Total Staff', value: data.summary.total_staff, color: 'text-primary' },
                    { label: 'Active Cases', value: data.summary.total_active_cases, color: 'text-warning' },
                    { label: 'Avg Cases/Staff', value: data.summary.avg_cases_per_staff, color: 'text-secondary' },
                ].map((item, i) => (
                    <motion.div key={item.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                        className="bg-surface-card rounded-2xl p-4 border border-border shadow-sm text-center">
                        <p className="text-xs text-text-secondary font-medium mb-1">{item.label}</p>
                        <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                    </motion.div>
                ))}
            </div>

            <ChartCard title="Staffing Allocations" subtitle="Current vs optimal staffing by department" delay={1} className="mb-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                {['Department', 'Current', 'Optimal', 'Gap', 'Active Cases', 'Cases/Staff', 'SLA %', 'Priority'].map(h => (
                                    <th key={h} className="py-2.5 px-3 text-xs font-semibold text-text-secondary text-left">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data?.allocations?.map((r) => (
                                <tr key={r.department} className="border-b border-border/50 hover:bg-surface transition-colors">
                                    <td className="py-2 px-3 font-medium">{r.department}</td>
                                    <td className="py-2 px-3">{r.current_staff}</td>
                                    <td className="py-2 px-3 font-semibold text-primary">{r.optimal_staff}</td>
                                    <td className="py-2 px-3">
                                        <span className={`font-semibold ${r.staff_gap > 0 ? 'text-critical' : r.staff_gap < 0 ? 'text-secondary' : ''}`}>
                                            {r.staff_gap > 0 ? '+' : ''}{r.staff_gap}
                                        </span>
                                    </td>
                                    <td className="py-2 px-3">{r.active_cases}</td>
                                    <td className="py-2 px-3">{r.cases_per_staff}</td>
                                    <td className="py-2 px-3">{r.sla_compliance_pct}%</td>
                                    <td className="py-2 px-3">
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.priority === 'High' ? 'bg-red-100 text-red-700' :
                                            r.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                                            }`}>{r.priority}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </ChartCard>

            <ChartCard title="Optimization Suggestions" subtitle="AI-generated recommendations" delay={2}>
                <div className="space-y-3">
                    {data?.suggestions?.map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                            className="p-4 rounded-xl bg-surface border-l-4 border-primary hover:shadow-sm transition-all">
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                                    <ArrowUpRight size={14} className="text-primary" /> {s.type}
                                </h4>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.impact === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                    }`}>{s.impact} Impact</span>
                            </div>
                            <p className="text-xs text-text-secondary mb-1">{s.description}</p>
                            <p className="text-xs text-secondary font-medium">{s.estimated_improvement}</p>
                        </motion.div>
                    ))}
                </div>
            </ChartCard>
        </div>
    );
}
