import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, MapPin, Heart, AlertTriangle, Save, CheckCircle, Download } from 'lucide-react';
import axios from 'axios';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function PatientProfile() {
    const user = JSON.parse(sessionStorage.getItem('zi_user') || '{}');
    const [profile, setProfile] = useState({
        phone: '', address: '', emergency_contact: '', blood_group: '', allergies: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await axios.get(`/api/patient/profile?email=${encodeURIComponent(user.email || '')}`);
                if (res.data.profile) {
                    setProfile(res.data.profile);
                }
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        })();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axios.put(`/api/patient/profile?email=${encodeURIComponent(user.email || '')}`, profile);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="text-center py-20 text-text-muted">Loading profile...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Profile header */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-200/50 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-3 text-2xl font-bold text-amber-600">
                    {(user.name || 'P').charAt(0)}
                </div>
                <h1 className="text-xl font-bold text-text-primary">{user.name || 'Patient'}</h1>
                <p className="text-sm text-text-secondary">{user.email}</p>
                <p className="text-xs text-text-muted mt-1">{user.department || 'General'} Department</p>
            </div>

            {/* Profile form */}
            <form onSubmit={handleSave} className="p-6 rounded-2xl bg-surface-card border border-border space-y-5">
                <h3 className="text-sm font-bold text-text-primary">Personal Information</h3>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-semibold text-text-secondary flex items-center gap-1 mb-1.5">
                            <Phone size={12} /> Phone Number
                        </label>
                        <input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                            placeholder="+91 98765 43210"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-text-secondary flex items-center gap-1 mb-1.5">
                            <Heart size={12} /> Blood Group
                        </label>
                        <select value={profile.blood_group} onChange={e => setProfile(p => ({ ...p, blood_group: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20">
                            <option value="">Select...</option>
                            {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-semibold text-text-secondary flex items-center gap-1 mb-1.5">
                        <MapPin size={12} /> Address
                    </label>
                    <textarea value={profile.address} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))}
                        placeholder="Your address..." rows={2}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>

                <div>
                    <label className="text-xs font-semibold text-text-secondary flex items-center gap-1 mb-1.5">
                        <User size={12} /> Emergency Contact
                    </label>
                    <input value={profile.emergency_contact} onChange={e => setProfile(p => ({ ...p, emergency_contact: e.target.value }))}
                        placeholder="Contact person name & number"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>

                <div>
                    <label className="text-xs font-semibold text-text-secondary flex items-center gap-1 mb-1.5">
                        <AlertTriangle size={12} /> Allergies
                    </label>
                    <textarea value={profile.allergies} onChange={e => setProfile(p => ({ ...p, allergies: e.target.value }))}
                        placeholder="List any known allergies..." rows={2}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>

                {success && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="text-emerald-600 text-xs bg-emerald-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
                        <CheckCircle size={14} /> Profile updated successfully!
                    </motion.p>
                )}

                <div className="flex gap-3">
                    <button type="submit" disabled={saving}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-sm
                            shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                        <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button type="button" onClick={() => window.print()}
                        className="px-4 py-2.5 rounded-xl border border-border bg-surface-card text-sm font-semibold text-text-secondary
                            cursor-pointer hover:bg-surface flex items-center gap-2 transition-colors">
                        <Download size={15} /> Print Report
                    </button>
                </div>
            </form>
        </div>
    );
}
