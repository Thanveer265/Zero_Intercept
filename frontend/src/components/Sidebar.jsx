import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Briefcase, BrainCircuit,
    FlaskConical, Target,
    FileText, Settings, ChevronLeft, ChevronRight,
    Activity
} from 'lucide-react';

const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/operations', icon: Briefcase, label: 'Operations' },
    { path: '/intelligence', icon: BrainCircuit, label: 'Intelligence' },
    { path: '/simulation', icon: FlaskConical, label: 'Simulation' },
    { path: '/strategy', icon: Target, label: 'Strategy' },
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <motion.aside
            animate={{ width: collapsed ? 72 : 260 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed left-0 top-0 h-screen bg-sidebar text-white z-50 flex flex-col shadow-xl"
        >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-light to-accent flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30">
                    <Activity size={20} className="text-white" />
                </div>
                <AnimatePresence>
                    {!collapsed && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="overflow-hidden whitespace-nowrap"
                        >
                            <h1 className="text-sm font-bold leading-tight">Hospital</h1>
                            <p className="text-[10px] text-white/60 leading-tight">Intelligence Platform</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-2 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium cursor-pointer
               transition-all duration-200 group
               ${isActive
                                ? 'bg-sidebar-active text-white shadow-lg shadow-primary/20'
                                : 'text-white/70 hover:bg-sidebar-hover hover:text-white'
                            }`
                        }
                    >
                        <item.icon size={20} className="flex-shrink-0" />
                        <AnimatePresence>
                            {!collapsed && (
                                <motion.span
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    className="overflow-hidden whitespace-nowrap"
                                >
                                    {item.label}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </NavLink>
                ))}
            </nav>

            {/* Collapse Toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="flex items-center justify-center h-12 border-t border-white/10 hover:bg-sidebar-hover transition-colors cursor-pointer"
            >
                {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
        </motion.aside>
    );
}
