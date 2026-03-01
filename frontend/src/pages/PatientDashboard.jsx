import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Heart, CalendarDays, Pill, FileText, Clock,
    Activity, TrendingUp, Star
} from 'lucide-react';
import axios from 'axios';

export default function PatientDashboard() {
    const user = JSON.parse(sessionStorage.getItem('zi_user') || '{}');
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState({ total: 0, attended: 0, missed: 0, appointments: [] });
    const [prescriptions, setPrescriptions] = useState([]);
    const [diagnoses, setDiagnoses] = useState([]);
    const [bookings, setBookings] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const dept = user.department ? `?department=${encodeURIComponent(user.department)}` : '';
                const email = user.email ? `?patient_email=${encodeURIComponent(user.email)}` : '';
                const [appts, rx, dx, bk] = await Promise.all([
                    axios.get(`/api/patient/appointments${dept}`),
                    axios.get(`/api/patient/my-prescriptions${email}`),
                    axios.get(`/api/patient/my-diagnoses${email}`),
                    axios.get(`/api/patient/bookings${email}`),
                ]);
                setAppointments(appts.data);
                setPrescriptions(rx.data.prescriptions || []);
                setDiagnoses(dx.data.diagnoses || []);
                setBookings(bk.data.bookings || []);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        })();
    }, []);

    const upcomingBookings = bookings.filter(b => b.status === 'pending' || b.status === 'approve' || b.status === 'approved');
    const activePrescriptions = prescriptions.filter(rx => rx.status === 'active');

    if (loading) return <div className="text-center py-20 text-text-muted">Loading your health data...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Welcome */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-200/50">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center">
                        <Heart size={24} className="text-amber-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">
                            Welcome, {user.name || 'Patient'}
                        </h1>
                        <p className="text-sm text-text-secondary">{user.department || 'General'} · Your Health Portal</p>
                    </div>
                </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { icon: CalendarDays, label: 'Upcoming', value: upcomingBookings.length, color: '#3B82F6', bg: 'from-blue-500/10 to-blue-500/5' },
                    { icon: Pill, label: 'Active Rx', value: activePrescriptions.length, color: '#10B981', bg: 'from-emerald-500/10 to-emerald-500/5' },
                    { icon: FileText, label: 'Diagnoses', value: diagnoses.length, color: '#8B5CF6', bg: 'from-purple-500/10 to-purple-500/5' },
                    { icon: Activity, label: 'Appointments', value: appointments.total, color: '#F59E0B', bg: 'from-amber-500/10 to-amber-500/5' },
                ].map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`p-4 rounded-2xl bg-gradient-to-br ${s.bg} border border-border`}>
                        <s.icon size={18} style={{ color: s.color }} className="mb-2" />
                        <p className="text-2xl font-bold text-text-primary">{s.value}</p>
                        <p className="text-[10px] text-text-muted font-medium">{s.label}</p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upcoming Appointments */}
                <div className="bg-surface-card rounded-2xl border border-border p-5">
                    <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                        <CalendarDays size={16} className="text-blue-500" /> Upcoming Appointments
                    </h3>
                    <div className="space-y-2">
                        {upcomingBookings.length === 0 ? (
                            <p className="text-xs text-text-muted text-center py-6">No upcoming appointments. Book one now!</p>
                        ) : (
                            upcomingBookings.slice(0, 5).map(b => (
                                <div key={b.id} className="p-3 rounded-xl bg-blue-50 border border-blue-200/50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-blue-800">{b.department}</p>
                                            <p className="text-[10px] text-blue-600">{b.preferred_date} · {b.preferred_time}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold
                                            ${b.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {b.status === 'pending' ? 'Pending' : 'Approved'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Active Prescriptions */}
                <div className="bg-surface-card rounded-2xl border border-border p-5">
                    <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                        <Pill size={16} className="text-emerald-500" /> Active Prescriptions
                    </h3>
                    <div className="space-y-2">
                        {activePrescriptions.length === 0 ? (
                            <p className="text-xs text-text-muted text-center py-6">No active prescriptions</p>
                        ) : (
                            activePrescriptions.slice(0, 5).map(rx => (
                                <div key={rx.id} className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/50">
                                    <p className="text-xs font-bold text-emerald-800">💊 {rx.medication} — {rx.dosage}</p>
                                    <p className="text-[10px] text-emerald-600">{rx.frequency} · {rx.duration}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Medical History */}
                <div className="bg-surface-card rounded-2xl border border-border p-5">
                    <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                        <FileText size={16} className="text-purple-500" /> Medical History
                    </h3>
                    <div className="space-y-2">
                        {diagnoses.length === 0 ? (
                            <p className="text-xs text-text-muted text-center py-6">No medical history</p>
                        ) : (
                            diagnoses.slice(0, 5).map(dx => (
                                <div key={dx.id} className="p-3 rounded-xl bg-purple-50 border border-purple-200/50">
                                    <p className="text-xs font-bold text-purple-800">🩺 {dx.condition}</p>
                                    <p className="text-[10px] text-purple-600">Severity: {dx.severity}</p>
                                    {dx.notes && <p className="text-[10px] text-purple-500 mt-0.5">{dx.notes}</p>}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Reports */}
                <div className="bg-surface-card rounded-2xl border border-border p-5">
                    <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                        <TrendingUp size={16} className="text-amber-500" /> Visit Summary
                    </h3>
                    <div className="space-y-2 text-xs text-text-secondary">
                        <div className="flex justify-between p-2 rounded-lg bg-surface">
                            <span>Total Visits</span>
                            <span className="font-bold text-text-primary">{appointments.total}</span>
                        </div>
                        <div className="flex justify-between p-2 rounded-lg bg-surface">
                            <span>Attended</span>
                            <span className="font-bold text-emerald-600">{appointments.attended}</span>
                        </div>
                        <div className="flex justify-between p-2 rounded-lg bg-surface">
                            <span>Missed</span>
                            <span className="font-bold text-red-600">{appointments.missed}</span>
                        </div>
                        <div className="flex justify-between p-2 rounded-lg bg-surface">
                            <span>Pending Bookings</span>
                            <span className="font-bold text-amber-600">{bookings.filter(b => b.status === 'pending').length}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
