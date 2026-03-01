import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, CheckCircle2, XCircle, Clock } from 'lucide-react';
import axios from 'axios';

export default function MyAppointments() {
    const [data, setData] = useState({ appointments: [], total: 0, attended: 0, missed: 0 });
    const [loading, setLoading] = useState(true);
    const user = JSON.parse(sessionStorage.getItem('zi_user') || '{}');

    useEffect(() => {
        (async () => {
            try {
                const dept = user.department ? `?department=${encodeURIComponent(user.department)}` : '';
                const res = await axios.get(`/api/patient/appointments${dept}`);
                setData(res.data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        })();
    }, []);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                    <CalendarDays size={24} className="text-primary" /> My Appointments
                </h1>
                <p className="text-sm text-text-secondary mt-1">{user.department || 'All'} department · {data.total} total</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                    <p className="text-2xl font-bold text-blue-700">{data.total}</p>
                    <p className="text-xs text-blue-600">Total Appointments</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <p className="text-2xl font-bold text-emerald-700">{data.attended}</p>
                    <p className="text-xs text-emerald-600">Attended ✓</p>
                </div>
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
                    <p className="text-2xl font-bold text-red-700">{data.missed}</p>
                    <p className="text-xs text-red-600">Missed ✗</p>
                </div>
            </div>

            {/* Appointment list */}
            {loading ? (
                <div className="text-center py-16 text-text-muted">Loading appointments...</div>
            ) : (
                <div className="bg-surface-card rounded-2xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-surface">
                                <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase">#</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase">Date & Time</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase">Department</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.appointments.slice(0, 50).map((a, i) => (
                                <motion.tr
                                    key={a.id}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.01 }}
                                    className="border-b border-border/50 hover:bg-surface/50"
                                >
                                    <td className="px-5 py-3 text-text-muted text-xs">#{a.id}</td>
                                    <td className="px-5 py-3 font-medium text-text-primary text-[13px] flex items-center gap-1.5">
                                        <Clock size={13} className="text-text-muted" />
                                        {a.slot_time ? new Date(a.slot_time).toLocaleString() : '—'}
                                    </td>
                                    <td className="px-5 py-3 text-text-secondary text-[13px]">{a.department}</td>
                                    <td className="px-5 py-3">
                                        {a.attended ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                                                <CheckCircle2 size={11} /> Attended
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-50 text-red-700 text-[11px] font-bold">
                                                <XCircle size={11} /> Missed
                                            </span>
                                        )}
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
