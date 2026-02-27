import { useState, useEffect } from 'react';
import { FileText, Download, FileSpreadsheet } from 'lucide-react';
import { motion } from 'framer-motion';
import { getReport } from '../services/api';
import PageHeader from '../components/PageHeader';
import ChartCard from '../components/ChartCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Reports() {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getReport().then(setReport).catch(console.error).finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingSpinner />;

    const handleExport = (type) => {
        const url = `/api/reports/export/${type}`;
        window.open(url, '_blank');
    };

    return (
        <div>
            <PageHeader title="Reports" subtitle="Auto-generated operational reports with export options" icon={FileText}>
                <div className="flex gap-2">
                    <button onClick={() => handleExport('pdf')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-critical text-white text-sm font-medium
                       hover:shadow-lg transition-all cursor-pointer">
                        <Download size={16} /> PDF Export
                    </button>
                    <button onClick={() => handleExport('csv')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-white text-sm font-medium
                       hover:shadow-lg transition-all cursor-pointer">
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
