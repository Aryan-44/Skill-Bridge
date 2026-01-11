import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Search, FileText, CheckCircle, Cpu, User, Bot } from 'lucide-react';
import { db } from '../firebaseConfig';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import Navbar from '../components/Navbar';
import API_URL from '../config';

export default function Dashboard() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // State for Upload Logic
    const [entryMode, setEntryMode] = useState('upload'); // 'upload' | 'manual'
    const [file, setFile] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [profileData, setProfileData] = useState(null);
    const [embedding, setEmbedding] = useState(null); // Store embedding for saving
    const [uploadStatus, setUploadStatus] = useState("idle"); // idle, success, error

    // Manual Data State
    const [manualData, setManualData] = useState({
        role: "",
        skills: "",
        summary: ""
    });

    // State for Search Logic
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // --- Handlers ---

    // Helper for Client-Side Search
    const cosineSimilarity = (vecA, vecB) => {
        if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
        const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
        if (magnitudeA === 0 || magnitudeB === 0) return 0;
        return dotProduct / (magnitudeA * magnitudeB);
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setProfileData(null);
        setUploadStatus("idle");
    };

    const handleAnalyze = async () => {
        if (!file) return;
        setAnalyzing(true);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await axios.post(`${API_URL}/analyze`, formData);
            setProfileData(res.data.data);
            setEmbedding(res.data.embedding);
            setAnalyzing(false);
        } catch (err) {
            console.error(err);
            setAnalyzing(false);
            setUploadStatus("error");
        }
    };

    const handleSaveProfile = async () => {
        if (!profileData || !currentUser) return;
        try {
            // Write directly to Firestore (Client SDK)
            await setDoc(doc(db, "users", currentUser.uid), {
                user_id: currentUser.uid,
                name: currentUser.displayName,
                email: currentUser.email,
                skills: profileData.skills,
                role: profileData.role || "Student",
                summary: profileData.summary,
                complexity_score: profileData.complexity_score,
                projects: profileData.projects || [],
                education: profileData.education || [],
                location: profileData.location || "Unknown",
                embedding: embedding
            });
            setUploadStatus("success");
            alert("Profile Published!");
        } catch (err) {
            console.error("Firestore Save Error:", err);
            setUploadStatus("error");
        }
    };

    const handleManualSave = async () => {
        if (!manualData.role || !manualData.summary) {
            alert("Please fill in Role and Summary");
            return;
        }
        setAnalyzing(true);
        try {
            // 1. Get Embedding for Manual Summary + Skills (CRITICAL for search)
            const textToEmbed = `${manualData.summary} ${manualData.skills}`;
            const res = await axios.post(`${API_URL}/vectorize`, { query_text: textToEmbed, limit: 1 });
            const manualEmbedding = res.data.embedding;

            // 2. Save to Firestore
            await setDoc(doc(db, "users", currentUser.uid), {
                user_id: currentUser.uid,
                name: currentUser.displayName,
                email: currentUser.email,
                skills: manualData.skills.split(',').map(s => s.trim()),
                role: manualData.role,
                summary: manualData.summary,
                location: manualData.location || "Unknown",
                phone: manualData.phone || "",
                social_links: { linkedin: manualData.link || "" },
                complexity_score: 5, // Default for manual
                projects: [],
                education: [],
                embedding: manualEmbedding
            });
            setAnalyzing(false);
            alert("Profile Saved Successfully!");
        } catch (err) {
            console.error("Manual Save Error:", err);
            setAnalyzing(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery) return;
        setSearching(true);
        setSearchResults([]); // Clear old results

        try {
            // 1. Get Embedding for the Query
            const embedRes = await axios.post(`${API_URL}/vectorize`, { query_text: searchQuery, limit: 1 });
            const queryVector = embedRes.data.embedding;

            // 2. Fetch Users
            const querySnapshot = await getDocs(collection(db, "users"));
            const matches = [];

            // --- CONFIGURATION ---
            // Lower the threshold slightly to allow "fuzzy" AI matches to pass
            const MIN_SCORE_TO_SHOW = 0.35;

            querySnapshot.forEach((doc) => {
                const userData = doc.data();
                if (userData.user_id === currentUser?.uid) return; // Skip self

                // 3. Prepare Data for Comparison
                const q = searchQuery.toLowerCase().trim();
                const uName = (userData.name || "").toLowerCase();
                const uRole = (userData.role || "").toLowerCase();
                // Join array into a single string for easy searching: "react nodejs python"
                const uSkills = Array.isArray(userData.skills)
                    ? userData.skills.join(" ").toLowerCase()
                    : (userData.skills || "").toLowerCase();

                // 4. Calculate Base AI Score (Vector Similarity)
                let finalScore = userData.embedding
                    ? cosineSimilarity(queryVector, userData.embedding)
                    : 0;

                // 5. APPLY "WATERFALL" BOOSTING

                // CASE A: EXACT NAME MATCH (Highest Priority)
                if (uName.includes(q)) {
                    finalScore = 1.0; // Perfect match
                }
                // CASE B: SKILL OR ROLE MATCH (High Priority)
                // If the user searches "React" and the profile has "React", we FORCE the score up.
                else if (uRole.includes(q) || uSkills.includes(q)) {
                    // If the AI gave a low score (e.g., 0.2), we boost it to at least 0.8
                    // If the AI gave a high score (e.g., 0.7), we add a little bonus (+0.2)
                    finalScore = Math.max(finalScore + 0.3, 0.8);
                }

                // 6. FILTER & SAVE
                // Only show if the final score (after boosting) is good enough
                if (finalScore >= MIN_SCORE_TO_SHOW) {
                    matches.push({
                        ...userData,
                        score: finalScore > 1 ? 1 : finalScore // Cap at 1.0
                    });
                }
            });

            // 7. Sort: Highest score (1.0) goes first
            matches.sort((a, b) => b.score - a.score);

            setSearchResults(matches.slice(0, 5));

        } catch (err) {
            console.error("Search Error:", err);
        } finally {
            setSearching(false);
        }
    };
    // --- UI Components ---

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300">
            <Navbar />

            <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* LEFT PANEL: Implicit Profile Builder */}
                <section>
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <FileText className="text-purple-400" size={20} /> Build Your Profile
                    </h2>

                    <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">

                        {/* Entry Mode Toggle */}
                        <div className="flex gap-2 mb-6 bg-slate-950 p-1 rounded-lg border border-white/10 w-fit">
                            <button
                                onClick={() => setEntryMode('upload')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${entryMode === 'upload' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                Upload Resume
                            </button>
                            <button
                                onClick={() => setEntryMode('manual')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${entryMode === 'manual' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                Manual Entry
                            </button>
                        </div>

                        {entryMode === 'upload' ? (
                            <>
                                <p className="text-sm text-slate-400 mb-4">Upload a past thesis, project report, Resume/CV, or code file. Gemini will analyze your actual experience.</p>
                                <div className="flex gap-3 mb-6">
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all cursor-pointer bg-slate-950/50 rounded-lg border border-white/10"
                                    />
                                    <button
                                        onClick={handleAnalyze}
                                        disabled={!file || analyzing}
                                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {analyzing ? <span className="animate-spin">⏳</span> : <Upload size={18} />}
                                        Analyze
                                    </button>
                                </div>
                            </>
                        ) : (
                            // MANUAL ENTRY FORM
                            <div className="space-y-4 mb-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Role / Title</label>
                                        <input
                                            type="text"
                                            value={manualData.role}
                                            onChange={(e) => setManualData({ ...manualData, role: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 outline-none"
                                            placeholder="e.g. Frontend Developer"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Location</label>
                                        <input
                                            type="text"
                                            value={manualData.location || ""}
                                            onChange={(e) => setManualData({ ...manualData, location: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 outline-none"
                                            placeholder="City, Country"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Mobile Number</label>
                                        <input
                                            type="text"
                                            value={manualData.phone || ""}
                                            onChange={(e) => setManualData({ ...manualData, phone: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 outline-none"
                                            placeholder="+1 234 567 890"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase font-bold text-slate-500 mb-1">LinkedIn / Portfolio</label>
                                        <input
                                            type="text"
                                            value={manualData.link || ""}
                                            onChange={(e) => setManualData({ ...manualData, link: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 outline-none"
                                            placeholder="https://linkedin.com/in/..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Tech Stack (Comma Separated)</label>
                                    <input
                                        type="text"
                                        value={manualData.skills}
                                        onChange={(e) => setManualData({ ...manualData, skills: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 outline-none"
                                        placeholder="e.g. React, Node.js, Python"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Professional Summary</label>
                                    <textarea
                                        value={manualData.summary}
                                        onChange={(e) => setManualData({ ...manualData, summary: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 outline-none h-24"
                                        placeholder="Briefly describe your experience and what you build..."
                                    />
                                    <p className="text-[10px] text-purple-400 mt-1 flex items-center gap-1">
                                        <Bot size={10} /> Tip: Ask the AI Assistant to write this for you!
                                    </p>
                                </div>
                                <button
                                    onClick={handleManualSave}
                                    disabled={analyzing}
                                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all font-medium text-sm flex justify-center items-center gap-2"
                                >
                                    {analyzing ? "Processing..." : "Save Profile"}
                                </button>
                            </div>
                        )}

                        {analyzing && entryMode === 'upload' && (
                            <div className="py-8 text-center">
                                <div className="inline-block animate-pulse text-purple-400 font-mono text-sm">
                                    reading_semantic_depth... <br /> extracting_concepts...
                                </div>
                            </div>
                        )}

                        <AnimatePresence>
                            {/* PREVIEW IS ONLY SHOWN FOR FILE UPLOAD OR AFTER MANUAL SAVE */}
                            {profileData && entryMode === 'upload' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-slate-800/40 rounded-xl p-5 border border-white/5"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-white font-medium">Analysis Result</h3>
                                            <p className="text-xs text-purple-300 font-mono mt-1">{profileData.role}</p>
                                        </div>
                                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded border border-blue-500/30">
                                            Complexity Score: {profileData.complexity_score}/10
                                        </span>
                                    </div>

                                    <p className="text-slate-300 text-sm mb-4 leading-relaxed">{profileData.summary}</p>

                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {profileData.skills.map((skill, i) => (
                                            <span key={i} className="px-3 py-1 bg-white/5 text-xs text-slate-300 border border-white/10 rounded-full">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>

                                    {uploadStatus === 'success' ? (
                                        <div className="w-full py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-center text-sm font-medium flex justify-center gap-2">
                                            <CheckCircle size={18} /> Profile Published
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleSaveProfile}
                                            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all font-medium text-sm"
                                        >
                                            Confirm & Publish to Network
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>

                {/* RIGHT PANEL: Semantic Search */}
                <section>
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Search className="text-blue-400" size={20} /> Find a Partner
                    </h2>

                    <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm min-h-[400px]">
                        <div className="relative mb-6">
                            <input
                                type="text"
                                placeholder="Describe who you need (e.g., 'Expert in PyTorch for medical imaging')"
                                className="w-full bg-slate-950 border border-white/10 text-white px-4 py-3 pl-11 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <Search className="absolute left-3 top-3.5 text-slate-500" size={18} />
                            <button
                                onClick={handleSearch}
                                className="absolute right-2 top-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700"
                            >
                                {searching ? '...' : 'Find'}
                            </button>
                        </div>

                        <div className="space-y-3">
                            {searchResults.length === 0 && !searching && (
                                <div className="text-center text-slate-600 py-10">
                                    <User className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">Enter a query to find semantically matched students.</p>
                                </div>
                            )}

                            {searchResults.map((user) => (
                                <motion.div
                                    key={user.user_id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    onClick={() => navigate(`/profile/${user.user_id}`)}
                                    className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all group cursor-pointer"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="text-white font-medium group-hover:text-blue-400 transition-colors">{user.name}</h4>
                                            <p className="text-[10px] text-zinc-500 font-mono">{user.role}</p>
                                        </div>
                                        <span className="text-xs font-mono text-green-400 bg-green-400/10 px-2 py-0.5 rounded">
                                            {(user.score * 100).toFixed(0)}% Match
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-3 line-clamp-2">{user.summary}</p>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {user.skills.map((skill, i) => (
                                            <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-blue-400 flex items-center justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            View Profile <User size={10} />
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

            </main>
        </div>
    );
}
