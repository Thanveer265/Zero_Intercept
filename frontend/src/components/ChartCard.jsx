import { motion } from 'framer-motion';

export default function ChartCard({ title, subtitle, children, className = '', delay = 0 }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: delay * 0.1 }}
            className={`bg-surface-card rounded-2xl p-5 shadow-sm border border-border ${className}`}
        >
            {(title || subtitle) && (
                <div className="mb-4">
                    {title && <h3 className="text-sm font-semibold text-text-primary">{title}</h3>}
                    {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
                </div>
            )}
            {children}
        </motion.div>
    );
}
