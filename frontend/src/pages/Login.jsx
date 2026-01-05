import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrainCircuit, ArrowRight } from 'lucide-react';

export default function Login() {
    const { login, loginWithEmail, signupWithEmail } = useAuth();
    const navigate = useNavigate();

    // UI State
    const [isSignup, setIsSignup] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Form Data
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");

    const handleGoogleLogin = async () => {
        try {
            setError("");
            await login();
            navigate('/dashboard');
        } catch (err) {
            setError("Google Login Failed");
            console.error(err);
        }
    };

    const handleEmailAuth = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (isSignup) {
                if (!name) throw new Error("Name is required");
                await signupWithEmail(email, password, name);
            } else {
                await loginWithEmail(email, password);
            }
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            setError(err.message.replace("Firebase: ", ""));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950">
            {/* Background Glow */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 max-w-md w-full mx-4"
            >
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 mb-4">
                            <BrainCircuit className="w-8 h-8 text-blue-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Skill-Bridge</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            {isSignup ? "Create your account to get started" : "Welcome back, developer"}
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        {isSignup && (
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1 ml-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 ml-1">Email Address</label>
                            <input
                                type="email"
                                required
                                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
                                placeholder="name@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 ml-1">Password</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? "Processing..." : (isSignup ? "Create Account" : "Sign In")}
                            {!loading && <ArrowRight className="w-4 h-4" />}
                        </button>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-2 text-slate-500">Or continue with</span></div>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-bold py-2.5 px-4 rounded-lg hover:bg-slate-100 transition-all transform active:scale-95"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                        Google
                    </button>

                    <div className="mt-6 text-center text-sm text-slate-400">
                        {isSignup ? "Already have an account?" : "Don't have an account?"}
                        <button
                            onClick={() => setIsSignup(!isSignup)}
                            className="text-blue-400 hover:text-blue-300 font-medium ml-1 transition-colors"
                        >
                            {isSignup ? "Log In" : "Sign Up"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
