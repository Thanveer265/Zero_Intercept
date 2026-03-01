import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    CalendarDays, CheckCircle, XCircle, Clock,
    RefreshCw, Filter, MessageSquare
} from 'lucide-react';
import axios from 'axios';

const STATUS_STYLE = {
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Pending' },
    approve: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Approved' },
    approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Approved' },
    reschedule: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Rescheduled' },
    rescheduled: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Rescheduled' },
    cancel: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Cancelled' },
    cancelled: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Cancelled' },
};

export default function AppointmentManagement() {
    const user = JSON.parse(sessionStorage.getItem('zi_user') || '{}');
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');

    const fetchBookings = async () => {
        try {
            const dept = user.department ? `?department=${encodeURIComponent(user.department)}` : '';
            const res = await axios.get(`/api/doctor/bookings${dept}`);
            setBookings(res.data.bookings || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchBookings(); }, []);

    const handleAction = async (bookingId, action, reason = '') => {
        try {
            await axios.put(`/api/doctor/bookings/${bookingId}`, { action, reason });
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: action } : b));
        } catch (err) { console.error(err); }
    };

    const filtered = filterStatus === 'all' ? bookings : bookings.filter(b => b.status === filterStatus);
    const pendingCount = bookings.filter(b => b.status === 'pending').length;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <CalendarDays size={24} className="text-blue-600" /> Appointment Management
                    </h1>
                    <p className="text-sm text-text-secondary mt-1">
                        {bookings.length} requests · {pendingCount} pending approval
                    </p>
                </div>
                <button onClick={fetchBookings} className="p-2 rounded-xl bg-surface-card border border-border hover:bg-surface cursor-pointer">
                    <RefreshCw size={16} className="text-text-muted" />
                </button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2">
                {['all', 'pending', 'approve', 'reschedule', 'cancel'].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer
                            ${filterStatus === s ? 'bg-primary text-white' : 'bg-surface-card text-text-secondary border border-border hover:bg-surface'}`}>
                        {s === 'all' ? 'All' : STATUS_STYLE[s]?.label || s}
                    </button>
                ))}
            </div>

            {/* Booking cards */}
            {loading ? (
                <div className="text-center py-16 text-text-muted">Loading bookings...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-text-muted">
                    <CalendarDays size={32} className="mx-auto mb-2 opacity-30" />
                    <p>No appointment requests {filterStatus !== 'all' ? `with status "${filterStatus}"` : ''}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((b, i) => {
                        const style = STATUS_STYLE[b.status] || STATUS_STYLE.pending;
                        return (
                            <motion.div key={b.id}
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className={`p-4 rounded-2xl border ${style.border} ${style.bg} transition-shadow hover:shadow-sm`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-bold text-text-primary">{b.patient_name}</span>
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${style.bg} ${style.text} border ${style.border}`}>
                                                {style.label}
                                            </span>
                                        </div>
                                        <p className="text-xs text-text-secondary">{b.patient_email}</p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                                            <span className="flex items-center gap-1"><CalendarDays size={12} /> {b.preferred_date}</span>
                                            <span className="flex items-center gap-1"><Clock size={12} /> {b.preferred_time}</span>
                                            <span className="flex items-center gap-1"><Filter size={12} /> {b.department}</span>
                                        </div>
                                        {b.reason && (
                                            <p className="text-xs text-text-secondary mt-1.5 flex items-center gap-1">
                                                <MessageSquare size={11} /> {b.reason}
                                            </p>
                                        )}
                                    </div>

                                    {/* Action buttons — only for pending */}
                                    {b.status === 'pending' && (
                                        <div className="flex gap-2 flex-shrink-0">
                                            <button onClick={() => handleAction(b.id, 'approve')}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold cursor-pointer hover:bg-emerald-700 transition-colors">
                                                <CheckCircle size={13} /> Approve
                                            </button>
                                            <button onClick={() => {
                                                const newTime = prompt('New date/time (e.g. 2026-03-05 10:00 AM):');
                                                if (newTime) handleAction(b.id, 'reschedule', `Rescheduled to ${newTime}`);
                                            }}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-semibold cursor-pointer hover:bg-blue-700 transition-colors">
                                                <RefreshCw size={13} /> Reschedule
                                            </button>
                                            <button onClick={() => {
                                                const reason = prompt('Cancellation reason:');
                                                if (reason) handleAction(b.id, 'cancel', reason);
                                            }}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-semibold cursor-pointer hover:bg-red-700 transition-colors">
                                                <XCircle size={13} /> Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
