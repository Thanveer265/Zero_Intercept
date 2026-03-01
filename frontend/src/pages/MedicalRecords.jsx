import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Clock, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';

const STATUS_STYLE = {
    'Open': { bg: 'bg-blue-50', text: 'text-blue-700', icon: Clock },
    'In Progress': { bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertCircle },
    'Resolved': { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2 },
    'Escalated': { bg: 'bg-red-50', text: 'text-red-700', icon: AlertTriangle },
};

const SEVERITY_STYLE = {
    'Low': 'bg-green-100 text-green-700',
    'Medium': 'bg-yellow-100 text-yellow-700',
    'High': 'bg-orange-100 text-orange-700',
    'Critical': 'bg-red-100 text-red-700',
};

export default function MedicalRecords() {
    const [data, setData] = useState({ cases: [], total: 0 });
    const [loading, setLoading] = useState(true);
    const user = JSON.parse(sessionStorage.getItem('zi_user') || '{}');

    useEffect(() => {
        (async () => {
            try {
                const dept = user.department ? `?department=${encodeURIComponent(user.department)}` : '';
                const res = await axios.get(`/api/patient/cases${dept}`);
                setData(res.data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        })();
    }, []);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                    <FileText size={24} className="text-primary" /> Medical Records
                </h1>
                <p className="text-sm text-text-secondary mt-1">
                    Case history · {data.total} records · {data.resolved || 0} resolved
                </p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: 'Open', value: data.open, bg: 'bg-blue-50', text: 'text-blue-700' },
                    { label: 'In Progress', value: data.in_progress, bg: 'bg-amber-50', text: 'text-amber-700' },
                    { label: 'Resolved', value: data.resolved, bg: 'bg-emerald-50', text: 'text-emerald-700' },
                    { label: 'Escalated', value: data.escalated, bg: 'bg-red-50', text: 'text-red-700' },
                ].map(s => (
                    <div key={s.label} className={`p-3 rounded-xl ${s.bg} border border-border text-center`}>
                        <p className={`text-xl font-bold ${s.text}`}>{s.value || 0}</p>
                        <p className="text-[10px] text-text-secondary font-medium">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Records timeline */}
            {loading ? (
                <div className="text-center py-16 text-text-muted">Loading records...</div>
            ) : (
                <div className="space-y-3">
                    {data.cases.slice(0, 50).map((c, i) => {
                        const statusConf = STATUS_STYLE[c.status] || STATUS_STYLE['Open'];
                        const StatusIcon = statusConf.icon;

                        return (
                            <motion.div
                                key={c.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.02 }}
                                className="flex gap-4 p-4 rounded-2xl bg-surface-card border border-border hover:shadow-sm transition-shadow"
                            >
                                {/* Timeline dot */}
                                <div className="flex flex-col items-center pt-1">
                                    <div className={`w-8 h-8 rounded-xl ${statusConf.bg} flex items-center justify-center`}>
                                        <StatusIcon size={14} className={statusConf.text} />
                                    </div>
                                    {i < data.cases.length - 1 && <div className="w-px h-full bg-border mt-1" />}
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-bold text-text-primary">Case #{c.id}</span>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${SEVERITY_STYLE[c.severity] || ''}`}>
                                            {c.severity}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${statusConf.bg} ${statusConf.text}`}>
                                            {c.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-text-secondary">{c.department} · Staff #{c.staff_id}</p>
                                    <div className="flex gap-4 mt-2 text-[11px] text-text-muted">
                                        <span>Created: {c.created_time ? new Date(c.created_time).toLocaleDateString() : '—'}</span>
                                        {c.resolved_time && <span>Resolved: {new Date(c.resolved_time).toLocaleDateString()}</span>}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
