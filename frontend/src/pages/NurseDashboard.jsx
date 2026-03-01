import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Heart, Activity, Users, Pill, Clock, CalendarDays,
    Building2, AlertTriangle, BedDouble, CheckCircle,
    LogIn, LogOut, UserPlus
} from 'lucide-react';
import axios from 'axios';

export default function NurseDashboard() {
    const user = JSON.parse(sessionStorage.getItem('zi_user') || '{}');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchDashboard = async () => {
        try {
            const params = new URLSearchParams();
            if (user.department) params.set('department', user.department);
            if (user.email) params.set('nurse_email', user.email);
            const res = await axios.get(`/api/nurse/dashboard?${params}`);
            setData(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchDashboard(); }, []);

    const admitPatient = async (admissionId) => {
        try {
            await axios.put(`/api/ward/admit/${admissionId}?nurse_email=${encodeURIComponent(user.email || '')}`);
            fetchDashboard();
        } catch (err) { console.error(err); }
    };

    const dischargePatient = async (admissionId) => {
        if (!confirm('Discharge this patient?')) return;
        try {
            await axios.put(`/api/ward/discharge/${admissionId}`);
            fetchDashboard();
        } catch (err) { console.error(err); }
    };

    if (loading) return <div className="text-center py-20 text-text-muted">Loading dashboard...</div>;
    if (!data) return <div className="text-center py-20 text-text-muted">Failed to load.</div>;

    const stats = [
        { icon: Building2, label: 'Department', value: data.ward, color: '#8B5CF6', bg: 'from-purple-500/10 to-purple-500/5' },
        { icon: BedDouble, label: 'Assigned Ward', value: data.assigned_ward || '—', color: '#0F766E', bg: 'from-teal-500/10 to-teal-500/5' },
        { icon: Clock, label: 'Shift', value: data.assigned_shift || '—', color: '#D97706', bg: 'from-amber-500/10 to-amber-500/5' },
        { icon: Users, label: 'Active Patients', value: data.total_patients, color: '#3B82F6', bg: 'from-blue-500/10 to-blue-500/5' },
        { icon: Activity, label: 'Vitals Recorded', value: data.vitals_recorded, color: '#10B981', bg: 'from-emerald-500/10 to-emerald-500/5' },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-200/50">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                        <Heart size={24} className="text-emerald-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">
                            Hello, {user.name || 'Nurse'}
                        </h1>
                        <p className="text-sm text-text-secondary">
                            {data.ward || 'General'} · {data.assigned_ward ? `Ward ${data.assigned_ward}` : ''} · {data.assigned_shift || ''} Shift · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {stats.map((s, i) => (
                    <motion.div key={s.label}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className={`p-4 rounded-2xl bg-gradient-to-br ${s.bg} border border-border`}>
                        <s.icon size={18} style={{ color: s.color }} className="mb-2" />
                        <p className="text-2xl font-bold text-text-primary">{s.value}</p>
                        <p className="text-[10px] text-text-muted font-medium mt-0.5">{s.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Ward occupancy card */}
            {data.ward_info && (
                <div className="bg-surface-card rounded-2xl border border-border p-5">
                    <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                        <BedDouble size={16} className="text-teal-600" /> Ward Bed Occupancy — {data.ward_info.ward_id}
                    </h3>
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div className="h-3 rounded-full transition-all"
                                    style={{
                                        width: `${data.ward_info.capacity ? (data.ward_info.current_patients / data.ward_info.capacity * 100) : 0}%`,
                                        backgroundColor: data.ward_info.current_patients / data.ward_info.capacity > 0.85 ? '#EF4444' :
                                            data.ward_info.current_patients / data.ward_info.capacity > 0.65 ? '#F59E0B' : '#10B981'
                                    }} />
                            </div>
                        </div>
                        <p className="text-sm font-bold text-text-primary">
                            {data.ward_info.current_patients}/{data.ward_info.capacity}
                        </p>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold
                            ${data.ward_info.type === 'ICU' ? 'bg-red-100 text-red-700' :
                                data.ward_info.type === 'Private' ? 'bg-purple-100 text-purple-700' :
                                    'bg-blue-100 text-blue-700'}`}>
                            {data.ward_info.type}
                        </span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Admissions */}
                <div className="bg-surface-card rounded-2xl border border-border p-5">
                    <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                        <UserPlus size={16} className="text-amber-500" /> Pending Admissions
                    </h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {(data.pending_admissions || []).map((a, i) => (
                            <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.03 }}
                                className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200/50">
                                <div>
                                    <p className="text-xs font-bold text-amber-800">{a.patient_name}</p>
                                    <p className="text-[10px] text-amber-600">Assigned by {a.assigned_by_doctor} · {a.ward_type}</p>
                                </div>
                                <button onClick={() => admitPatient(a.id)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold cursor-pointer hover:bg-emerald-700 transition-colors">
                                    <CheckCircle size={12} /> Admit
                                </button>
                            </motion.div>
                        ))}
                        {(!data.pending_admissions || data.pending_admissions.length === 0) &&
                            <p className="text-xs text-text-muted text-center py-6">No pending admissions</p>}
                    </div>
                </div>

                {/* Admitted Patients */}
                <div className="bg-surface-card rounded-2xl border border-border p-5">
                    <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                        <BedDouble size={16} className="text-emerald-500" /> Admitted Patients
                    </h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {(data.admitted_patients || []).map((a, i) => (
                            <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.03 }}
                                className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200/50">
                                <div>
                                    <p className="text-xs font-bold text-emerald-800">{a.patient_name}</p>
                                    <p className="text-[10px] text-emerald-600">
                                        Admitted {a.admitted_at ? new Date(a.admitted_at).toLocaleString() : '—'}
                                    </p>
                                </div>
                                <button onClick={() => dischargePatient(a.id)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-[10px] font-bold cursor-pointer hover:bg-red-600 transition-colors">
                                    <LogOut size={12} /> Discharge
                                </button>
                            </motion.div>
                        ))}
                        {(!data.admitted_patients || data.admitted_patients.length === 0) &&
                            <p className="text-xs text-text-muted text-center py-6">No admitted patients</p>}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Cases */}
                <div className="bg-surface-card rounded-2xl border border-border p-5">
                    <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-500" /> Active Cases
                    </h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {data.active_cases.map((c, i) => (
                            <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.03 }}
                                className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border/50">
                                <div>
                                    <p className="text-xs font-bold text-text-primary">Case #{c.id}</p>
                                    <p className="text-[10px] text-text-muted">{c.department} · {c.status}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold
                                    ${c.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                                        c.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                                            c.severity === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-green-100 text-green-700'}`}>
                                    {c.severity}
                                </span>
                            </motion.div>
                        ))}
                        {data.active_cases.length === 0 && <p className="text-xs text-text-muted text-center py-6">No active cases</p>}
                    </div>
                </div>

                {/* Medication Schedule */}
                <div className="bg-surface-card rounded-2xl border border-border p-5">
                    <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                        <Pill size={16} className="text-emerald-500" /> Medication Schedule
                    </h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {data.medication_schedule.map((m, i) => (
                            <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.03 }}
                                className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/50">
                                <p className="text-xs font-bold text-emerald-800">💊 {m.medication} — {m.dosage}</p>
                                <p className="text-[10px] text-emerald-600">{m.patient_name} · {m.frequency}</p>
                            </motion.div>
                        ))}
                        {data.medication_schedule.length === 0 && <p className="text-xs text-text-muted text-center py-6">No active medications</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
