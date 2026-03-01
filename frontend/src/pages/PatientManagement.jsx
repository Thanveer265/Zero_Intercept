import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Search, Pill, FileText, Activity, X,
    Plus, CheckCircle, ChevronRight, BedDouble
} from 'lucide-react';
import axios from 'axios';
import { getUsers } from '../services/api';

const SEVERITY_OPTS = ['Mild', 'Moderate', 'Severe'];
const CASE_STATUSES = ['Open', 'Under Treatment', 'Resolved'];
const WARD_TYPES = ['ICU', 'General', 'Private'];

export default function PatientManagement() {
    const user = JSON.parse(sessionStorage.getItem('zi_user') || '{}');
    const token = sessionStorage.getItem('zi_token');
    const [patients, setPatients] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [activeTab, setActiveTab] = useState('details');

    // Patient details data
    const [prescriptions, setPrescriptions] = useState([]);
    const [diagnoses, setDiagnoses] = useState([]);
    const [cases, setCases] = useState([]);

    // Forms
    const [rxForm, setRxForm] = useState({ medication: '', dosage: '', frequency: '', duration: '', notes: '' });
    const [dxForm, setDxForm] = useState({ condition: '', severity: 'Mild', notes: '' });
    const [wardType, setWardType] = useState('');
    const [wardSuggestion, setWardSuggestion] = useState(null);
    const [wardLoading, setWardLoading] = useState(false);
    const [formSuccess, setFormSuccess] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const res = await getUsers(token);
                setPatients((res.users || []).filter(u => u.role === 'patient'));
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        })();
    }, []);

    const loadPatientData = async (patient) => {
        setSelectedPatient(patient);
        setActiveTab('details');
        try {
            const [rx, dx, cs] = await Promise.all([
                axios.get(`/api/doctor/prescriptions?patient_email=${patient.email}`),
                axios.get(`/api/doctor/diagnoses?patient_email=${patient.email}`),
                axios.get(`/api/patient/cases?department=${encodeURIComponent(patient.department || '')}`),
            ]);
            setPrescriptions(rx.data.prescriptions || []);
            setDiagnoses(dx.data.diagnoses || []);
            setCases(cs.data.cases || []);
        } catch (err) { console.error(err); }
    };

    const addPrescription = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/doctor/prescriptions', {
                ...rxForm,
                patient_email: selectedPatient.email,
                patient_name: selectedPatient.name,
            });
            setFormSuccess('Prescription added!');
            setRxForm({ medication: '', dosage: '', frequency: '', duration: '', notes: '' });
            loadPatientData(selectedPatient);
            setTimeout(() => setFormSuccess(''), 3000);
        } catch (err) { console.error(err); }
    };

    const addDiagnosis = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/doctor/diagnoses', {
                ...dxForm,
                patient_email: selectedPatient.email,
                patient_name: selectedPatient.name,
            });
            setFormSuccess('Diagnosis added!');
            setDxForm({ condition: '', severity: 'Mild', notes: '' });
            loadPatientData(selectedPatient);
            setTimeout(() => setFormSuccess(''), 3000);
        } catch (err) { console.error(err); }
    };

    const updateCaseStatus = async (caseId, status) => {
        try {
            await axios.put(`/api/doctor/cases/${caseId}/status`, { status });
            setCases(prev => prev.map(c => c.id === caseId ? { ...c, status } : c));
        } catch (err) { console.error(err); }
    };

    const filtered = patients.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto flex gap-6 min-h-[calc(100vh-120px)]">
            {/* Patient list sidebar */}
            <div className="w-80 flex-shrink-0 space-y-3">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <Users size={20} className="text-blue-600" /> Patients
                </h2>
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-surface-card text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-1.5 max-h-[65vh] overflow-y-auto pr-1">
                    {loading ? <p className="text-xs text-text-muted py-4 text-center">Loading...</p> :
                        filtered.map(p => (
                            <button key={p.id} onClick={() => loadPatientData(p)}
                                className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3
                                    ${selectedPatient?.id === p.id ? 'bg-blue-50 border-blue-200' : 'bg-surface-card border-border hover:bg-surface'}`}>
                                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 font-bold text-xs flex-shrink-0">
                                    {p.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-text-primary truncate">{p.name}</p>
                                    <p className="text-[10px] text-text-muted truncate">{p.email}</p>
                                </div>
                                <ChevronRight size={14} className="text-text-muted ml-auto flex-shrink-0" />
                            </button>
                        ))}
                </div>
            </div>

            {/* Patient detail panel */}
            <div className="flex-1">
                {!selectedPatient ? (
                    <div className="flex items-center justify-center h-full text-text-muted text-sm">
                        ← Select a patient to view details
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Patient header */}
                        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                    {selectedPatient.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-text-primary">{selectedPatient.name}</h3>
                                    <p className="text-xs text-text-secondary">{selectedPatient.email} · {selectedPatient.department || '—'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 bg-surface-card rounded-xl p-1 border border-border">
                            {[
                                { key: 'details', label: 'Cases', icon: Activity },
                                { key: 'prescriptions', label: 'Prescriptions', icon: Pill },
                                { key: 'diagnosis', label: 'Diagnosis', icon: FileText },
                                { key: 'ward', label: 'Assign Ward', icon: BedDouble },
                            ].map(tab => (
                                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all
                                        ${activeTab === tab.key ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:bg-surface'}`}>
                                    <tab.icon size={13} /> {tab.label}
                                </button>
                            ))}
                        </div>

                        {formSuccess && (
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="text-emerald-600 text-xs bg-emerald-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
                                <CheckCircle size={14} /> {formSuccess}
                            </motion.p>
                        )}

                        {/* Cases tab */}
                        {activeTab === 'details' && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-text-secondary uppercase">Cases ({cases.length})</h4>
                                {cases.slice(0, 15).map(c => (
                                    <div key={c.id} className="p-3 rounded-xl bg-surface-card border border-border flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-text-primary">Case #{c.id} — {c.severity}</p>
                                            <p className="text-[10px] text-text-muted">{c.department} · {c.created_time ? new Date(c.created_time).toLocaleDateString() : ''}</p>
                                        </div>
                                        <select value={c.status} onChange={e => updateCaseStatus(c.id, e.target.value)}
                                            className="px-2 py-1 rounded-lg border border-border text-[10px] font-semibold bg-surface cursor-pointer focus:outline-none">
                                            {CASE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Prescriptions tab */}
                        {activeTab === 'prescriptions' && (
                            <div className="space-y-4">
                                <form onSubmit={addPrescription} className="p-4 rounded-xl bg-surface-card border border-border space-y-3">
                                    <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                                        <Plus size={13} className="text-primary" /> Add Prescription
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input value={rxForm.medication} onChange={e => setRxForm(f => ({ ...f, medication: e.target.value }))}
                                            placeholder="Medication" className="px-3 py-2 rounded-lg border border-border text-xs bg-surface focus:outline-none" required />
                                        <input value={rxForm.dosage} onChange={e => setRxForm(f => ({ ...f, dosage: e.target.value }))}
                                            placeholder="Dosage (e.g. 500mg)" className="px-3 py-2 rounded-lg border border-border text-xs bg-surface focus:outline-none" required />
                                        <input value={rxForm.frequency} onChange={e => setRxForm(f => ({ ...f, frequency: e.target.value }))}
                                            placeholder="Frequency (e.g. 2x daily)" className="px-3 py-2 rounded-lg border border-border text-xs bg-surface focus:outline-none" required />
                                        <input value={rxForm.duration} onChange={e => setRxForm(f => ({ ...f, duration: e.target.value }))}
                                            placeholder="Duration (e.g. 7 days)" className="px-3 py-2 rounded-lg border border-border text-xs bg-surface focus:outline-none" required />
                                    </div>
                                    <input value={rxForm.notes} onChange={e => setRxForm(f => ({ ...f, notes: e.target.value }))}
                                        placeholder="Notes (optional)" className="w-full px-3 py-2 rounded-lg border border-border text-xs bg-surface focus:outline-none" />
                                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold cursor-pointer hover:bg-primary-dark transition-colors">
                                        Add Prescription
                                    </button>
                                </form>
                                <div className="space-y-2">
                                    {prescriptions.map(rx => (
                                        <div key={rx.id} className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/50">
                                            <p className="text-xs font-bold text-emerald-800">💊 {rx.medication} — {rx.dosage}</p>
                                            <p className="text-[10px] text-emerald-600">{rx.frequency} · {rx.duration}</p>
                                            {rx.notes && <p className="text-[10px] text-emerald-500 mt-1">{rx.notes}</p>}
                                        </div>
                                    ))}
                                    {prescriptions.length === 0 && <p className="text-xs text-text-muted text-center py-4">No prescriptions yet</p>}
                                </div>
                            </div>
                        )}

                        {/* Diagnosis tab */}
                        {activeTab === 'diagnosis' && (
                            <div className="space-y-4">
                                <form onSubmit={addDiagnosis} className="p-4 rounded-xl bg-surface-card border border-border space-y-3">
                                    <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                                        <Plus size={13} className="text-primary" /> Add Diagnosis
                                    </h4>
                                    <input value={dxForm.condition} onChange={e => setDxForm(f => ({ ...f, condition: e.target.value }))}
                                        placeholder="Condition / Diagnosis" className="w-full px-3 py-2 rounded-lg border border-border text-xs bg-surface focus:outline-none" required />
                                    <select value={dxForm.severity} onChange={e => setDxForm(f => ({ ...f, severity: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-border text-xs bg-surface cursor-pointer focus:outline-none">
                                        {SEVERITY_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <textarea value={dxForm.notes} onChange={e => setDxForm(f => ({ ...f, notes: e.target.value }))}
                                        placeholder="Clinical notes" rows={2}
                                        className="w-full px-3 py-2 rounded-lg border border-border text-xs bg-surface resize-none focus:outline-none" />
                                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold cursor-pointer hover:bg-primary-dark transition-colors">
                                        Add Diagnosis
                                    </button>
                                </form>
                                <div className="space-y-2">
                                    {diagnoses.map(dx => (
                                        <div key={dx.id} className="p-3 rounded-xl bg-purple-50 border border-purple-200/50">
                                            <p className="text-xs font-bold text-purple-800">🩺 {dx.condition}</p>
                                            <p className="text-[10px] text-purple-600">Severity: {dx.severity}</p>
                                            {dx.notes && <p className="text-[10px] text-purple-500 mt-1">{dx.notes}</p>}
                                        </div>
                                    ))}
                                    {diagnoses.length === 0 && <p className="text-xs text-text-muted text-center py-4">No diagnoses yet</p>}
                                </div>
                            </div>
                        )}

                        {/* Ward assignment tab */}
                        {activeTab === 'ward' && (
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-surface-card border border-border space-y-3">
                                    <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                                        <BedDouble size={13} className="text-primary" /> Assign Patient to Ward
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <select value={wardType} onChange={async (e) => {
                                            const wt = e.target.value;
                                            setWardType(wt);
                                            if (!wt) { setWardSuggestion(null); return; }
                                            setWardLoading(true);
                                            try {
                                                const res = await axios.get(`/api/ward/suggest-ward?department=${encodeURIComponent(selectedPatient.department || user.department || 'Emergency')}&ward_type=${wt}`);
                                                setWardSuggestion(res.data.suggestion);
                                            } catch (err) { setWardSuggestion(null); }
                                            finally { setWardLoading(false); }
                                        }} className="px-3 py-2 rounded-lg border border-border text-xs bg-surface cursor-pointer focus:outline-none">
                                            <option value="">Select Ward Type</option>
                                            {WARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <div className="text-xs text-text-muted flex items-center">
                                            {wardLoading ? 'Finding best ward...' :
                                                wardSuggestion ? `Suggested: ${wardSuggestion.ward_id} (${wardSuggestion.available} beds free)` :
                                                    wardType ? 'No wards available' : 'Select a type first'}
                                        </div>
                                    </div>
                                    {wardSuggestion && (
                                        <div className="p-3 rounded-lg bg-teal-50 border border-teal-200/50">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-bold text-teal-800">🏥 {wardSuggestion.ward_id}</p>
                                                    <p className="text-[10px] text-teal-600">{wardSuggestion.type} · {wardSuggestion.department} · {wardSuggestion.available}/{wardSuggestion.capacity} beds free</p>
                                                </div>
                                                <button onClick={async () => {
                                                    try {
                                                        await axios.post('/api/ward/ward-admission', {
                                                            patient_name: selectedPatient.name,
                                                            patient_email: selectedPatient.email,
                                                            ward_type: wardType,
                                                            department: selectedPatient.department || user.department || 'Emergency',
                                                            assigned_by_doctor: user.name || user.email,
                                                            notes: `Assigned by Dr. ${user.name || user.email}`,
                                                        });
                                                        setFormSuccess('Patient assigned to ward! Nurse will confirm admission.');
                                                        setWardType('');
                                                        setWardSuggestion(null);
                                                        setTimeout(() => setFormSuccess(''), 4000);
                                                    } catch (err) { console.error(err); }
                                                }} className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold cursor-pointer hover:bg-teal-700 transition-colors">
                                                    Assign Ward
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
