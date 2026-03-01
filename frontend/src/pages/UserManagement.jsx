import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, UserPlus, Trash2, Shield, Stethoscope,
    Heart, User, Search, X, Building2
} from 'lucide-react';
import { getUsers, registerUser, deleteUser } from '../services/api';

const ROLE_CONFIG = {
    admin: { color: '#EF4444', bg: 'bg-red-50', text: 'text-red-700', icon: Shield, label: 'Admin' },
    doctor: { color: '#3B82F6', bg: 'bg-blue-50', text: 'text-blue-700', icon: Stethoscope, label: 'Doctor' },
    nurse: { color: '#10B981', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: Heart, label: 'Nurse' },
    patient: { color: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-700', icon: User, label: 'Patient' },
};

const DEPARTMENTS = ['Emergency', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Neurology', 'Administration'];

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState('all');

    const token = sessionStorage.getItem('zi_token');

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await getUsers(token);
            setUsers(res.users || []);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleDelete = async (userId, userName) => {
        if (!confirm(`Delete user "${userName}"?`)) return;
        try {
            await deleteUser(userId, token);
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (err) {
            alert(err?.response?.data?.detail || 'Failed to delete user');
        }
    };

    const filteredUsers = users.filter(u => {
        const matchSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.department || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchRole = filterRole === 'all' || u.role === filterRole;
        return matchSearch && matchRole;
    });

    const roleCounts = {
        all: users.length,
        admin: users.filter(u => u.role === 'admin').length,
        doctor: users.filter(u => u.role === 'doctor').length,
        nurse: users.filter(u => u.role === 'nurse').length,
        patient: users.filter(u => u.role === 'patient').length,
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">User Management</h1>
                    <p className="text-sm text-text-secondary mt-1">Manage hospital staff and patient accounts</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark
                        text-white font-semibold text-sm shadow-lg shadow-primary/20 cursor-pointer
                        hover:shadow-xl transition-shadow"
                >
                    <UserPlus size={18} />
                    Create User
                </motion.button>
            </div>

            {/* Role filter tabs */}
            <div className="flex gap-2 flex-wrap">
                {['all', 'admin', 'doctor', 'nurse', 'patient'].map(role => (
                    <button
                        key={role}
                        onClick={() => setFilterRole(role)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer
                            ${filterRole === role
                                ? 'bg-primary text-white shadow-md'
                                : 'bg-surface-card text-text-secondary hover:bg-surface border border-border'}`}
                    >
                        {role === 'all' ? 'All' : ROLE_CONFIG[role]?.label} ({roleCounts[role]})
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, or department..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-surface-card text-sm
                        focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
            </div>

            {/* Users table */}
            <div className="bg-surface-card rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-surface">
                                <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">User</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Role</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Department</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Details</th>
                                <th className="text-right px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} className="text-center py-12 text-text-muted">Loading users...</td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-12 text-text-muted">No users found</td></tr>
                            ) : (
                                filteredUsers.map((user, i) => {
                                    const roleConf = ROLE_CONFIG[user.role] || ROLE_CONFIG.patient;
                                    const RoleIcon = roleConf.icon;
                                    return (
                                        <motion.tr
                                            key={user.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.02 }}
                                            className="border-b border-border/50 hover:bg-surface/50 transition-colors"
                                        >
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-xl ${roleConf.bg} flex items-center justify-center flex-shrink-0`}>
                                                        <RoleIcon size={16} style={{ color: roleConf.color }} />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-text-primary text-[13px]">{user.name}</p>
                                                        <p className="text-[11px] text-text-muted">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${roleConf.bg} ${roleConf.text}`}>
                                                    {roleConf.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-1.5 text-text-secondary text-[13px]">
                                                    <Building2 size={13} className="text-text-muted" />
                                                    {user.department || '—'}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-[12px] text-text-muted">
                                                {user.staff_id && <span>Staff #{user.staff_id}</span>}
                                                {user.cases_handled != null && <span> · {user.cases_handled} cases</span>}
                                                {user.overtime_hours != null && user.overtime_hours > 0 && (
                                                    <span className={user.overtime_hours > 10 ? ' text-critical' : ''}> · {user.overtime_hours}h OT</span>
                                                )}
                                                {!user.staff_id && <span>Created by: {user.created_by || 'system'}</span>}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                {user.email !== 'admin@hospital.ai' && (
                                                    <button
                                                        onClick={() => handleDelete(user.id, user.name)}
                                                        className="p-1.5 rounded-lg text-text-muted hover:text-critical hover:bg-critical/10 transition-colors cursor-pointer"
                                                        title="Delete user"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </td>
                                        </motion.tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create User Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateUserModal
                        token={token}
                        onClose={() => setShowCreateModal(false)}
                        onCreated={() => { setShowCreateModal(false); fetchUsers(); }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}


function CreateUserModal({ token, onClose, onCreated }) {
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'patient', department: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await registerUser(form, token);
            onCreated();
        } catch (err) {
            setError(err?.response?.data?.detail || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md bg-surface-card rounded-2xl shadow-2xl border border-border p-6"
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                        <UserPlus size={20} className="text-primary" /> Create User
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface cursor-pointer text-text-muted">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">Full Name</label>
                        <input
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Dr. John Smith"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">Email</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            placeholder="john@hospital.ai"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">Password</label>
                        <input
                            type="password"
                            value={form.password}
                            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                            placeholder="••••••••"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary mb-1.5">Role</label>
                            <select
                                value={form.role}
                                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                            >
                                <option value="patient">Patient</option>
                                <option value="nurse">Nurse</option>
                                <option value="doctor">Doctor</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary mb-1.5">Department</label>
                            <select
                                value={form.department}
                                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                            >
                                <option value="">Select...</option>
                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>

                    {error && (
                        <p className="text-rose-500 text-xs bg-rose-50 px-3 py-2 rounded-lg">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-sm
                            shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50 transition-all"
                    >
                        {loading ? 'Creating...' : 'Create Account'}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
}
