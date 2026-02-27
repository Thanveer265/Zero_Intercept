import { useState, useEffect } from 'react';
import { IndianRupee } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { getFinancialImpact } from '../services/api';
import PageHeader from '../components/PageHeader';
import ChartCard from '../components/ChartCard';
import KPICard from '../components/KPICard';
import LoadingSpinner from '../components/LoadingSpinner';

const COLORS = ['#0F766E', '#0284C7', '#10B981', '#D97706', '#DC2626', '#7C3AED'];

export default function FinancialInsights({ embedded }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getFinancialImpact().then(setData).catch(console.error).finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingSpinner />;

    const fmt = (n) => {
        if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
        if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
        return `₹${n}`;
    };

    return (
        <div>
            {!embedded && <PageHeader title="Financial Insights" subtitle="Revenue impact and budget forecasting (INR)" icon={IndianRupee} />}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {data && [
                    { title: 'No-Show Revenue Loss', value: fmt(data.no_show_impact.revenue_loss), icon: IndianRupee, color: 'critical', trend: -data.no_show_impact.no_show_rate_pct },
                    { title: 'Delay Cost', value: fmt(data.delay_impact.delay_cost), icon: IndianRupee, color: 'warning' },
                    { title: 'Overtime Cost', value: fmt(data.overtime_impact.overtime_cost), icon: IndianRupee, color: 'accent' },
                    { title: 'Monthly Budget', value: fmt(data.budget_forecast.total_monthly), icon: IndianRupee, color: 'primary' },
                ].map((kpi, i) => <KPICard key={kpi.title} {...kpi} delay={i} />)}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <ChartCard title="Department Cost Breakdown" subtitle="Staff + overtime + no-show costs (₹)" delay={1}>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={data?.department_breakdown || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#CCFBF1" />
                            <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#5F7A76' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#5F7A76' }} tickFormatter={v => `₹${v / 1000}K`} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #CCFBF1' }} formatter={v => `₹${v.toLocaleString('en-IN')}`} />
                            <Bar dataKey="staff_cost" fill="#0F766E" radius={[4, 4, 0, 0]} name="Staff Cost" stackId="a" />
                            <Bar dataKey="overtime_cost" fill="#D97706" radius={[0, 0, 0, 0]} name="Overtime" stackId="a" />
                            <Bar dataKey="no_show_loss" fill="#DC2626" radius={[4, 4, 0, 0]} name="No-Show Loss" stackId="a" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Budget Distribution" subtitle="Monthly budget breakdown (₹)" delay={2}>
                    {data?.budget_forecast && (
                        <>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={[
                                        { name: 'Staff', value: data.budget_forecast.monthly_staff_cost },
                                        { name: 'Operations', value: data.budget_forecast.monthly_operational },
                                        { name: 'Equipment', value: data.budget_forecast.monthly_equipment },
                                    ]} dataKey="value" cx="50%" cy="50%" outerRadius={75} innerRadius={45} paddingAngle={3}>
                                        {[0, 1, 2].map(i => <Cell key={i} fill={COLORS[i]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px' }} formatter={v => `₹${v.toLocaleString('en-IN')}`} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="mt-2 space-y-2">
                                {[
                                    { label: 'Monthly Total', value: data.budget_forecast.total_monthly },
                                    { label: 'Quarterly Forecast', value: data.budget_forecast.quarterly_forecast },
                                ].map((item) => (
                                    <div key={item.label} className="flex justify-between p-2 bg-surface rounded-lg">
                                        <span className="text-xs text-text-secondary">{item.label}</span>
                                        <span className="text-sm font-bold text-primary">₹{item.value.toLocaleString('en-IN')}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </ChartCard>
            </div>

            <ChartCard title="Impact Summary" delay={3}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {data && [
                        {
                            title: 'No-Show Impact', items: [
                                { label: 'Appointments', value: data.no_show_impact.total_appointments },
                                { label: 'No-Shows', value: data.no_show_impact.no_shows },
                                { label: 'Rate', value: `${data.no_show_impact.no_show_rate_pct}%` },
                            ]
                        },
                        {
                            title: 'Delay Impact', items: [
                                { label: 'Delayed Cases', value: data.delay_impact.delayed_cases },
                                { label: 'Total Hours', value: `${data.delay_impact.total_delay_hours}h` },
                                { label: 'Cost', value: fmt(data.delay_impact.delay_cost) },
                            ]
                        },
                        {
                            title: 'Overtime Impact', items: [
                                { label: 'Total Hours', value: `${data.overtime_impact.total_overtime_hours}h` },
                                { label: 'Cost', value: fmt(data.overtime_impact.overtime_cost) },
                            ]
                        },
                    ].map((section) => (
                        <div key={section.title} className="bg-surface rounded-xl p-4">
                            <h4 className="text-xs font-semibold text-text-primary mb-3">{section.title}</h4>
                            {section.items.map((item) => (
                                <div key={item.label} className="flex justify-between py-1.5 border-b border-border/30 last:border-0">
                                    <span className="text-xs text-text-secondary">{item.label}</span>
                                    <span className="text-xs font-semibold">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </ChartCard>
        </div>
    );
}
