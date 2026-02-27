import { motion } from 'framer-motion';

export default function PageHeader({ title, subtitle, icon: Icon, children }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6"
        >
            <div className="flex items-center gap-3">
                {Icon && (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-lg">
                        <Icon size={20} className="text-white" />
                    </div>
                )}
                <div>
                    <h1 className="text-xl font-bold text-text-primary">{title}</h1>
                    {subtitle && <p className="text-sm text-text-secondary">{subtitle}</p>}
                </div>
            </div>
            {children && <div className="flex items-center gap-2">{children}</div>}
        </motion.div>
    );
}
