import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Activity, ClipboardList, Brain, Microscope,
    Target, FileText, Settings
} from 'lucide-react';

const navItems = [
    { path: '/', icon: Activity, label: 'Dashboard' },
    { path: '/operations', icon: ClipboardList, label: 'Operations' },
    { path: '/intelligence', icon: Brain, label: 'Intelligence' },
    { path: '/simulation', icon: Microscope, label: 'Simulation' },
    { path: '/strategy', icon: Target, label: 'Strategy' },
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
    const location = useLocation();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-[100] px-3 pb-3 pt-0 pointer-events-none">
            <div
                className="pointer-events-auto mx-auto max-w-2xl rounded-2xl px-2 py-1.5 flex items-center justify-between gap-0.5
                    shadow-2xl shadow-black/15 ring-1 ring-white/20"
                style={{
                    background: 'linear-gradient(135deg, #042F2E 0%, #0A3D3C 50%, #0D4F4D 100%)',
                }}
            >
                {navItems.map((item) => {
                    const isActive = item.path === '/'
                        ? location.pathname === '/'
                        : location.pathname.startsWith(item.path);

                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            className="relative flex flex-col items-center justify-center flex-1 py-2 rounded-xl cursor-pointer
                                transition-colors duration-200 group"
                        >
                            {/* Active pill background */}
                            {isActive && (
                                <motion.div
                                    layoutId="bottomnav-active"
                                    className="absolute inset-1 rounded-xl bg-white/12 shadow-lg shadow-black/10"
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                            )}

                            {/* Active top accent */}
                            {isActive && (
                                <motion.div
                                    layoutId="bottomnav-dot"
                                    className="absolute top-0.5 w-5 h-[2.5px] rounded-full bg-accent-light shadow-sm shadow-accent/40"
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                            )}

                            <item.icon
                                size={20}
                                className={`relative z-10 transition-colors duration-200
                                    ${isActive ? 'text-accent-light' : 'text-white/40 group-hover:text-white/70'}`}
                            />
                            <span className={`relative z-10 text-[9px] mt-1 font-medium tracking-tight transition-colors duration-200
                                ${isActive ? 'text-white' : 'text-white/30 group-hover:text-white/60'}`}>
                                {item.label}
                            </span>
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
}
