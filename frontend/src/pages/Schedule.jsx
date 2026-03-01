import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Clock, CheckCircle2, XCircle, Filter } from 'lucide-react';
import axios from 'axios';

export default function Schedule() {
    const [data, setData] = useState({ appointments: [], total: 0 });
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // list or grid
    const user = JSON.parse(sessionStorage.getItem('zi_user') || '{}');

    useEffect(() => {
        (async () => {
            try {
                const dept = user.department && user.role !== 'admin' ? `?department=${user.department}` : '';
                const res = await axios.get(`/api/patient/appointments${dept}`);
                setData(res.data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        })();
    }, []);

    // Group by date
    const grouped = {};
    data.appointments.forEach(a => {
        const date = a.slot_time ? new Date(a.slot_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Unknown';
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(a);
    });

    const attendedPct = data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                    <CalendarDays size={24} className="text-primary" /> Schedule
                </h1>
                <p className="text-sm text-text-secondary mt-1">{user.department || 'All'} department appointments</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Slots', value: data.total, color: '#3B82F6', bg: 'bg-blue-50' },
                    { label: 'Attended', value: `${data.attended} (${attendedPct}%)`, color: '#10B981', bg: 'bg-emerald-50' },
                    { label: 'Missed', value: data.missed, color: '#EF4444', bg: 'bg-red-50' },
                ].map(s => (
                    <div key={s.label} className={`p-4 rounded-2xl ${s.bg} border border-border`}>
                        <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-xs text-text-secondary font-medium mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Appointments by date */}
            {loading ? (
                <div className="text-center py-16 text-text-muted">Loading schedule...</div>
            ) : (
                <div className="space-y-4">
                    {Object.entries(grouped).slice(0, 15).map(([date, appts]) => (
                        <div key={date}>
                            <h3 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-2">
                                <CalendarDays size={14} className="text-primary" /> {date}
                                <span className="text-[10px] text-text-muted font-normal">({appts.length} slots)</span>
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                {appts.map((a, i) => (
                                    <motion.div
                                        key={a.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.01 }}
                                        className={`p-3 rounded-xl border text-center transition-shadow hover:shadow-sm ${a.attended ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                                            }`}
                                    >
                                        <div className="flex items-center justify-center gap-1 mb-1">
                                            {a.attended ? (
                                                <CheckCircle2 size={13} className="text-emerald-600" />
                                            ) : (
                                                <XCircle size={13} className="text-red-500" />
                                            )}
                                        </div>
                                        <p className="text-xs font-bold text-text-primary">
                                            {a.slot_time ? new Date(a.slot_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                        </p>
                                        <p className="text-[10px] text-text-muted mt-0.5">{a.department}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
