import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Activity, Heart, Thermometer, Droplets,
    Plus, CheckCircle, Search, FileText
} from 'lucide-react';
import axios from 'axios';
import { getUsers } from '../services/api';

export default function PatientVitals() {
    const token = sessionStorage.getItem('zi_token');
    const user = JSON.parse(sessionStorage.getItem('zi_user') || '{}');
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [vitals, setVitals] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState('');

    const [form, setForm] = useState({
        bp_systolic: '', bp_diastolic: '', sugar_level: '',
        temperature: '', heart_rate: '', notes: ''
    });

    useEffect(() => {
        (async () => {
            try {
                const res = await getUsers(token);
                setPatients((res.users || []).filter(u => u.role === 'patient'));
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        })();
    }, []);

    const selectPatient = async (p) => {
        setSelectedPatient(p);
        try {
            const res = await axios.get(`/api/nurse/vitals?patient_email=${p.email}`);
            setVitals(res.data.vitals || []);
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/nurse/vitals', {
                patient_email: selectedPatient.email,
                patient_name: selectedPatient.name,
                bp_systolic: form.bp_systolic ? parseInt(form.bp_systolic) : null,
                bp_diastolic: form.bp_diastolic ? parseInt(form.bp_diastolic) : null,
                sugar_level: form.sugar_level ? parseFloat(form.sugar_level) : null,
                temperature: form.temperature ? parseFloat(form.temperature) : null,
                heart_rate: form.heart_rate ? parseInt(form.heart_rate) : null,
                notes: form.notes,
            });
            setSuccess('Vitals recorded!');
            setForm({ bp_systolic: '', bp_diastolic: '', sugar_level: '', temperature: '', heart_rate: '', notes: '' });
            selectPatient(selectedPatient);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) { console.error(err); }
    };

    const filtered = patients.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase())
    );

    const getBPStatus = (sys, dia) => {
        if (!sys) return { text: '—', color: 'text-text-muted' };
        if (sys >= 140 || dia >= 90) return { text: 'High', color: 'text-red-600' };
        if (sys < 90 || dia < 60) return { text: 'Low', color: 'text-amber-600' };
        return { text: 'Normal', color: 'text-emerald-600' };
    };

    return (
        <div className="max-w-7xl mx-auto flex gap-6 min-h-[calc(100vh-120px)]">
            {/* Patient list */}
            <div className="w-72 flex-shrink-0 space-y-3">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <Activity size={20} className="text-emerald-600" /> Patients
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
                            <button key={p.id} onClick={() => selectPatient(p)}
                                className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer
                                    ${selectedPatient?.id === p.id ? 'bg-emerald-50 border-emerald-200' : 'bg-surface-card border-border hover:bg-surface'}`}>
                                <p className="text-xs font-semibold text-text-primary">{p.name}</p>
                                <p className="text-[10px] text-text-muted">{p.email}</p>
                            </button>
                        ))}
                </div>
            </div>

            {/* Vitals panel */}
            <div className="flex-1">
                {!selectedPatient ? (
                    <div className="flex items-center justify-center h-full text-text-muted text-sm">
                        ← Select a patient to record vitals
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/50">
                            <h3 className="font-bold text-text-primary">{selectedPatient.name}</h3>
                            <p className="text-xs text-text-secondary">{selectedPatient.email} · {selectedPatient.department || '—'}</p>
                        </div>

                        {/* Record vitals form */}
                        <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-surface-card border border-border space-y-3">
                            <h4 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                                <Plus size={14} className="text-primary" /> Record Vitals
                            </h4>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[10px] font-semibold text-text-muted uppercase flex items-center gap-1 mb-1">
                                        <Heart size={11} className="text-red-500" /> BP Systolic
                                    </label>
                                    <input value={form.bp_systolic} onChange={e => setForm(f => ({ ...f, bp_systolic: e.target.value }))}
                                        placeholder="e.g. 120" type="number"
                                        className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-text-muted uppercase flex items-center gap-1 mb-1">
                                        <Heart size={11} className="text-red-500" /> BP Diastolic
                                    </label>
                                    <input value={form.bp_diastolic} onChange={e => setForm(f => ({ ...f, bp_diastolic: e.target.value }))}
                                        placeholder="e.g. 80" type="number"
                                        className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-text-muted uppercase flex items-center gap-1 mb-1">
                                        <Droplets size={11} className="text-blue-500" /> Sugar (mg/dL)
                                    </label>
                                    <input value={form.sugar_level} onChange={e => setForm(f => ({ ...f, sugar_level: e.target.value }))}
                                        placeholder="e.g. 110" type="number"
                                        className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-text-muted uppercase flex items-center gap-1 mb-1">
                                        <Thermometer size={11} className="text-orange-500" /> Temp (°F)
                                    </label>
                                    <input value={form.temperature} onChange={e => setForm(f => ({ ...f, temperature: e.target.value }))}
                                        placeholder="e.g. 98.6" type="number" step="0.1"
                                        className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-text-muted uppercase flex items-center gap-1 mb-1">
                                        <Activity size={11} className="text-emerald-500" /> Heart Rate
                                    </label>
                                    <input value={form.heart_rate} onChange={e => setForm(f => ({ ...f, heart_rate: e.target.value }))}
                                        placeholder="e.g. 72" type="number"
                                        className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-text-muted uppercase flex items-center gap-1 mb-1">
                                    <FileText size={11} /> Nursing Notes
                                </label>
                                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    placeholder="Clinical observations, care notes..."
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-surface resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
                            </div>

                            {success && (
                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="text-emerald-600 text-xs bg-emerald-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
                                    <CheckCircle size={14} /> {success}
                                </motion.p>
                            )}

                            <button type="submit"
                                className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold cursor-pointer hover:shadow-lg transition-all">
                                Save Vitals
                            </button>
                        </form>

                        {/* Vitals history */}
                        <div>
                            <h4 className="text-sm font-bold text-text-primary mb-3">Vitals History</h4>
                            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                                {vitals.map((v, i) => {
                                    const bp = getBPStatus(v.bp_systolic, v.bp_diastolic);
                                    return (
                                        <motion.div key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            transition={{ delay: i * 0.03 }}
                                            className="p-3 rounded-xl bg-surface-card border border-border">
                                            <div className="flex items-center gap-4 flex-wrap text-xs">
                                                {v.bp_systolic && (
                                                    <span className="flex items-center gap-1">
                                                        <Heart size={12} className="text-red-500" />
                                                        BP: <span className={`font-bold ${bp.color}`}>{v.bp_systolic}/{v.bp_diastolic}</span>
                                                        <span className={`text-[10px] ${bp.color}`}>({bp.text})</span>
                                                    </span>
                                                )}
                                                {v.sugar_level && (
                                                    <span className="flex items-center gap-1">
                                                        <Droplets size={12} className="text-blue-500" />
                                                        Sugar: <span className="font-bold">{v.sugar_level}</span>
                                                    </span>
                                                )}
                                                {v.temperature && (
                                                    <span className="flex items-center gap-1">
                                                        <Thermometer size={12} className="text-orange-500" />
                                                        Temp: <span className="font-bold">{v.temperature}°F</span>
                                                    </span>
                                                )}
                                                {v.heart_rate && (
                                                    <span className="flex items-center gap-1">
                                                        <Activity size={12} className="text-emerald-500" />
                                                        HR: <span className="font-bold">{v.heart_rate} bpm</span>
                                                    </span>
                                                )}
                                            </div>
                                            {v.notes && <p className="text-[11px] text-text-secondary mt-1.5">📝 {v.notes}</p>}
                                            <p className="text-[10px] text-text-muted mt-1">{v.recorded_at ? new Date(v.recorded_at).toLocaleString() : ''}</p>
                                        </motion.div>
                                    );
                                })}
                                {vitals.length === 0 && <p className="text-xs text-text-muted text-center py-6">No vitals recorded yet</p>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
