import { Settings, Palette, Bell, Shield, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import PageHeader from '../components/PageHeader';
import ChartCard from '../components/ChartCard';

export default function SettingsPage() {
    return (
        <div>
            <PageHeader title="Settings" subtitle="Platform configuration and preferences" icon={Settings} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Display Settings" delay={0}>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-surface">
                            <div className="flex items-center gap-3">
                                <Palette size={18} className="text-primary" />
                                <div>
                                    <p className="text-sm font-medium">Theme</p>
                                    <p className="text-xs text-text-secondary">Light mode active</p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white cursor-pointer">Light</button>
                                <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface text-text-secondary cursor-pointer hover:bg-surface/80">Dark</button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-surface">
                            <div className="flex items-center gap-3">
                                <Bell size={18} className="text-secondary" />
                                <div>
                                    <p className="text-sm font-medium">Alert Notifications</p>
                                    <p className="text-xs text-text-secondary">Real-time alert sounds</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" defaultChecked className="sr-only peer" />
                                <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-primary transition-colors">
                                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                                </div>
                            </label>
                        </div>
                    </div>
                </ChartCard>

                <ChartCard title="System Information" delay={1}>
                    <div className="space-y-3">
                        {[
                            { icon: Database, label: 'Database', value: 'SQLite (hospital.db)', status: 'Connected' },
                            { icon: Shield, label: 'API Status', value: 'http://localhost:8000', status: 'Active' },
                            { icon: Settings, label: 'Version', value: '1.0.0', status: 'Latest' },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-surface">
                                <div className="flex items-center gap-3">
                                    <item.icon size={18} className="text-primary" />
                                    <div>
                                        <p className="text-sm font-medium">{item.label}</p>
                                        <p className="text-xs text-text-secondary">{item.value}</p>
                                    </div>
                                </div>
                                <span className="text-xs font-medium text-secondary px-2 py-0.5 rounded-full bg-green-100">{item.status}</span>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </div>
        </div>
    );
}
