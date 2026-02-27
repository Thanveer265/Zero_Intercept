import { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, Flame, Zap, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { getAlerts } from '../services/api';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';

const iconMap = {
    'SLA Breach': ShieldAlert,
    'SLA Warning': ShieldAlert,
    'Burnout Risk': Flame,
    'Capacity Overload': Zap,
    'Efficiency Drop': TrendingDown,
};

const severityStyles = {
    Critical: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', badge: 'bg-red-100 text-red-800' },
    High: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', badge: 'bg-amber-100 text-amber-800' },
    Warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-800' },
};

export default function RiskAlerts({ embedded }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        getAlerts().then(setData).catch(console.error).finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingSpinner />;

    const filteredAlerts = data?.alerts?.filter(a => filter === 'all' || a.severity === filter) || [];

    return (
        <div>
            {!embedded && <PageHeader title="Risk & Alert Center" subtitle="Real-time operational risk monitoring" icon={AlertTriangle} />}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total Alerts', value: data?.summary?.total || 0, color: 'text-text-primary', bg: 'bg-surface-card' },
                    { label: 'Critical', value: data?.summary?.critical || 0, color: 'text-critical', bg: 'bg-red-50' },
                    { label: 'High', value: data?.summary?.high || 0, color: 'text-warning', bg: 'bg-amber-50' },
                    { label: 'Warning', value: data?.summary?.warning || 0, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                ].map((item, i) => (
                    <motion.div key={item.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                        className={`rounded-2xl p-4 border border-border shadow-sm ${item.bg} cursor-pointer hover:shadow-md transition-all`}
                        onClick={() => setFilter(item.label === 'Total Alerts' ? 'all' : item.label)}>
                        <p className="text-xs text-text-secondary font-medium">{item.label}</p>
                        <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                    </motion.div>
                ))}
            </div>

            <div className="bg-surface-card rounded-2xl border border-border shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold">Active Alerts ({filteredAlerts.length})</h3>
                    <div className="flex gap-1.5">
                        {['all', 'Critical', 'High', 'Warning'].map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${filter === f ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:bg-surface/80'
                                    }`}>
                                {f === 'all' ? 'All' : f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {filteredAlerts.map((alert, i) => {
                        const ss = severityStyles[alert.severity] || severityStyles.Warning;
                        const Icon = iconMap[alert.type] || AlertTriangle;
                        return (
                            <motion.div key={alert.id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                                className={`flex items-start gap-3 p-3 rounded-xl border ${ss.border} ${ss.bg} transition-all hover:shadow-sm`}>
                                <div className={`mt-0.5 ${ss.icon}`}><Icon size={18} /></div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-sm font-semibold text-text-primary">{alert.type}</span>
                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ss.badge}`}>{alert.severity}</span>
                                        <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded-full bg-white/60">{alert.department}</span>
                                    </div>
                                    <p className="text-xs text-text-secondary">{alert.message}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
