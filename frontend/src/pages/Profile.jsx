import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { User, Mail, Award, Zap, BookOpen, Briefcase, MapPin, GraduationCap, UserPlus, MessageSquare } from 'lucide-react';
import axios from 'axios';



export default function Profile() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const { uid } = useParams();

    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [requestStatus, setRequestStatus] = useState('idle'); // idle, sending, sent, error

    const handleConnect = async () => {
        if (!currentUser || !userData) return;
        setRequestStatus('sending');

        try {
            // 1. Create Request in Firestore
            await addDoc(collection(db, "requests"), {
                sender_id: currentUser.uid,
                sender_name: currentUser.displayName,
                receiver_id: uid, // Target User ID
                receiver_name: userData.name,
                status: 'pending',
                timestamp: serverTimestamp()
            });

            // 2. Trigger Backup Email Notification via Backend
            try {
                await axios.post('http://localhost:8000/send-email', {
                    to_email: userData.email,
                    subject: `Skill-Bridge: ${currentUser.displayName} wants to connect!`,
                    body: `Hi ${userData.name},\n\n${currentUser.displayName} found your profile on Skill-Bridge and sent you a connection request.\n\nCheck your notifications in the app.`
                });
            } catch (emailErr) {
                console.warn("Email sending failed (backend might be down or mocking):", emailErr);
            }

            setRequestStatus('sent');
        } catch (error) {
            console.error("Connection Request Failed:", error);
            setRequestStatus('error');
        }
    };


    useEffect(() => {
        const fetchUserData = async () => {
            const targetUid = uid || currentUser?.uid;

            if (targetUid) {
                try {
                    const docRef = doc(db, "users", targetUid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        setUserData(docSnap.data());
                    } else {
                        console.log("No such document!");
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [currentUser, uid]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-300 flex justify-center items-center">
                <div className="animate-spin text-purple-500">⏳ Loading Profile...</div>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-300">
                <Navbar />
                <div className="max-w-4xl mx-auto px-6 py-12 text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Profile Not Found</h2>
                    <p className="text-slate-400">This user has not set up their profile yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300">
            <Navbar />

            <main className="max-w-4xl mx-auto px-6 py-12">
                <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8 border-b border-white/5 pb-8">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                            {userData.name ? userData.name.charAt(0).toUpperCase() : <User />}
                        </div>
                        <div className="text-center md:text-left flex-1">
                            <h1 className="text-3xl font-bold text-white mb-2">{userData.name}</h1>
                            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-slate-400">
                                <span className="flex items-center gap-1 text-sm"><Mail size={16} /> {userData.email}</span>
                                {userData.location && userData.location !== "Unknown" && (
                                    <span className="flex items-center gap-1 text-sm"><MapPin size={16} /> {userData.location}</span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-3">
                            <div className="flex flex-col items-center gap-1">
                                <div className="text-xs text-slate-400 uppercase tracking-wider">Complexity Score</div>
                                <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                                    {userData.complexity_score} <span className="text-sm text-slate-500 font-normal">/ 10</span>
                                </div>
                            </div>

                            {/* Connect / Message Button */}
                            {uid && uid !== currentUser.uid && (
                                <>
                                    {userData.connected_users?.includes(currentUser.uid) ? (
                                        <button
                                            onClick={() => navigate(`/chat?uid=${uid}`)}
                                            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20"
                                        >
                                            <MessageSquare size={16} /> Message
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleConnect}
                                            disabled={requestStatus === 'sent' || requestStatus === 'sending'}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${requestStatus === 'sent'
                                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
                                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
                                                }`}
                                        >
                                            {requestStatus === 'sending' ? (
                                                <>Sending...</>
                                            ) : requestStatus === 'sent' ? (
                                                <>Request Sent</>
                                            ) : (
                                                <><UserPlus size={16} /> Connect</>
                                            )}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                        {/* Left Column: Skills & Education */}
                        <div className="md:col-span-1 space-y-6">
                            {/* Skills */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                    <Zap className="text-yellow-400" size={20} /> Skills
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {userData.skills?.map((skill, index) => (
                                        <span key={index} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-200 rounded-lg border border-white/10 text-xs transition-colors cursor-default">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Education */}
                            {userData.education && userData.education.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                        <GraduationCap className="text-blue-400" size={20} /> Education
                                    </h3>
                                    <div className="space-y-3">
                                        {userData.education.map((edu, index) => (
                                            <div key={index} className="bg-white/5 p-3 rounded-lg border border-white/5">
                                                <p className="text-white font-medium text-sm">{edu.institution}</p>
                                                <p className="text-slate-400 text-xs">{edu.degree}</p>
                                                <p className="text-slate-500 text-xs mt-1">{edu.year}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Summary & Projects */}
                        <div className="md:col-span-2 space-y-8">
                            {/* Summary */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                    <BookOpen className="text-purple-400" size={20} /> Professional Summary
                                </h3>
                                <p className="text-slate-300 leading-relaxed bg-black/20 p-5 rounded-xl border border-white/5 text-sm">
                                    {userData.summary}
                                </p>
                            </div>

                            {/* Projects */}
                            {userData.projects && userData.projects.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                        <Briefcase className="text-green-400" size={20} /> Key Projects
                                    </h3>
                                    <div className="space-y-4">
                                        {userData.projects.map((project, index) => (
                                            <div key={index} className="bg-slate-800/40 p-5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                                <h4 className="text-white font-medium mb-2">{project.title}</h4>
                                                <p className="text-slate-400 text-sm mb-3 leading-relaxed">{project.description}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {project.tech_stack?.map((tech, i) => (
                                                        <span key={i} className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded border border-blue-500/20">
                                                            {tech}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
