import { useState } from 'react';
import { motion } from 'framer-motion';
import { Stethoscope, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import DNAHelix from '../components/DNAHelix';
import { loginUser } from '../services/api';

export default function LoginPage({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await loginUser(email, password);
            // Store token and user info
            sessionStorage.setItem('zi_token', res.token);
            onLogin(res.user);
        } catch (err) {
            const msg = err?.response?.data?.detail || 'Invalid credentials. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Panel — Branding */}
            <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-[#042F2E] via-[#0A3D3C] to-[#0F766E]">
                {/* Mesh pattern overlay */}
                <div className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
                        backgroundSize: '40px 40px',
                    }}
                />

                {/* 3D DNA Helix */}
                <DNAHelix />

                {/* Floating orbs */}
                <motion.div
                    animate={{ y: [0, -15, 0], x: [0, 8, 0] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute top-[15%] left-[20%] w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl"
                />
                <motion.div
                    animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute bottom-[20%] right-[15%] w-80 h-80 rounded-full bg-teal-400/8 blur-3xl"
                />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between p-12 w-full">
                    {/* Logo */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="flex items-center gap-3"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center">
                            <Stethoscope size={24} className="text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-white text-lg font-bold tracking-tight">Zero Intercept</h2>
                            <p className="text-emerald-400/70 text-xs font-medium">Hospital Intelligence Platform</p>
                        </div>
                    </motion.div>

                    {/* Center tagline */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="max-w-md"
                    >
                        <h1 className="text-5xl font-bold text-white leading-tight mb-6">
                            Operational
                            <br />
                            Intelligence,
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                                Reimagined.
                            </span>
                        </h1>
                        <p className="text-white/50 text-base leading-relaxed">
                            Real-time analytics, predictive insights, and AI-powered decision support for modern hospital administration.
                        </p>
                    </motion.div>

                    {/* Bottom stats */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="flex gap-8"
                    >
                        {[
                            { label: 'Active Cases', value: '847+' },
                            { label: 'Staff Monitored', value: '218' },
                            { label: 'SLA Compliance', value: '94%' },
                        ].map((stat) => (
                            <div key={stat.label}>
                                <p className="text-2xl font-bold text-white">{stat.value}</p>
                                <p className="text-xs text-white/40 font-medium">{stat.label}</p>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>

            {/* Right Panel — Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 relative">
                {/* Mobile logo */}
                <div className="lg:hidden absolute top-8 left-8 flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F766E] to-[#14B8A6] flex items-center justify-center">
                        <Stethoscope size={20} className="text-white" />
                    </div>
                    <span className="text-lg font-bold text-slate-800">Zero Intercept</span>
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-full max-w-[400px]"
                >
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-slate-800 mb-2">Welcome back</h2>
                        <p className="text-slate-500 text-sm">Sign in to access the command center</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                            <input
                                type="text"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@hospital.ai"
                                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                                    placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
                                    transition-all duration-200"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                                        placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
                                        transition-all duration-200 pr-12"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <motion.p
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-rose-500 text-xs font-medium bg-rose-50 px-3 py-2 rounded-lg"
                            >
                                {error}
                            </motion.p>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !email || !password}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0F766E] to-[#14B8A6] text-white font-semibold text-sm
                                shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30
                                disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
                                transition-all duration-300 flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <div className="flex gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Demo credentials */}
                    <div className="mt-6 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                        <div className="flex items-center gap-2 mb-1.5">
                            <ShieldCheck size={14} className="text-emerald-600" />
                            <span className="text-xs font-bold text-emerald-700">Demo Credentials</span>
                        </div>
                        <div className="text-[11px] text-emerald-600/70 leading-relaxed space-y-0.5">
                            <p>🔴 Admin: <span className="font-mono font-semibold">admin@hospital.ai</span> / <span className="font-mono font-semibold">admin123</span></p>
                            <p>🔵 Doctor: <span className="font-mono font-semibold">srinivasan-1@hospital.ai</span> / <span className="font-mono font-semibold">password123</span></p>
                            <p>🟢 Nurse: <span className="font-mono font-semibold">rekha-5@hospital.ai</span> / <span className="font-mono font-semibold">password123</span></p>
                            <p>🟡 Patient: <span className="font-mono font-semibold">ravi.kumar@patient.ai</span> / <span className="font-mono font-semibold">patient123</span></p>
                        </div>
                    </div>

                    <p className="text-center text-xs text-slate-400 mt-8">
                        © 2026 Zero Intercept · Hospital Intelligence Platform
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
