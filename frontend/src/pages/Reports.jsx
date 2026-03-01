import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    FileText, Download, FileSpreadsheet, Activity, Pill,
    CalendarDays, Users, Heart, Stethoscope, TrendingUp,
    ClipboardList, Star, Building2, Printer
} from 'lucide-react';
import { getReport } from '../services/api';
import axios from 'axios';
import PageHeader from '../components/PageHeader';
import ChartCard from '../components/ChartCard';
import LoadingSpinner from '../components/LoadingSpinner';

// ═══════════════════════════════════════════
// ADMIN REPORT — full hospital operational
// ═══════════════════════════════════════════
function AdminReport() {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getReport().then(setReport).catch(console.error).finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingSpinner />;

    const handleExport = (type) => window.open(`/api/reports/export/${type}`, '_blank');

    return (
        <div>
            <PageHeader title="Hospital Reports" subtitle="Auto-generated operational reports with export options" icon={FileText}>
                <div className="flex gap-2">
                    <button onClick={() => handleExport('pdf')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-critical text-white text-sm font-medium hover:shadow-lg transition-all cursor-pointer">
                        <Download size={16} /> PDF Export
                    </button>
                    <button onClick={() => handleExport('csv')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-white text-sm font-medium hover:shadow-lg transition-all cursor-pointer">
                        <FileSpreadsheet size={16} /> CSV Export
                    </button>
                </div>
            </PageHeader>

            {report && (
                <div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-surface-card rounded-2xl border border-border shadow-sm p-6 mb-6">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-text-primary">{report.report_title}</h2>
                            <p className="text-sm text-text-secondary mt-1">Period: {report.period} • Generated: {new Date(report.generated_at).toLocaleString()}</p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            {[
                                { label: 'Total Cases', value: report.summary.total_cases },
                                { label: 'Resolved', value: report.summary.resolved_cases },
                                { label: 'Active', value: report.summary.active_cases },
                                { label: 'SLA Compliance', value: `${report.summary.sla_compliance_pct}%` },
                                { label: 'Avg Resolution', value: `${report.summary.avg_resolution_hrs}h` },
                                { label: 'Total Staff', value: report.summary.total_staff },
                                { label: 'Avg Overtime', value: `${report.summary.avg_overtime_hrs}h` },
                                { label: 'Patient Rating', value: `${report.summary.patient_satisfaction}/5` },
                            ].map((item) => (
                                <div key={item.label} className="bg-surface rounded-xl p-3 text-center">
                                    <p className="text-xs text-text-secondary mb-0.5">{item.label}</p>
                                    <p className="text-lg font-bold text-text-primary">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <ChartCard title="Department Breakdown" delay={1}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-text-secondary">Department</th>
                                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-text-secondary">Total</th>
                                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-text-secondary">Resolved</th>
                                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-text-secondary">Active</th>
                                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-text-secondary">Resolution Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.department_breakdown?.map((d) => (
                                        <tr key={d.department} className="border-b border-border/50 hover:bg-surface transition-colors">
                                            <td className="py-2 px-3 font-medium">{d.department}</td>
                                            <td className="py-2 px-3 text-right">{d.total}</td>
                                            <td className="py-2 px-3 text-right text-secondary font-semibold">{d.resolved}</td>
                                            <td className="py-2 px-3 text-right text-warning">{d.active}</td>
                                            <td className="py-2 px-3 text-right">
                                                <span className={`font-semibold ${d.total > 0 && (d.resolved / d.total) > 0.6 ? 'text-secondary' : 'text-critical'}`}>
                                                    {d.total > 0 ? ((d.resolved / d.total) * 100).toFixed(1) : 0}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </ChartCard>
                </div>
            )}
        </div>
    );
}


// ═══════════════════════════════════════════
// DOCTOR REPORT — cases, prescriptions, appointments
// ═══════════════════════════════════════════
function DoctorReport() {
    const user = JSON.parse(sessionStorage.getItem('zi_user') || '{}');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const dept = user.department ? `?department=${encodeURIComponent(user.department)}` : '';
                const [dash, rx, dx] = await Promise.all([
                    axios.get(`/api/doctor/dashboard${dept}`),
                    axios.get(`/api/doctor/prescriptions${dept ? `?department=${encodeURIComponent(user.department)}` : ''}`),
                    axios.get(`/api/doctor/diagnoses${dept ? `?department=${encodeURIComponent(user.department)}` : ''}`),
                ]);
                setData({ dashboard: dash.data, prescriptions: rx.data.prescriptions || [], diagnoses: dx.data.diagnoses || [] });
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        })();
    }, []);

    if (loading) return <LoadingSpinner />;
    if (!data) return <div className="text-center py-20 text-text-muted">Failed to load report.</div>;

    const d = data.dashboard;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <Stethoscope size={24} className="text-blue-600" /> Doctor Report
                    </h1>
                    <p className="text-sm text-text-secondary mt-1">
                        {user.department || 'All'} Department · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <button onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium cursor-pointer hover:shadow-lg transition-all">
                    <Printer size={16} /> Print Report
                </button>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total Cases', value: d.total_cases, icon: ClipboardList, color: '#3B82F6' },
                    { label: 'Open Cases', value: d.open_cases, icon: Activity, color: '#F59E0B' },
                    { label: 'Critical Alerts', value: d.critical_alerts, icon: Heart, color: '#EF4444' },
                    { label: 'Prescriptions', value: d.total_prescriptions, icon: Pill, color: '#10B981' },
                ].map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-4 rounded-2xl bg-surface-card border border-border text-center">
                        <s.icon size={18} style={{ color: s.color }} className="mx-auto mb-1" />
                        <p className="text-2xl font-bold text-text-primary">{s.value}</p>
                        <p className="text-[10px] text-text-muted font-medium">{s.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Recent Prescriptions Table */}
            <div className="bg-surface-card rounded-2xl border border-border p-5">
                <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                    <Pill size={16} className="text-emerald-500" /> Prescriptions Issued ({data.prescriptions.length})
                </h3>
                {data.prescriptions.length === 0 ? (
                    <p className="text-xs text-text-muted text-center py-4">No prescriptions issued yet</p>
                ) : (
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-2 px-3 text-text-muted">Patient</th>
                                <th className="text-left py-2 px-3 text-text-muted">Medication</th>
                                <th className="text-left py-2 px-3 text-text-muted">Dosage</th>
                                <th className="text-left py-2 px-3 text-text-muted">Frequency</th>
                                <th className="text-left py-2 px-3 text-text-muted">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.prescriptions.slice(0, 20).map(rx => (
                                <tr key={rx.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                    <td className="py-2 px-3 font-medium text-text-primary">{rx.patient_name}</td>
                                    <td className="py-2 px-3">{rx.medication}</td>
                                    <td className="py-2 px-3">{rx.dosage}</td>
                                    <td className="py-2 px-3">{rx.frequency}</td>
                                    <td className="py-2 px-3 text-text-muted">{rx.created_at ? new Date(rx.created_at).toLocaleDateString() : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Recent Diagnoses Table */}
            <div className="bg-surface-card rounded-2xl border border-border p-5">
                <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                    <FileText size={16} className="text-purple-500" /> Diagnoses Logged ({data.diagnoses.length})
                </h3>
                {data.diagnoses.length === 0 ? (
                    <p className="text-xs text-text-muted text-center py-4">No diagnoses logged yet</p>
                ) : (
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-2 px-3 text-text-muted">Patient</th>
                                <th className="text-left py-2 px-3 text-text-muted">Condition</th>
                                <th className="text-left py-2 px-3 text-text-muted">Severity</th>
                                <th className="text-left py-2 px-3 text-text-muted">Notes</th>
                                <th className="text-left py-2 px-3 text-text-muted">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.diagnoses.slice(0, 20).map(dx => (
                                <tr key={dx.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                    <td className="py-2 px-3 font-medium text-text-primary">{dx.patient_name}</td>
                                    <td className="py-2 px-3">{dx.condition}</td>
                                    <td className="py-2 px-3">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold
                                            ${dx.severity === 'Severe' ? 'bg-red-100 text-red-700' :
                                                dx.severity === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-green-100 text-green-700'}`}>
                                            {dx.severity}
                                        </span>
                                    </td>
                                    <td className="py-2 px-3 max-w-[200px] truncate">{dx.notes || '—'}</td>
                                    <td className="py-2 px-3 text-text-muted">{dx.created_at ? new Date(dx.created_at).toLocaleDateString() : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}


// ═══════════════════════════════════════════
// NURSE REPORT — vitals, ward, medication
// ═══════════════════════════════════════════
function NurseReport() {
    const user = JSON.parse(sessionStorage.getItem('zi_user') || '{}');
    const [data, setData] = useState(null);
    const [vitals, setVitals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const dept = user.department ? `?department=${encodeURIComponent(user.department)}` : '';
                const [dash, vit] = await Promise.all([
                    axios.get(`/api/nurse/dashboard${dept}`),
                    axios.get(`/api/nurse/vitals${dept}`),
                ]);
                setData(dash.data);
                setVitals(vit.data.vitals || []);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        })();
    }, []);

    if (loading) return <LoadingSpinner />;
    if (!data) return <div className="text-center py-20 text-text-muted">Failed to load report.</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <Heart size={24} className="text-emerald-600" /> Nurse Ward Report
                    </h1>
                    <p className="text-sm text-text-secondary mt-1">
                        {data.ward} Ward · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <button onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium cursor-pointer hover:shadow-lg transition-all">
                    <Printer size={16} /> Print Report
                </button>
            </div>

            {/* Ward summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Active Patients', value: data.total_patients, icon: Users, color: '#3B82F6' },
                    { label: 'Ward Staff', value: data.ward_staff, icon: Building2, color: '#8B5CF6' },
                    { label: "Today's Appts", value: data.today_appointments, icon: CalendarDays, color: '#F59E0B' },
                    { label: 'Vitals Recorded', value: data.vitals_recorded, icon: Activity, color: '#10B981' },
                ].map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-4 rounded-2xl bg-surface-card border border-border text-center">
                        <s.icon size={18} style={{ color: s.color }} className="mx-auto mb-1" />
                        <p className="text-2xl font-bold text-text-primary">{s.value}</p>
                        <p className="text-[10px] text-text-muted font-medium">{s.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Vitals Log */}
            <div className="bg-surface-card rounded-2xl border border-border p-5">
                <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                    <Activity size={16} className="text-red-500" /> Vitals Log ({vitals.length} records)
                </h3>
                {vitals.length === 0 ? (
                    <p className="text-xs text-text-muted text-center py-4">No vitals recorded yet</p>
                ) : (
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-2 px-3 text-text-muted">Patient</th>
                                <th className="text-center py-2 px-3 text-text-muted">BP</th>
                                <th className="text-center py-2 px-3 text-text-muted">Sugar</th>
                                <th className="text-center py-2 px-3 text-text-muted">Temp</th>
                                <th className="text-center py-2 px-3 text-text-muted">HR</th>
                                <th className="text-left py-2 px-3 text-text-muted">Notes</th>
                                <th className="text-left py-2 px-3 text-text-muted">Recorded</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vitals.slice(0, 30).map(v => (
                                <tr key={v.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                    <td className="py-2 px-3 font-medium text-text-primary">{v.patient_name}</td>
                                    <td className="py-2 px-3 text-center">
                                        {v.bp_systolic ? (
                                            <span className={`font-bold ${v.bp_systolic >= 140 ? 'text-red-600' : v.bp_systolic < 90 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                {v.bp_systolic}/{v.bp_diastolic}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="py-2 px-3 text-center">{v.sugar_level || '—'}</td>
                                    <td className="py-2 px-3 text-center">{v.temperature ? `${v.temperature}°F` : '—'}</td>
                                    <td className="py-2 px-3 text-center">{v.heart_rate ? `${v.heart_rate}` : '—'}</td>
                                    <td className="py-2 px-3 max-w-[150px] truncate">{v.notes || '—'}</td>
                                    <td className="py-2 px-3 text-text-muted">{v.recorded_at ? new Date(v.recorded_at).toLocaleString() : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Medication Schedule */}
            <div className="bg-surface-card rounded-2xl border border-border p-5">
                <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                    <Pill size={16} className="text-emerald-500" /> Active Medications
                </h3>
                <div className="space-y-2">
                    {data.medication_schedule.map(m => (
                        <div key={m.id} className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/50 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-emerald-800">💊 {m.medication} — {m.dosage}</p>
                                <p className="text-[10px] text-emerald-600">Patient: {m.patient_name}</p>
                            </div>
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">{m.frequency}</span>
                        </div>
                    ))}
                    {data.medication_schedule.length === 0 && <p className="text-xs text-text-muted text-center py-4">No active medications</p>}
                </div>
            </div>
        </div>
    );
}


// ═══════════════════════════════════════════
// PATIENT REPORT — personal history
// ═══════════════════════════════════════════
function PatientReport() {
    const user = JSON.parse(sessionStorage.getItem('zi_user') || '{}');
    const [loading, setLoading] = useState(true);
    const [prescriptions, setPrescriptions] = useState([]);
    const [diagnoses, setDiagnoses] = useState([]);
    const [appointments, setAppointments] = useState({ total: 0, attended: 0, missed: 0 });
    const [bookings, setBookings] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const email = user.email ? `?patient_email=${encodeURIComponent(user.email)}` : '';
                const dept = user.department ? `?department=${encodeURIComponent(user.department)}` : '';
                const [rx, dx, appts, bk] = await Promise.all([
                    axios.get(`/api/patient/my-prescriptions${email}`),
                    axios.get(`/api/patient/my-diagnoses${email}`),
                    axios.get(`/api/patient/appointments${dept}`),
                    axios.get(`/api/patient/bookings${email}`),
                ]);
                setPrescriptions(rx.data.prescriptions || []);
                setDiagnoses(dx.data.diagnoses || []);
                setAppointments(appts.data);
                setBookings(bk.data.bookings || []);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        })();
    }, []);

    if (loading) return <LoadingSpinner />;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <FileText size={24} className="text-amber-600" /> My Health Report
                    </h1>
                    <p className="text-sm text-text-secondary mt-1">{user.name} · {user.department || 'General'}</p>
                </div>
                <button onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-medium cursor-pointer hover:shadow-lg transition-all">
                    <Printer size={16} /> Download Report
                </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total Visits', value: appointments.total, icon: CalendarDays, color: '#3B82F6' },
                    { label: 'Attended', value: appointments.attended, icon: Star, color: '#10B981' },
                    { label: 'Prescriptions', value: prescriptions.length, icon: Pill, color: '#8B5CF6' },
                    { label: 'Diagnoses', value: diagnoses.length, icon: ClipboardList, color: '#F59E0B' },
                ].map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-4 rounded-2xl bg-surface-card border border-border text-center">
                        <s.icon size={18} style={{ color: s.color }} className="mx-auto mb-1" />
                        <p className="text-2xl font-bold text-text-primary">{s.value}</p>
                        <p className="text-[10px] text-text-muted font-medium">{s.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Prescriptions */}
            <div className="bg-surface-card rounded-2xl border border-border p-5">
                <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                    <Pill size={16} className="text-emerald-500" /> My Prescriptions ({prescriptions.length})
                </h3>
                {prescriptions.length === 0 ? (
                    <p className="text-xs text-text-muted text-center py-4">No prescriptions</p>
                ) : (
                    <div className="space-y-2">
                        {prescriptions.map(rx => (
                            <div key={rx.id} className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/50 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-emerald-800">💊 {rx.medication} — {rx.dosage}</p>
                                    <p className="text-[10px] text-emerald-600">{rx.frequency} · {rx.duration}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold
                                    ${rx.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {rx.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Diagnoses */}
            <div className="bg-surface-card rounded-2xl border border-border p-5">
                <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                    <Stethoscope size={16} className="text-purple-500" /> My Diagnoses ({diagnoses.length})
                </h3>
                {diagnoses.length === 0 ? (
                    <p className="text-xs text-text-muted text-center py-4">No diagnoses on record</p>
                ) : (
                    <div className="space-y-2">
                        {diagnoses.map(dx => (
                            <div key={dx.id} className="p-3 rounded-xl bg-purple-50 border border-purple-200/50">
                                <div className="flex items-center gap-2">
                                    <p className="text-xs font-bold text-purple-800">🩺 {dx.condition}</p>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold
                                        ${dx.severity === 'Severe' ? 'bg-red-100 text-red-700' :
                                            dx.severity === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                                                'bg-green-100 text-green-700'}`}>
                                        {dx.severity}
                                    </span>
                                </div>
                                {dx.notes && <p className="text-[10px] text-purple-600 mt-0.5">{dx.notes}</p>}
                                <p className="text-[10px] text-purple-400 mt-0.5">{dx.created_at ? new Date(dx.created_at).toLocaleDateString() : ''}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Booking History */}
            <div className="bg-surface-card rounded-2xl border border-border p-5">
                <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                    <CalendarDays size={16} className="text-blue-500" /> Booking History ({bookings.length})
                </h3>
                {bookings.length === 0 ? (
                    <p className="text-xs text-text-muted text-center py-4">No bookings yet</p>
                ) : (
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-2 px-3 text-text-muted">Department</th>
                                <th className="text-left py-2 px-3 text-text-muted">Doctor</th>
                                <th className="text-left py-2 px-3 text-text-muted">Date</th>
                                <th className="text-left py-2 px-3 text-text-muted">Time</th>
                                <th className="text-left py-2 px-3 text-text-muted">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.map(b => (
                                <tr key={b.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                    <td className="py-2 px-3 font-medium text-text-primary">{b.department}</td>
                                    <td className="py-2 px-3">{b.doctor_name || 'Any'}</td>
                                    <td className="py-2 px-3">{b.preferred_date}</td>
                                    <td className="py-2 px-3">{b.preferred_time}</td>
                                    <td className="py-2 px-3">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold
                                            ${b.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                b.status === 'approve' || b.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                    b.status === 'cancel' || b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                        'bg-blue-100 text-blue-700'}`}>
                                            {b.status === 'approve' || b.status === 'approved' ? 'Approved' :
                                                b.status === 'cancel' || b.status === 'cancelled' ? 'Cancelled' :
                                                    b.status === 'reschedule' ? 'Rescheduled' : 'Pending'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}


// ═══════════════════════════════════════════
// MAIN EXPORT — role router
// ═══════════════════════════════════════════
export default function Reports() {
    const user = JSON.parse(sessionStorage.getItem('zi_user') || '{}');

    switch (user.role) {
        case 'admin': return <AdminReport />;
        case 'doctor': return <DoctorReport />;
        case 'nurse': return <NurseReport />;
        case 'patient': return <PatientReport />;
        default: return <AdminReport />;
    }
}
