import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Building2, Stethoscope, Clock, Send, CheckCircle } from 'lucide-react';
import axios from 'axios';

const DEPARTMENTS = ['Emergency', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Neurology'];
const TIME_SLOTS = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM'];

export default function AppointmentBooking() {
    const user = JSON.parse(sessionStorage.getItem('zi_user') || '{}');
    const [form, setForm] = useState({ department: '', doctor_name: '', preferred_date: '', preferred_time: '', reason: '' });
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [bookings, setBookings] = useState([]);

    // Load existing bookings
    useEffect(() => {
        (async () => {
            try {
                const res = await axios.get(`/api/patient/bookings?patient_email=${encodeURIComponent(user.email || '')}`);
                setBookings(res.data.bookings || []);
            } catch (err) { console.error(err); }
        })();
    }, [success]);

    // Load doctors when department changes
    useEffect(() => {
        if (!form.department) return;
        (async () => {
            try {
                const res = await axios.get(`/api/patient/staff?department=${encodeURIComponent(form.department)}`);
                setStaff(res.data.staff || []);
            } catch (err) { console.error(err); }
        })();
    }, [form.department]);

    const doctors = staff.filter(s => s.name.startsWith('Dr.'));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            await axios.post('/api/patient/bookings', {
                ...form,
                patient_email: user.email,
                patient_name: user.name,
            });
            setSuccess(true);
            setForm({ department: '', doctor_name: '', preferred_date: '', preferred_time: '', reason: '' });
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err?.response?.data?.detail || 'Failed to book');
        } finally { setLoading(false); }
    };

    // Get minimum date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                    <CalendarDays size={24} className="text-blue-600" /> Book Appointment
                </h1>
                <p className="text-sm text-text-secondary mt-1">Schedule a new appointment with a doctor</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Booking form */}
                <form onSubmit={handleSubmit} className="lg:col-span-3 p-6 rounded-2xl bg-surface-card border border-border space-y-5">
                    {/* Step 1: Department */}
                    <div>
                        <label className="text-xs font-semibold text-text-secondary uppercase flex items-center gap-1.5 mb-2">
                            <Building2 size={13} /> 1. Choose Department
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {DEPARTMENTS.map(d => (
                                <button key={d} type="button"
                                    onClick={() => setForm(f => ({ ...f, department: d, doctor_name: '' }))}
                                    className={`p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer
                                        ${form.department === d ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-border text-text-secondary hover:bg-surface/80'}`}>
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Step 2: Doctor */}
                    {form.department && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <label className="text-xs font-semibold text-text-secondary uppercase flex items-center gap-1.5 mb-2">
                                <Stethoscope size={13} /> 2. Select Doctor
                            </label>
                            {doctors.length === 0 ? (
                                <p className="text-xs text-text-muted p-3 bg-surface rounded-xl">No doctors found in {form.department}</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {doctors.map(d => (
                                        <button key={d.id} type="button"
                                            onClick={() => setForm(f => ({ ...f, doctor_name: d.name }))}
                                            className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer
                                                ${form.doctor_name === d.name ? 'bg-blue-50 border-blue-300' : 'bg-surface border-border hover:bg-surface/80'}`}>
                                            <p className="font-bold text-text-primary">{d.name}</p>
                                            <p className="text-[10px] text-text-muted">{d.cases_handled} cases handled</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Step 3: Date */}
                    {form.doctor_name && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <label className="text-xs font-semibold text-text-secondary uppercase flex items-center gap-1.5 mb-2">
                                <CalendarDays size={13} /> 3. Select Date
                            </label>
                            <input type="date" min={minDate}
                                value={form.preferred_date} onChange={e => setForm(f => ({ ...f, preferred_date: e.target.value }))}
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                                required />
                        </motion.div>
                    )}

                    {/* Step 4: Time */}
                    {form.preferred_date && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <label className="text-xs font-semibold text-text-secondary uppercase flex items-center gap-1.5 mb-2">
                                <Clock size={13} /> 4. Select Time
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {TIME_SLOTS.map(t => (
                                    <button key={t} type="button"
                                        onClick={() => setForm(f => ({ ...f, preferred_time: t }))}
                                        className={`p-2 rounded-lg border text-xs font-medium transition-all cursor-pointer
                                            ${form.preferred_time === t ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-border hover:bg-surface/80 text-text-secondary'}`}>
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Reason */}
                    {form.preferred_time && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <label className="text-xs font-semibold text-text-secondary uppercase mb-2 block">Reason (Optional)</label>
                            <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                                placeholder="Brief reason for visit..."
                                rows={2}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </motion.div>
                    )}

                    {error && <p className="text-rose-500 text-xs bg-rose-50 px-3 py-2 rounded-lg">{error}</p>}
                    {success && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="text-emerald-600 text-xs bg-emerald-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
                            <CheckCircle size={14} /> Appointment request submitted successfully!
                        </motion.p>
                    )}

                    <button type="submit" disabled={loading || !form.department || !form.doctor_name || !form.preferred_date || !form.preferred_time}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-sm
                            shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                        <Send size={15} /> {loading ? 'Booking...' : 'Request Appointment'}
                    </button>
                </form>

                {/* My Bookings sidebar */}
                <div className="lg:col-span-2 space-y-3">
                    <h3 className="text-sm font-bold text-text-primary">My Bookings ({bookings.length})</h3>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                        {bookings.map(b => (
                            <div key={b.id} className={`p-3 rounded-xl border ${b.status === 'pending' ? 'bg-amber-50 border-amber-200' :
                                b.status === 'approve' || b.status === 'approved' ? 'bg-emerald-50 border-emerald-200' :
                                    b.status === 'cancel' || b.status === 'cancelled' ? 'bg-red-50 border-red-200' :
                                        'bg-blue-50 border-blue-200'
                                }`}>
                                <p className="text-xs font-bold text-text-primary">{b.department}</p>
                                <p className="text-[10px] text-text-secondary">{b.doctor_name || 'Any'} · {b.preferred_date} · {b.preferred_time}</p>
                                <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold
                                    ${b.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                        b.status === 'approve' || b.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                            b.status === 'cancel' || b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                'bg-blue-100 text-blue-700'}`}>
                                    {b.status === 'approve' || b.status === 'approved' ? 'Approved' :
                                        b.status === 'cancel' || b.status === 'cancelled' ? 'Cancelled' :
                                            b.status === 'reschedule' || b.status === 'rescheduled' ? 'Rescheduled' : 'Pending'}
                                </span>
                            </div>
                        ))}
                        {bookings.length === 0 && <p className="text-xs text-text-muted text-center py-6">No bookings yet</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
