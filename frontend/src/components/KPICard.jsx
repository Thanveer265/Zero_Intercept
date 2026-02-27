import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function KPICard({ title, value, unit, trend, trendLabel, icon: Icon, color = 'primary', delay = 0 }) {
    const colorMap = {
        primary: 'from-primary to-primary-light',
        secondary: 'from-secondary to-secondary-light',
        accent: 'from-accent to-accent-light',
        warning: 'from-warning to-warning-light',
        critical: 'from-critical to-critical-light',
        green: 'from-emerald-500 to-emerald-400',
        teal: 'from-teal-500 to-teal-400',
        sky: 'from-sky-500 to-sky-400',
    };

    const getTrendIcon = () => {
        if (trend > 0) return <TrendingUp size={14} />;
        if (trend < 0) return <TrendingDown size={14} />;
        return <Minus size={14} />;
    };

    const getTrendColor = () => {
        if (trend > 0) return 'text-emerald-600 bg-emerald-50';
        if (trend < 0) return 'text-red-600 bg-red-50';
        return 'text-gray-500 bg-gray-100';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: delay * 0.1 }}
            className="bg-surface-card rounded-2xl p-5 shadow-sm border border-border
                 hover:shadow-md transition-all duration-300 cursor-default group"
        >
            <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color]} 
                         flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                    {Icon && <Icon size={20} className="text-white" />}
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTrendColor()}`}>
                        {getTrendIcon()}
                        <span>{Math.abs(trend)}%</span>
                    </div>
                )}
            </div>
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mb-1">{title}</p>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-text-primary">{value}</span>
                {unit && <span className="text-sm text-text-muted">{unit}</span>}
            </div>
            {trendLabel && (
                <p className="text-xs text-text-muted mt-1">{trendLabel}</p>
            )}
        </motion.div>
    );
}
