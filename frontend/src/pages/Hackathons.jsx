import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { hackathons } from '../data/hackathons';
import { Calendar, ExternalLink, Users, Tag, BellRing } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function Hackathons() {
    const navigate = useNavigate();
    const [filter, setFilter] = useState('All');
    const [selectedYear, setSelectedYear] = useState('All Years');

    const availableYears = [...new Set(hackathons.map(h => new Date(h.startDate).getFullYear()))].sort((a, b) => b - a);
    const filteredHackathons = hackathons.filter((h) => {
        const statusMatch = filter === 'All' || h.status === filter;
        const yearMatch = selectedYear === 'All Years' || new Date(h.startDate).getFullYear() === Number(selectedYear);
        return statusMatch && yearMatch;
    });
    const today = new Date();
    const upcomingAlerts = hackathons
        .map((h) => {
            const start = new Date(h.startDate);
            const daysLeft = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
            return { ...h, daysLeft };
        })
        .filter((h) => h.daysLeft >= 0 && h.daysLeft <= 30)
        .sort((a, b) => a.daysLeft - b.daysLeft);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 md:pl-72">
            <Navbar />
            <main className="max-w-7xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="text-center mb-16 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                        Hackathon Connect Hub
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Find teammates when your team is short and explore hackathons by year with smart upcoming-date alerts.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                        <p className="text-xs uppercase tracking-wider text-cyan-300">Main Goal</p>
                        <p className="text-white font-semibold mt-1">Find Teammates Fast</p>
                        <p className="text-xs text-slate-400 mt-1">Connect with students by skills when your hackathon team needs members.</p>
                    </div>
                    <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
                        <p className="text-xs uppercase tracking-wider text-violet-300">Discover</p>
                        <p className="text-white font-semibold mt-1">Year-wise Hackathons</p>
                        <p className="text-xs text-slate-400 mt-1">Filter and explore all hackathons happening in a particular year.</p>
                    </div>
                </div>

                <>
                        {upcomingAlerts.length > 0 && (
                            <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                                <p className="text-xs uppercase tracking-wider text-amber-300 mb-2 flex items-center gap-1">
                                    <BellRing size={14} /> Upcoming Alerts
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {upcomingAlerts.map((h) => (
                                        <span key={h.id} className="text-xs px-3 py-1.5 rounded-lg bg-black/20 border border-white/10 text-amber-100">
                                            {h.title} - {h.daysLeft === 0 ? 'Today' : `${h.daysLeft} day${h.daysLeft > 1 ? 's' : ''} left`}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between items-center gap-4 mb-5 flex-wrap">
                            <div className="flex items-center gap-2 bg-slate-900 border border-white/10 rounded-xl px-3 py-2">
                                <Calendar size={15} className="text-blue-400" />
                                <span className="text-xs text-slate-400">Year:</span>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="bg-transparent text-sm text-white outline-none"
                                >
                                    <option className="bg-slate-900">All Years</option>
                                    {availableYears.map((year) => (
                                        <option key={year} value={year} className="bg-slate-900">
                                            {year}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="text-xs text-slate-400">
                                Showing <span className="text-white font-semibold">{filteredHackathons.length}</span> hackathons
                            </div>
                        </div>
                        <div className="flex justify-center gap-4 mb-12">
                            {["All", "Open", "Upcoming", "Closed"].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilter(status)}
                                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${filter === status ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-900 border border-white/10 hover:border-white/20'}`}
                                >
                                    {status === "All" ? "All" : status}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredHackathons.map((hackathon) => (
                                <motion.div
                                    key={hackathon.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all group flex flex-col"
                                >
                                    <div className="h-48 overflow-hidden relative">
                                        <img src={hackathon.image} alt={hackathon.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute top-3 right-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-xs font-bold text-white border border-white/10">
                                            {hackathon.status}
                                        </div>
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{hackathon.title}</h3>
                                            <p className="text-sm text-slate-400 mb-4 line-clamp-2">{hackathon.description}</p>
                                            <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                                                <div className="flex items-center gap-1"><Calendar size={14} />{new Date(hackathon.startDate).toLocaleDateString()}</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {hackathon.tags.slice(0, 2).map(tag => (
                                                        <span key={tag} className="px-2 py-0.5 bg-white/5 rounded border border-white/5">{tag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/5">
                                            <a href={hackathon.registrationLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                                                Register <ExternalLink size={14} />
                                            </a>
                                            <button onClick={() => navigate('/dashboard')} className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm font-medium transition-colors">
                                                Find Teammates <Users size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                        {filteredHackathons.length === 0 && (
                            <div className="text-center py-20 text-slate-500">
                                <Tag className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p className="text-sm">No hackathons found for selected filters.</p>
                            </div>
                        )}
                </>
            </main>
        </div>
    );
}
