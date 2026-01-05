import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { hackathons } from '../data/hackathons';
import { Calendar, ExternalLink, Users, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function Hackathons() {
    const navigate = useNavigate();
    const [filter, setFilter] = useState("All");

    const filteredHackathons = filter === "All"
        ? hackathons
        : hackathons.filter(h => h.status === filter);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300">
            <Navbar />

            <main className="max-w-7xl mx-auto px-6 py-12">

                {/* Header */}
                <div className="text-center mb-16 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                        Global Hackathon Hub
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Discover the world's most exciting coding competitions. Register today or find your dream team directly on Skill-Bridge.
                    </p>
                </div>

                {/* Filters */}
                <div className="flex justify-center gap-4 mb-12">
                    {["All", "Open", "Upcoming", "Closed"].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${filter === status
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                    : 'bg-slate-900 border border-white/10 hover:border-white/20'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredHackathons.map((hackathon) => (
                        <motion.div
                            key={hackathon.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all group flex flex-col"
                        >
                            {/* Image */}
                            <div className="h-48 overflow-hidden relative">
                                <img
                                    src={hackathon.image}
                                    alt={hackathon.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute top-3 right-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-xs font-bold text-white border border-white/10">
                                    {hackathon.status}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                                        {hackathon.title}
                                    </h3>
                                    <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                                        {hackathon.description}
                                    </p>

                                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                                        <div className="flex items-center gap-1">
                                            <Calendar size={14} />
                                            {new Date(hackathon.startDate).toLocaleDateString()}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {hackathon.tags.slice(0, 2).map(tag => (
                                                <span key={tag} className="px-2 py-0.5 bg-white/5 rounded border border-white/5">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/5">
                                    <a
                                        href={hackathon.registrationLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Register <ExternalLink size={14} />
                                    </a>
                                    <button
                                        onClick={() => navigate('/dashboard')}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Find Team <Users size={14} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {filteredHackathons.length === 0 && (
                    <div className="text-center py-20 text-slate-500">
                        <Tag className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No hackathons found for this category.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
