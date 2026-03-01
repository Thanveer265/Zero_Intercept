import { useState } from 'react';
import { FlaskConical, Play, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { runSimulation } from '../services/api';
import PageHeader from '../components/PageHeader';
import ChartCard from '../components/ChartCard';

const DEPARTMENTS = ['Emergency', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Neurology'];

export default function SimulationLab({ embedded }) {
    const [params, setParams] = useState({ department: 'Emergency', add_staff: 2, extend_shift_hours: 0, reallocate_cases: 0 });
    const [result, setResult] = useState(null);
    const [running, setRunning] = useState(false);

    const handleRun = async () => {
        setRunning(true);
        try {
            const data = await runSimulation(params);
            setResult(data);
        } catch (e) { console.error(e); }
        finally { setRunning(false); }
    };

    return (
        <div>
            {!embedded && <PageHeader title="Simulation Lab" subtitle="Simulate staffing changes and predict operational outcomes" icon={FlaskConical} />}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Simulation Parameters" subtitle="Adjust variables to predict outcomes" delay={0}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary mb-1.5">Department</label>
                            <select value={params.department} onChange={e => setParams({ ...params, department: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary mb-1.5">Add Staff Members</label>
                            <input type="range" min="0" max="10" value={params.add_staff} onChange={e => setParams({ ...params, add_staff: +e.target.value })}
                                className="w-full accent-primary" />
                            <span className="text-sm font-semibold text-primary">+{params.add_staff} staff</span>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary mb-1.5">Extend Shift Hours</label>
                            <input type="range" min="0" max="6" step="0.5" value={params.extend_shift_hours} onChange={e => setParams({ ...params, extend_shift_hours: +e.target.value })}
                                className="w-full accent-secondary" />
                            <span className="text-sm font-semibold text-secondary">+{params.extend_shift_hours}h per shift</span>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary mb-1.5">Reallocate Cases to Other Depts</label>
                            <input type="range" min="0" max="50" value={params.reallocate_cases} onChange={e => setParams({ ...params, reallocate_cases: +e.target.value })}
                                className="w-full accent-accent" />
                            <span className="text-sm font-semibold text-accent">{params.reallocate_cases} cases</span>
                        </div>
                        <button onClick={handleRun} disabled={running}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white font-semibold text-sm
                         flex items-center justify-center gap-2 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50">
                            <Play size={16} /> {running ? 'Running Simulation...' : 'Run Simulation'}
                        </button>
                    </div>
                </ChartCard>

                <ChartCard title="Predicted Outcomes" subtitle={result ? 'Comparison of current vs. predicted metrics' : 'Run a simulation to see predictions'} delay={1}>
                    {result ? (
                        <div className="space-y-4">
                            {[
                                { label: 'Avg Resolution Time', current: `${result.current.avg_resolution_hrs}h`, predicted: `${result.predicted.avg_resolution_hrs}h`, improvement: `${result.improvements.resolution_improvement_pct}%` },
                                { label: 'SLA Compliance', current: `${result.current.sla_compliance_pct}%`, predicted: `${result.predicted.sla_compliance_pct}%`, improvement: `+${result.improvements.sla_improvement_pct}%` },
                                { label: 'Cases per Staff', current: result.current.cases_per_staff, predicted: result.predicted.cases_per_staff, improvement: `${result.improvements.efficiency_change_pct}%` },
                                { label: 'Staff Count', current: result.current.staff_count, predicted: result.predicted.staff_count },
                                { label: 'Active Cases', current: result.current.active_cases, predicted: result.predicted.active_cases },
                            ].map((row) => (
                                <motion.div key={row.label} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center justify-between p-3 rounded-xl bg-surface">
                                    <span className="text-sm font-medium text-text-secondary w-36">{row.label}</span>
                                    <span className="text-sm font-semibold text-text-primary">{row.current}</span>
                                    <ArrowRight size={14} className="text-text-muted" />
                                    <span className="text-sm font-bold text-primary">{row.predicted}</span>
                                    {row.improvement && (
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">{row.improvement}</span>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-60 text-text-muted text-sm">
                            Adjust parameters and run simulation
                        </div>
                    )}
                </ChartCard>
            </div>
        </div>
    );
}
