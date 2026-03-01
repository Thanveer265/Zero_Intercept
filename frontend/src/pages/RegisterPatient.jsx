import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, CheckCircle } from 'lucide-react';
import { registerUser } from '../services/api';

const DEPARTMENTS = ['Emergency', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Neurology'];

export default function RegisterPatient() {
    const [form, setForm] = useState({ name: '', email: '', password: '', department: '' });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const token = sessionStorage.getItem('zi_token');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setSuccess(''); setLoading(true);
        try {
            const res = await registerUser({ ...form, role: 'patient' }, token);
            setSuccess(`Patient account created for ${form.name}`);
            setForm({ name: '', email: '', password: '', department: '' });
        } catch (err) {
            setError(err?.response?.data?.detail || 'Failed to create patient');
        } finally { setLoading(false); }
    };

    return (
        <div className="max-w-lg mx-auto space-y-6 mt-8">
            <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <UserPlus size={28} className="text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-text-primary">Register Patient</h1>
                <p className="text-sm text-text-secondary mt-1">Create a new patient account</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-surface-card border border-border space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">Patient Name</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Full name" required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">Email</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="patient@hospital.ai" required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">Password</label>
                    <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        placeholder="••••••••" required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">Department</label>
                    <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer" required>
                        <option value="">Select department...</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>

                {error && <p className="text-rose-500 text-xs bg-rose-50 px-3 py-2 rounded-lg">{error}</p>}
                {success && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="text-emerald-600 text-xs bg-emerald-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
                        <CheckCircle size={14} /> {success}
                    </motion.p>
                )}

                <button type="submit" disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-sm
                        shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50 transition-all">
                    {loading ? 'Creating...' : 'Register Patient'}
                </button>
            </form>
        </div>
    );
}
