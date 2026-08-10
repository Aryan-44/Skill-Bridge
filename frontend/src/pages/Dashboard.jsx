import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, PlayCircle, Sparkles, User, Video, UserPlus, CheckCircle, XCircle, Search } from 'lucide-react';
import { db } from '../firebaseConfig';
import { addDoc, arrayUnion, collection, doc, getDoc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import Navbar from '../components/Navbar';
import API_URL from '../config';

export default function Dashboard() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [feedItems, setFeedItems] = useState([]);
    const [loadingFeed, setLoadingFeed] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showExpModal, setShowExpModal] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    const [connectedUserIds, setConnectedUserIds] = useState([]);
    const [pendingRequestIds, setPendingRequestIds] = useState([]);
    const [sendingRequestIds, setSendingRequestIds] = useState([]);
    const [incomingRequestsBySender, setIncomingRequestsBySender] = useState({});
    const [processingIncomingIds, setProcessingIncomingIds] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [expForm, setExpForm] = useState({ hackathon_name: '', journey: '', challenges: '', how_overcome: '', tips: '', video_url: '' });
    const [eventForm, setEventForm] = useState({ title: '', college_name: '', event_type: 'Hackathon', description: '', date: '', location: '', registration_link: '', poster_url: '', video_url: '', contact_note: '' });

    const [isProfileComplete, setIsProfileComplete] = useState(false);

    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        const loadHubData = async () => {
            if (!currentUser) return;
            try {
                const profileRef = doc(db, "users", currentUser.uid);
                const profileSnap = await getDoc(profileRef);
                if (!profileSnap.exists()) {
                    setShowOnboarding(true);
                }
                const myProfile = profileSnap.exists() ? profileSnap.data() : {};
                setIsProfileComplete(!!myProfile?.role || !!myProfile?.skills);
                const myConnections = myProfile?.connected_users || [];
                setConnectedUserIds(myConnections);

                const [expRes, eventRes] = await Promise.all([
                    axios.get(`${API_URL}/community/experiences`),
                    axios.get(`${API_URL}/community/events`)
                ]);

                const experiences = (expRes.data || []).map((item) => ({
                    ...item,
                    itemType: "experience",
                    feedTs: new Date(item.timestamp || 0).getTime()
                }));
                const events = (eventRes.data || []).map((item) => ({
                    ...item,
                    itemType: "event",
                    feedTs: new Date(item.timestamp || 0).getTime()
                }));

                const mixed = [...experiences, ...events].sort((a, b) => b.feedTs - a.feedTs);
                setFeedItems(mixed);

                const usersSnap = await getDocs(collection(db, "users"));
                const usersList = [];
                usersSnap.forEach((d) => {
                    const data = d.data();
                    usersList.push({ ...data, user_id: data.user_id || d.id });
                });
                setAllUsers(usersList);
                const reqSnap = await getDocs(collection(db, "requests"));
                const allReqs = reqSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
                const pendingOutgoing = allReqs
                    .filter((r) => r.sender_id === currentUser.uid && r.status === 'pending')
                    .map((r) => r.receiver_id);
                setPendingRequestIds(pendingOutgoing);
                const incomingMap = {};
                allReqs
                    .filter((r) => r.receiver_id === currentUser.uid && r.status === 'pending')
                    .forEach((r) => { incomingMap[r.sender_id] = r.id; });
                setIncomingRequestsBySender(incomingMap);
                const meRole = (myProfile?.role || '').toLowerCase();
                const meSkills = Array.isArray(myProfile?.skills) ? myProfile.skills.join(' ').toLowerCase() : (myProfile?.skills || '').toLowerCase();

                const inferTrack = (text) => {
                    if (/frontend|react|ui|ux|html|css/.test(text)) return 'frontend';
                    if (/backend|node|api|java|spring|django|flask|database/.test(text)) return 'backend';
                    if (/test|qa|automation|selenium/.test(text)) return 'tester';
                    if (/ml|ai|data|python|analytics/.test(text)) return 'ml';
                    return 'general';
                };
                const myTrack = inferTrack(`${meRole} ${meSkills}`);
                const complements = {
                    frontend: ['backend', 'tester', 'ml'],
                    backend: ['frontend', 'tester', 'ml'],
                    tester: ['frontend', 'backend'],
                    ml: ['frontend', 'backend'],
                    general: ['frontend', 'backend', 'tester', 'ml']
                };
                const desired = complements[myTrack] || complements.general;

                const suggestions = usersList
                    .filter((u) => u.user_id && u.user_id !== currentUser.uid)
                    .map((u) => {
                        const role = (u.role || '').toLowerCase();
                        const skills = Array.isArray(u.skills) ? u.skills.join(' ').toLowerCase() : (u.skills || '').toLowerCase();
                        const track = inferTrack(`${role} ${skills}`);
                        const score = desired.includes(track) ? 2 : 0;
                        return { ...u, _track: track, _score: score };
                    })
                    .sort((a, b) => b._score - a._score)
                    .slice(0, 5);
                setSuggestedUsers(suggestions);
            } catch (err) {
                console.error("Failed loading dashboard feed", err);
            } finally {
                setLoadingFeed(false);
            }
        };
        loadHubData();
    }, [currentUser]);

    const refreshFeed = async () => {
        try {
            const [expRes, eventRes] = await Promise.all([
                axios.get(`${API_URL}/community/experiences`),
                axios.get(`${API_URL}/community/events`)
            ]);
            const experiences = (expRes.data || []).map((item) => ({ ...item, itemType: "experience", feedTs: new Date(item.timestamp || 0).getTime() }));
            const events = (eventRes.data || []).map((item) => ({ ...item, itemType: "event", feedTs: new Date(item.timestamp || 0).getTime() }));
            setFeedItems([...experiences, ...events].sort((a, b) => b.feedTs - a.feedTs));
        } catch (err) {
            console.error("Failed to refresh feed:", err);
        }
    };

    const handleIncomingAction = async (senderId, action) => {
        const reqId = incomingRequestsBySender[senderId];
        if (!reqId || !currentUser?.uid) return;
        setProcessingIncomingIds((prev) => [...prev, senderId]);
        try {
            await updateDoc(doc(db, "requests", reqId), { status: action });
            if (action === 'accepted') {
                await updateDoc(doc(db, "users", currentUser.uid), {
                    connected_users: arrayUnion(senderId)
                });
                await updateDoc(doc(db, "users", senderId), {
                    connected_users: arrayUnion(currentUser.uid)
                });
                setConnectedUserIds((prev) => [...new Set([...prev, senderId])]);
            }
            setIncomingRequestsBySender((prev) => {
                const next = { ...prev };
                delete next[senderId];
                return next;
            });
        } catch (err) {
            console.error("Failed processing incoming request", err);
        } finally {
            setProcessingIncomingIds((prev) => prev.filter((id) => id !== senderId));
        }
    };

    const handleConnectSuggestion = async (targetUser) => {
        if (!currentUser?.uid || !targetUser?.user_id) return;
        if (connectedUserIds.includes(targetUser.user_id) || pendingRequestIds.includes(targetUser.user_id)) return;
        setSendingRequestIds((prev) => [...prev, targetUser.user_id]);
        try {
            await addDoc(collection(db, "requests"), {
                sender_id: currentUser.uid,
                sender_name: currentUser.displayName,
                receiver_id: targetUser.user_id,
                receiver_name: targetUser.name || "User",
                status: 'pending',
                timestamp: serverTimestamp()
            });
            setPendingRequestIds((prev) => [...prev, targetUser.user_id]);
        } catch (err) {
            console.error("Failed sending request", err);
        } finally {
            setSendingRequestIds((prev) => prev.filter((id) => id !== targetUser.user_id));
        }
    };

    const handlePostExperience = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...expForm,
                user_id: currentUser?.uid || 'anonymous',
                user_name: currentUser?.displayName || 'Anonymous'
            };
            await axios.post(`${API_URL}/community/experiences`, payload);
            setShowExpModal(false);
            setExpForm({ hackathon_name: '', journey: '', challenges: '', how_overcome: '', tips: '', video_url: '' });
            await refreshFeed();
        } catch (err) {
            console.error("Failed to post experience", err);
        }
    };

    const handlePostEvent = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...eventForm,
                user_id: currentUser?.uid || 'anonymous',
                user_name: currentUser?.displayName || 'Anonymous'
            };
            await axios.post(`${API_URL}/community/events`, payload);
            setShowEventModal(false);
            setEventForm({ title: '', college_name: '', event_type: 'Hackathon', description: '', date: '', location: '', registration_link: '', poster_url: '', video_url: '', contact_note: '' });
            await refreshFeed();
        } catch (err) {
            console.error("Failed to post hackathon", err);
        }
    };

    const cosineSimilarity = (vecA, vecB) => {
        if (!vecA || !vecB || vecA.length === 0 || vecA.length !== vecB.length) return 0;
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            setHasSearched(false);
            return;
        }
        setIsSearching(true);
        setHasSearched(true);
        try {
            const res = await axios.post(`${API_URL}/vectorize`, { query_text: searchQuery });
            const queryVec = res.data.embedding;
            if (!queryVec || queryVec.length === 0) {
                setSearchResults([]);
            } else {
                const scored = allUsers
                    .filter(u => u.user_id !== currentUser?.uid && u.embedding && u.embedding.length > 0)
                    .map(u => ({
                        ...u,
                        _score: cosineSimilarity(queryVec, u.embedding)
                    }))
                    .sort((a, b) => b._score - a._score)
                    .filter(u => u._score > 0.1)
                    .slice(0, 8);
                setSearchResults(scored);
            }
        } catch (err) {
            console.error("Search failed", err);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 md:pl-72">
            <Navbar />

            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Search Bar Section */}
                <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                    <form onSubmit={handleSearch} className="relative w-full group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={20} />
                        <input 
                            type="text" 
                            placeholder="Search teammates by skills, role, or keywords (e.g. 'React developer')..." 
                            value={searchQuery}
                            onChange={(e) => {setSearchQuery(e.target.value); if(e.target.value === '') { setHasSearched(false); setSearchResults([]); }}}
                            className="w-full bg-slate-950/80 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all backdrop-blur-md shadow-inner"
                        />
                        {isSearching && <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-cyan-500">⏳</div>}
                    </form>
                </section>

                {/* Empty Search Results */}
                {hasSearched && !isSearching && searchResults.length === 0 && (
                    <section className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="text-center py-8 border border-white/10 rounded-2xl bg-slate-900/40">
                            <Search className="mx-auto mb-3 text-slate-500" size={24} />
                            <p className="text-sm text-slate-400">No teammates found for "{searchQuery}". Try different keywords.</p>
                            <button onClick={() => {setSearchQuery(''); setHasSearched(false);}} className="text-xs text-blue-400 mt-2 hover:underline">Clear Search</button>
                        </div>
                    </section>
                )}

                {/* Search Results */}
                {searchResults.length > 0 && (
                    <section className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Sparkles className="text-cyan-400" size={18} /> Semantic Matches
                            </h2>
                            <button onClick={() => {setSearchResults([]); setSearchQuery(''); setHasSearched(false);}} className="text-xs text-slate-500 hover:text-white">Clear Results</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {searchResults.map((u) => (
                                <div key={u.user_id} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 flex flex-col gap-3 hover:border-cyan-500/30 transition-all">
                                    <div>
                                        <p className="text-sm text-white font-semibold">{u.name || 'Student'}</p>
                                        <p className="text-xs text-slate-400 line-clamp-1">{u.role || 'Hackathon enthusiast'}</p>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {u.skills?.slice(0, 3).map(s => (
                                                <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5">{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-auto">
                                        <button onClick={() => navigate(`/profile/${u.user_id}`)} className="flex-1 text-xs px-2.5 py-1.5 rounded border border-white/20 text-slate-200 hover:bg-white/10 transition-colors">View</button>
                                        {!connectedUserIds.includes(u.user_id) && !pendingRequestIds.includes(u.user_id) && (
                                            <button 
                                                onClick={() => handleConnectSuggestion(u)} 
                                                disabled={sendingRequestIds.includes(u.user_id)}
                                                className="flex-1 text-xs px-2.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors"
                                            >
                                                {sendingRequestIds.includes(u.user_id) ? '...' : 'Connect'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <section className="mb-8 rounded-2xl border border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 p-6">
                    <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-end">
                        <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 mb-2">Community Hub</p>
                            <h1 className="text-2xl md:text-3xl font-semibold text-white">Campus Posts, Experiences, and Hackathon Updates</h1>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowExpModal(true)}
                                className="w-fit rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm text-white font-medium"
                            >
                                Post Experience
                            </button>
                            <button
                                onClick={() => setShowEventModal(true)}
                                className="w-fit rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm text-white font-medium"
                            >
                                Post Hackathon
                            </button>
                        </div>
                    </div>
                </section>

                {/* Always Visible Suggestions */}
                <section className="mb-8 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                    <p className="text-xs uppercase tracking-wider text-blue-300 mb-3 flex items-center gap-1">
                        <UserPlus size={13} /> Recommended for You
                    </p>
                    {!isProfileComplete ? (
                        <p className="text-xs text-slate-400">Complete your profile to get teammate suggestions.</p>
                    ) : suggestedUsers.length === 0 ? (
                        <p className="text-xs text-slate-400">No teammate suggestions available yet.</p>
                    ) : (
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
                            {suggestedUsers.map((u) => (
                                <div key={u.user_id} className="min-w-[260px] rounded-xl bg-black/20 border border-white/10 p-3 flex flex-col gap-3">
                                    <div>
                                        <p className="text-sm text-white">{u.name || 'Student'}</p>
                                        <p className="text-[11px] text-slate-400">{u.role || 'Hackathon enthusiast'}</p>
                                        <p className="text-[10px] text-cyan-300/80 uppercase tracking-wider mt-1">{u._track || 'general'} match</p>
                                    </div>
                                    <div className="flex gap-1.5 flex-wrap">
                                        <button
                                            onClick={() => navigate(`/profile/${u.user_id}`)}
                                            className="text-xs px-2.5 py-1.5 rounded border border-white/20 text-slate-200 hover:bg-white/10"
                                        >
                                            View
                                        </button>
                                        {incomingRequestsBySender[u.user_id] ? (
                                            <>
                                                <button
                                                    onClick={() => handleIncomingAction(u.user_id, 'accepted')}
                                                    disabled={processingIncomingIds.includes(u.user_id)}
                                                    className="text-xs px-2.5 py-1.5 rounded bg-green-600 hover:bg-green-700 text-white disabled:opacity-60 flex items-center gap-1"
                                                >
                                                    <CheckCircle size={12} /> Accept
                                                </button>
                                            </>
                                        ) : connectedUserIds.includes(u.user_id) ? (
                                            <span className="text-xs px-2.5 py-1.5 rounded bg-green-600/20 text-green-300 border border-green-500/30">Connected</span>
                                        ) : pendingRequestIds.includes(u.user_id) ? (
                                            <span className="text-xs px-2.5 py-1.5 rounded bg-yellow-600/20 text-yellow-300 border border-yellow-500/30">Requested</span>
                                        ) : (
                                            <button
                                                onClick={() => handleConnectSuggestion(u)}
                                                disabled={sendingRequestIds.includes(u.user_id)}
                                                className="text-xs px-2.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                                            >
                                                {sendingRequestIds.includes(u.user_id) ? '...' : 'Connect'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {loadingFeed ? (
                    <div className="text-center py-10 text-slate-400">Loading feed...</div>
                ) : (
                    <div className="space-y-5">
                        {feedItems.length === 0 && (
                            <div className="text-center py-16 border border-white/10 rounded-2xl bg-slate-900/40">
                                <Sparkles className="mx-auto mb-3 text-purple-400/60" />
                                <p className="text-sm text-slate-400">No posts yet. Share your first experience or college hackathon update.</p>
                            </div>
                        )}

                        {feedItems.map((item) => (
                            <React.Fragment key={`${item.itemType}-${item.id}`}>

                                <motion.article
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-5"
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <div>
                                            <p className="text-sm text-white font-semibold">{item.user_name || "Anonymous"}</p>
                                            <p className="text-xs text-slate-500">{item.itemType === "experience" ? "Experience Post" : "College Hackathon Post"}</p>
                                        </div>
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <Calendar size={12} /> {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : "Recent"}
                                        </span>
                                    </div>

                                {item.itemType === "experience" ? (
                                    <>
                                        <h3 className="text-white text-lg font-semibold mb-2">{item.hackathon_name}</h3>
                                        <p className="text-sm text-slate-300 mb-3">{item.journey}</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                            <div className="rounded-lg bg-black/20 border border-white/10 p-3">
                                                <p className="text-amber-300 font-semibold mb-1">Issues Faced</p>
                                                <p className="text-slate-300">{item.challenges}</p>
                                            </div>
                                            <div className="rounded-lg bg-black/20 border border-white/10 p-3">
                                                <p className="text-emerald-300 font-semibold mb-1">How They Overcame</p>
                                                <p className="text-slate-300">{item.how_overcome}</p>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="text-white text-lg font-semibold mb-2">{item.title}</h3>
                                        <p className="text-sm text-slate-300 mb-3">{item.description}</p>
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            {item.college_name && <span className="px-2 py-1 rounded bg-white/10">{item.college_name}</span>}
                                            {item.event_type && <span className="px-2 py-1 rounded bg-white/10">{item.event_type}</span>}
                                            {item.location && <span className="px-2 py-1 rounded bg-white/10">{item.location}</span>}
                                        </div>
                                    </>
                                )}

                                {(item.video_url || item.poster_url) && (
                                    <div className="mt-4">
                                        {item.video_url ? (
                                            <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
                                                <video controls className="w-full max-h-[360px]" src={item.video_url} />
                                            </div>
                                        ) : (
                                            <img src={item.poster_url} alt="post-media" className="rounded-xl border border-white/10 w-full max-h-[360px] object-cover" />
                                        )}
                                    </div>
                                )}

                                    <div className="mt-4 flex justify-end gap-2">
                                        <button
                                            onClick={() => navigate('/hackathons')}
                                            className="text-xs px-3 py-1.5 rounded border border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                                        >
                                            View in Hub
                                        </button>
                                        {item.user_id && (
                                            <button
                                                onClick={() => navigate(`/profile/${item.user_id}`)}
                                                className="text-xs px-3 py-1.5 rounded border border-white/20 text-slate-200 hover:bg-white/10 flex items-center gap-1"
                                            >
                                                <User size={12} /> Profile
                                            </button>
                                        )}
                                        {item.video_url && (
                                            <span className="text-xs px-3 py-1.5 rounded border border-purple-500/30 text-purple-300 flex items-center gap-1">
                                                <PlayCircle size={12} /> Video
                                            </span>
                                        )}
                                        {!item.video_url && item.poster_url && (
                                            <span className="text-xs px-3 py-1.5 rounded border border-purple-500/30 text-purple-300 flex items-center gap-1">
                                                <Video size={12} /> Media
                                            </span>
                                        )}
                                    </div>
                                </motion.article>
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </main>

            <AnimatePresence>
                {showOnboarding && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 15 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 15 }}
                            className="w-full max-w-lg rounded-2xl border border-white/15 bg-slate-900 p-6"
                        >
                            <h2 className="text-xl font-bold text-white mb-2">Complete Profile Setup</h2>
                            <p className="text-sm text-slate-400 mb-5">
                                Upload your resume or add details manually once. After this, the app will open directly to the Hackathon Hub feed.
                            </p>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setShowOnboarding(false)}
                                    className="px-4 py-2 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-white"
                                >
                                    Later
                                </button>
                                <button
                                    onClick={() => navigate('/profile')}
                                    className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    Setup Now
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showExpModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-slate-900/95 border border-white/15 p-6 rounded-2xl w-full max-w-lg">
                            <h3 className="text-xl font-bold text-white mb-1">Post Experience</h3>
                            <p className="text-sm text-slate-500 mb-5">Share your hackathon journey, issues, and solutions.</p>
                            <form onSubmit={handlePostExperience} className="space-y-3">
                                <input type="text" placeholder="Hackathon Name" value={expForm.hackathon_name} onChange={(e) => setExpForm({ ...expForm, hackathon_name: e.target.value })} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-sm" />
                                <textarea placeholder="Your journey" value={expForm.journey} onChange={(e) => setExpForm({ ...expForm, journey: e.target.value })} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-sm h-20" />
                                <textarea placeholder="Issues you faced" value={expForm.challenges} onChange={(e) => setExpForm({ ...expForm, challenges: e.target.value })} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-sm h-16" />
                                <textarea placeholder="How you overcame them" value={expForm.how_overcome} onChange={(e) => setExpForm({ ...expForm, how_overcome: e.target.value })} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-sm h-16" />
                                <input type="url" placeholder="Video URL (optional)" value={expForm.video_url} onChange={(e) => setExpForm({ ...expForm, video_url: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-sm" />
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => setShowExpModal(false)} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm">Post Experience</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showEventModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-slate-900/95 border border-white/15 p-6 rounded-2xl w-full max-w-lg">
                            <h3 className="text-xl font-bold text-white mb-1">Post Hackathon</h3>
                            <p className="text-sm text-slate-500 mb-5">Post a college hackathon so interested students can participate.</p>
                            <form onSubmit={handlePostEvent} className="space-y-3">
                                <input type="text" placeholder="Hackathon Title" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-sm" />
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="text" placeholder="College Name" value={eventForm.college_name} onChange={(e) => setEventForm({ ...eventForm, college_name: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-sm" />
                                    <input type="text" placeholder="Location" value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-sm" />
                                </div>
                                <textarea placeholder="Description" value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-sm h-20" />
                                <input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-sm" />
                                <input type="url" placeholder="Registration Link (optional)" value={eventForm.registration_link} onChange={(e) => setEventForm({ ...eventForm, registration_link: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-sm" />
                                <input type="url" placeholder="Poster URL (optional)" value={eventForm.poster_url} onChange={(e) => setEventForm({ ...eventForm, poster_url: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-sm" />
                                <input type="url" placeholder="Video URL (optional)" value={eventForm.video_url} onChange={(e) => setEventForm({ ...eventForm, video_url: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-sm" />
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => setShowEventModal(false)} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Post Hackathon</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
