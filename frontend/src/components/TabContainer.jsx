import { useState } from 'react';
import { motion } from 'framer-motion';

export default function TabContainer({ tabs, icon: Icon, title, subtitle }) {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <div>
            {/* Page Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-5">
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
            </motion.div>

            {/* Tab Bar */}
            <div className="relative mb-6">
                <div className="flex gap-1 bg-surface-card rounded-2xl p-1.5 border border-border shadow-sm">
                    {tabs.map((tab, i) => (
                        <button
                            key={tab.label}
                            onClick={() => setActiveTab(i)}
                            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                         transition-all duration-200 cursor-pointer flex-1 justify-center
                         ${activeTab === i
                                    ? 'text-white'
                                    : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                                }`}
                        >
                            {activeTab === i && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-gradient-to-r from-primary to-primary-light rounded-xl shadow-lg"
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                                {tab.icon && <tab.icon size={16} />}
                                {tab.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
            >
                {tabs[activeTab]?.component}
            </motion.div>
        </div>
    );
}
