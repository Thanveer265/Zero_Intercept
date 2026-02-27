import { useState } from 'react';
import { Target, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { simulateScenario } from '../services/api';
import PageHeader from '../components/PageHeader';
import ChartCard from '../components/ChartCard';

const SCENARIOS = [
    { id: 'pandemic', label: 'Pandemic Surge', desc: 'Simulate 2.5x case volume with 20% staff reduction', color: 'from-red-500 to-red-600' },
    { id: 'surge_30', label: '30% Volume Surge', desc: 'Simulate 30% increase in case volume', color: 'from-amber-500 to-amber-600' },
    { id: 'staff_shortage', label: 'Staff Shortage', desc: 'Simulate 35% staff reduction scenario', color: 'from-purple-500 to-purple-600' },
];

export default function StrategicPlanning({ embedded }) {
    const [scenario, setScenario] = useState('surge_30');
    const [result, setResult] = useState(null);
    const [running, setRunning] = useState(false);

    const handleRun = async () => {
        setRunning(true);
        try {
            const data = await simulateScenario({ scenario, department: 'all' });
            setResult(data);
        } catch (e) { console.error(e); }
        finally { setRunning(false); }
    };

    return (
        <div>
            {!embedded && <PageHeader title="Strategic Planning" subtitle="Scenario-based operational stress testing" icon={Target} />}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {SCENARIOS.map((s) => (
                    <motion.div key={s.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => setScenario(s.id)}
                        className={`rounded-2xl p-5 cursor-pointer border-2 transition-all ${scenario === s.id ? 'border-primary shadow-lg' : 'border-transparent bg-surface-card shadow-sm'
                            }`}>
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
                            <Target size={20} className="text-white" />
                        </div>
                        <h3 className="text-sm font-bold text-text-primary mb-1">{s.label}</h3>
                        <p className="text-xs text-text-secondary">{s.desc}</p>
                    </motion.div>
                ))}
            </div>

            <div className="mb-6">
                <button onClick={handleRun} disabled={running}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white font-semibold text-sm
                     flex items-center gap-2 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50">
                    <Play size={16} /> {running ? 'Simulating...' : 'Run Scenario'}
                </button>
            </div>

            {result && (
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <h3 className="text-lg font-bold text-text-primary">{result.scenario}</h3>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${result.overall_risk > 80 ? 'bg-red-100 text-red-800' :
                            result.overall_risk > 60 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                            }`}>Overall Risk: {result.overall_risk}%</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {result.departments?.map((dept, i) => (
                            <motion.div key={dept.department} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                                className={`rounded-2xl p-5 border shadow-sm ${dept.risk_level === 'Critical' ? 'bg-red-50 border-red-200' :
                                    dept.risk_level === 'High' ? 'bg-amber-50 border-amber-200' :
                                        dept.risk_level === 'Medium' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'
                                    }`}>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-bold">{dept.department}</h4>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${dept.risk_level === 'Critical' ? 'bg-red-200 text-red-800' :
                                        dept.risk_level === 'High' ? 'bg-amber-200 text-amber-800' :
                                            dept.risk_level === 'Medium' ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'
                                        }`}>{dept.risk_level}</span>
                                </div>
                                <div className="mb-3">
                                    <div className="flex justify-between text-xs text-text-secondary mb-1">
                                        <span>Stress Level</span><span>{dept.stress_level}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${dept.stress_level}%` }} transition={{ duration: 0.8 }}
                                            className={`h-full rounded-full ${dept.stress_level > 80 ? 'bg-red-500' : dept.stress_level > 60 ? 'bg-amber-500' : 'bg-blue-500'
                                                }`} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                    <div><span className="text-text-secondary">Cases:</span> <span className="font-semibold">{dept.current_cases} → {dept.projected_cases}</span></div>
                                    <div><span className="text-text-secondary">Staff:</span> <span className="font-semibold">{dept.current_staff} → {dept.projected_staff}</span></div>
                                </div>
                                <div className="space-y-1">
                                    {dept.recommendations?.map((r, j) => (
                                        <p key={j} className="text-[11px] text-text-secondary">• {r}</p>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
