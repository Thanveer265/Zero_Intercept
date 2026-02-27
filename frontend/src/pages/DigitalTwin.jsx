import { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { getDigitalTwinState } from '../services/api';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';

const statusColors = {
    Critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-800', bar: 'bg-red-500' },
    Warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800', bar: 'bg-amber-500' },
    Normal: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800', bar: 'bg-blue-500' },
    Low: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-800', bar: 'bg-green-500' },
};

export default function DigitalTwin({ embedded }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getDigitalTwinState().then(setData).catch(console.error).finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingSpinner />;

    return (
        <div>
            {!embedded && <PageHeader title="Digital Twin" subtitle="Real-time department operational state visualization" icon={Building2} />}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {data?.departments?.map((dept, i) => {
                    const sc = statusColors[dept.status] || statusColors.Normal;
                    return (
                        <motion.div
                            key={dept.department}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.08 }}
                            className={`rounded-2xl p-5 border ${sc.border} ${sc.bg} shadow-sm hover:shadow-md transition-all`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-bold text-text-primary">{dept.department}</h3>
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sc.badge}`}>{dept.status}</span>
                            </div>

                            <div className="mb-3">
                                <div className="flex justify-between text-xs text-text-secondary mb-1">
                                    <span>Load</span>
                                    <span className="font-semibold">{dept.load_pct}%</span>
                                </div>
                                <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, dept.load_pct)}%` }}
                                        transition={{ duration: 1, delay: i * 0.1 }}
                                        className={`h-full rounded-full ${sc.bar}`}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-white/60 rounded-lg p-2">
                                    <span className="text-text-secondary">Active</span>
                                    <p className="font-bold text-text-primary">{dept.active_cases}</p>
                                </div>
                                <div className="bg-white/60 rounded-lg p-2">
                                    <span className="text-text-secondary">Resolved</span>
                                    <p className="font-bold text-text-primary">{dept.resolved_cases}</p>
                                </div>
                                <div className="bg-white/60 rounded-lg p-2">
                                    <span className="text-text-secondary">Staff</span>
                                    <p className="font-bold text-text-primary">{dept.staff_count}</p>
                                </div>
                                <div className="bg-white/60 rounded-lg p-2">
                                    <span className="text-text-secondary">Overtime</span>
                                    <p className="font-bold text-text-primary">{dept.avg_overtime}h</p>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Dependency Graph */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="bg-surface-card rounded-2xl p-5 border border-border shadow-sm">
                <h3 className="text-sm font-semibold text-text-primary mb-4">Inter-Department Dependencies</h3>
                <div className="space-y-2">
                    {data?.dependencies?.map((dep, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface hover:bg-surface/80 transition-colors">
                            <span className="text-sm font-semibold text-primary min-w-[100px]">{dep.from}</span>
                            <div className="flex-1 flex items-center gap-2">
                                <div className="flex-1 h-1 bg-gradient-to-r from-primary via-accent to-secondary rounded-full relative">
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-secondary rounded-full" />
                                </div>
                            </div>
                            <span className="text-sm font-semibold text-secondary min-w-[100px] text-right">{dep.to}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{dep.type}</span>
                            <span className="text-xs text-text-muted">{Math.round(dep.strength * 100)}%</span>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
