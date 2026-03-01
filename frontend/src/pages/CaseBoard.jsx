import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, AlertTriangle, Clock, CheckCircle2, AlertCircle, Filter } from 'lucide-react';
import axios from 'axios';

const STATUS_CONFIG = {
    'Open': { color: '#3B82F6', bg: 'bg-blue-50', text: 'text-blue-700', icon: Clock },
    'In Progress': { color: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertCircle },
    'Resolved': { color: '#10B981', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2 },
    'Escalated': { color: '#EF4444', bg: 'bg-red-50', text: 'text-red-700', icon: AlertTriangle },
};

const SEVERITY_COLOR = {
    'Low': 'bg-green-100 text-green-700',
    'Medium': 'bg-yellow-100 text-yellow-700',
    'High': 'bg-orange-100 text-orange-700',
    'Critical': 'bg-red-100 text-red-700',
};

export default function CaseBoard() {
    const [data, setData] = useState({ cases: [], total: 0 });
    const [loading, setLoading] = useState(true);
    const [filterDept, setFilterDept] = useState('all');
    const user = JSON.parse(sessionStorage.getItem('zi_user') || '{}');

    useEffect(() => {
        (async () => {
            try {
                const dept = user.department && user.role !== 'admin' ? `?department=${user.department}` : '';
                const res = await axios.get(`/api/patient/cases${dept}`);
                setData(res.data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        })();
    }, []);

    const departments = [...new Set(data.cases.map(c => c.department))];
    const filteredCases = filterDept === 'all' ? data.cases : data.cases.filter(c => c.department === filterDept);

    const columns = ['Open', 'In Progress', 'Resolved', 'Escalated'];

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <LayoutGrid size={24} className="text-primary" /> Case Board
                    </h1>
                    <p className="text-sm text-text-secondary mt-1">
                        {data.total} total cases · {data.open || 0} open · {data.in_progress || 0} in progress
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-text-muted" />
                    <select
                        value={filterDept}
                        onChange={e => setFilterDept(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-border bg-surface-card text-xs cursor-pointer focus:outline-none"
                    >
                        <option value="all">All Departments</option>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-16 text-text-muted">Loading cases...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {columns.map(status => {
                        const conf = STATUS_CONFIG[status];
                        const StatusIcon = conf.icon;
                        const columnCases = filteredCases.filter(c => c.status === status);

                        return (
                            <div key={status} className="space-y-3">
                                {/* Column header */}
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${conf.bg}`}>
                                    <StatusIcon size={16} style={{ color: conf.color }} />
                                    <span className={`text-sm font-bold ${conf.text}`}>{status}</span>
                                    <span className={`ml-auto text-xs font-bold ${conf.text} opacity-60`}>{columnCases.length}</span>
                                </div>

                                {/* Case cards */}
                                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                                    {columnCases.slice(0, 20).map((c, i) => (
                                        <motion.div
                                            key={c.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.02 }}
                                            className="p-3 rounded-xl bg-surface-card border border-border hover:shadow-sm transition-shadow"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-text-primary">Case #{c.id}</span>
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${SEVERITY_COLOR[c.severity] || ''}`}>
                                                    {c.severity}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-text-secondary mb-1.5">{c.department} · Staff #{c.staff_id}</p>
                                            <div className="flex items-center gap-1 text-[10px] text-text-muted">
                                                <Clock size={10} />
                                                {c.sla_deadline ? new Date(c.sla_deadline).toLocaleString() : 'No deadline'}
                                            </div>
                                        </motion.div>
                                    ))}
                                    {columnCases.length === 0 && (
                                        <p className="text-xs text-text-muted text-center py-6">No cases</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
