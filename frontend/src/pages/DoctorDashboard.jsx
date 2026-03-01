import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Stethoscope, CalendarDays, AlertTriangle, ClipboardList,
    Users, Pill, Clock, TrendingUp, Activity
} from 'lucide-react';
import axios from 'axios';

const SEVERITY_STYLE = {
    Low: 'bg-green-100 text-green-700', Medium: 'bg-yellow-100 text-yellow-700',
    High: 'bg-orange-100 text-orange-700', Critical: 'bg-red-100 text-red-700',
};

export default function DoctorDashboard() {
    const user = JSON.parse(sessionStorage.getItem('zi_user') || '{}');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const dept = user.department ? `?department=${encodeURIComponent(user.department)}` : '';
                const res = await axios.get(`/api/doctor/dashboard${dept}`);
                setData(res.data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        })();
    }, []);

    if (loading) return <div className="text-center py-20 text-text-muted">Loading dashboard...</div>;
    if (!data) return <div className="text-center py-20 text-text-muted">Failed to load.</div>;

    const stats = [
        { icon: CalendarDays, label: "Today's Appointments", value: data.today_appointments, color: '#3B82F6', bg: 'from-blue-500/10 to-blue-500/5' },
        { icon: ClipboardList, label: 'Pending Cases', value: data.open_cases, color: '#F59E0B', bg: 'from-amber-500/10 to-amber-500/5' },
        { icon: AlertTriangle, label: 'Critical Alerts', value: data.critical_alerts, color: '#EF4444', bg: 'from-red-500/10 to-red-500/5' },
        { icon: Users, label: 'Pending Bookings', value: data.pending_bookings, color: '#8B5CF6', bg: 'from-purple-500/10 to-purple-500/5' },
        { icon: Pill, label: 'Prescriptions', value: data.total_prescriptions, color: '#10B981', bg: 'from-emerald-500/10 to-emerald-500/5' },
        { icon: Activity, label: 'Total Cases', value: data.total_cases, color: '#06B6D4', bg: 'from-cyan-500/10 to-cyan-500/5' },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-200/50">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/15 flex items-center justify-center">
                        <Stethoscope size={24} className="text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">
                            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user.name || 'Doctor'}
                        </h1>
                        <p className="text-sm text-text-secondary">{user.department || 'General'} Department · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {stats.map((s, i) => (
                    <motion.div
                        key={s.label}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`p-4 rounded-2xl bg-gradient-to-br ${s.bg} border border-border`}
                    >
                        <s.icon size={18} style={{ color: s.color }} className="mb-2" />
                        <p className="text-2xl font-bold text-text-primary">{s.value}</p>
                        <p className="text-[10px] text-text-muted font-medium mt-0.5">{s.label}</p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Cases */}
                <div className="bg-surface-card rounded-2xl border border-border p-5">
                    <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                        <ClipboardList size={16} className="text-amber-500" /> Pending Cases
                    </h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {data.cases.map((c, i) => (
                            <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                className="flex items-center justify-between p-3 rounded-xl bg-surface hover:bg-surface/80 border border-border/50">
                                <div>
                                    <p className="text-xs font-bold text-text-primary">Case #{c.id}</p>
                                    <p className="text-[10px] text-text-muted">{c.department} · Staff #{c.staff_id}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${SEVERITY_STYLE[c.severity] || ''}`}>
                                        {c.severity}
                                    </span>
                                    <span className="text-[10px] text-text-muted flex items-center gap-1">
                                        <Clock size={10} /> {c.sla_deadline ? new Date(c.sla_deadline).toLocaleDateString() : '—'}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                        {data.cases.length === 0 && <p className="text-xs text-text-muted text-center py-6">No pending cases</p>}
                    </div>
                </div>

                {/* Emergency Alerts */}
                <div className="bg-surface-card rounded-2xl border border-border p-5">
                    <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-red-500" /> Emergency Alerts
                    </h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {data.emergency_alerts.map((c, i) => (
                            <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                className="p-3 rounded-xl bg-red-50 border border-red-200/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-red-700">🚨 Case #{c.id} — {c.department}</p>
                                        <p className="text-[10px] text-red-600">Status: {c.status} · Staff #{c.staff_id}</p>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-700">
                                        CRITICAL
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                        {data.emergency_alerts.length === 0 && (
                            <div className="text-center py-6">
                                <p className="text-xs text-emerald-600 font-medium">✅ No critical alerts</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
