import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Building2, Mail, Calendar } from 'lucide-react';
import { getUsers } from '../services/api';

export default function MyPatients() {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const token = sessionStorage.getItem('zi_token');
    const user = JSON.parse(sessionStorage.getItem('zi_user') || '{}');

    useEffect(() => {
        (async () => {
            try {
                const res = await getUsers(token);
                // Doctor/Nurse see patients; filter by their department
                const filtered = (res.users || []).filter(u => u.role === 'patient');
                setPatients(filtered);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        })();
    }, []);

    const filtered = patients.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase()) ||
        (p.department || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                    <Users size={24} className="text-primary" /> My Patients
                </h1>
                <p className="text-sm text-text-secondary mt-1">
                    Patients in your care · {user.department || 'All departments'}
                </p>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search patients..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-surface-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
            </div>

            {/* Patients grid */}
            {loading ? (
                <div className="text-center py-16 text-text-muted">Loading patients...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((p, i) => (
                        <motion.div
                            key={p.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="p-5 rounded-2xl bg-surface-card border border-border hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 font-bold text-sm">
                                    {p.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-text-primary text-sm">{p.name}</h3>
                                    <p className="text-[11px] text-text-muted flex items-center gap-1">
                                        <Mail size={11} /> {p.email}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-text-secondary">
                                <span className="flex items-center gap-1"><Building2 size={12} /> {p.department || '—'}</span>
                                <span className="flex items-center gap-1"><Calendar size={12} /> {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</span>
                            </div>
                        </motion.div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="col-span-3 text-center py-16 text-text-muted">No patients found</div>
                    )}
                </div>
            )}
        </div>
    );
}
