import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import { collection, query, where, updateDoc, doc, arrayUnion, onSnapshot } from 'firebase/firestore';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { hackathons } from '../data/hackathons';

import { Bell, User, Clock, CheckCircle, XCircle, MessageSquare, BellRing } from 'lucide-react';

// import { motion } from 'framer-motion';

export default function Notifications() {
    const { currentUser } = useAuth();
    const navigate = useNavigate(); // Hook must be inside component
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const hackathonAlerts = useMemo(() => {
        const today = new Date();
        return hackathons
            .map((h) => {
                const start = new Date(h.startDate);
                const daysLeft = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
                return { ...h, daysLeft };
            })
            .filter((h) => h.daysLeft >= 0 && h.daysLeft <= 30)
            .sort((a, b) => a.daysLeft - b.daysLeft);
    }, []);


    const handleMessageClick = async (notifId, senderId) => {
        try {
            // Mark as read
            await updateDoc(doc(db, "notifications", notifId), { read: true });
            // Navigate to chat
            navigate(`/chat?uid=${senderId}`);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAction = async (reqId, action, senderId) => {
        try {
            const reqRef = doc(db, "requests", reqId);
            await updateDoc(reqRef, { status: action });

            if (action === 'accepted') {
                // Add to connected_users for BOTH using Batched Writes? 
                // Using simple sequential writes for now since this is client-side.

                // 1. Add Sender to Current User's connections
                await updateDoc(doc(db, "users", currentUser.uid), {
                    connected_users: arrayUnion(senderId)
                });

                // 2. Add Current User to Sender's connections
                await updateDoc(doc(db, "users", senderId), {
                    connected_users: arrayUnion(currentUser.uid)
                });
            }

            // Remove from local state
            setRequests(prev => prev.filter(r => r.id !== reqId));

        } catch (error) {
            console.error("Action failed:", error);
            setErrorMsg("Failed to process request.");
        }
    };

    useEffect(() => {
        if (!currentUser) return;

        // 1. Listen for Requests
        const qReq = query(
            collection(db, "requests"),
            where("receiver_id", "==", currentUser.uid),
            where("status", "==", "pending")
        );

        // 2. Listen for Message Notifications
        const qNotifs = query(
            collection(db, "notifications"),
            where("to", "==", currentUser.uid),
            where("read", "==", false)
        );

        // Combine listeners
        // Note: Since these are separate collections, we need two listeners.
        // We'll maintain two separate state variables or merge them in a standardized way.

        let reqData = [];
        let notifData = [];

        const mergeAndSet = () => {
            const items = [
                ...reqData.map(d => ({ ...d, type: 'request' })),
                ...notifData.map(d => ({ ...d, type: 'message_alert' }))
            ];
            // Sort by timestamp desc
            items.sort((a, b) => {
                const tA = a.timestamp?.seconds || 0;
                const tB = b.timestamp?.seconds || 0;
                return tB - tA;
            });
            setRequests(items);
            setLoading(false);
        };

        const unsubReq = onSnapshot(qReq, (snapshot) => {
            reqData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            mergeAndSet();
        }, (error) => {
            console.error("Error watching requests:", error);
            setErrorMsg("Failed to sync requests.");
        });

        const unsubNotif = onSnapshot(qNotifs, (snapshot) => {
            notifData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            mergeAndSet();
        }, (error) => {
            console.error("Error watching notifications:", error);
        });

        return () => {
            unsubReq();
            unsubNotif();
        };
    }, [currentUser]);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 md:pl-72">
            <Navbar />

            <main className="max-w-2xl mx-auto px-6 py-12">
                <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <Bell className="text-purple-500" /> Notifications
                </h1>

                <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                    <p className="text-xs uppercase tracking-wider text-amber-300 mb-3 flex items-center gap-1">
                        <BellRing size={13} /> Nearby Hackathon Alerts
                    </p>
                    {hackathonAlerts.length === 0 ? (
                        <p className="text-sm text-slate-400">No nearby hackathons in next 30 days.</p>
                    ) : (
                        <div className="space-y-2">
                            {hackathonAlerts.map((h) => (
                                <div key={h.id} className="rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-xs text-amber-100">
                                    {h.title} - {h.daysLeft === 0 ? 'Today' : `${h.daysLeft} day${h.daysLeft > 1 ? 's' : ''} left`}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="text-center py-10 animate-pulse text-slate-500">Loading updates...</div>
                ) : errorMsg ? (
                    <div className="text-center py-12 bg-red-900/20 rounded-2xl border border-red-500/20 text-red-400">
                        {errorMsg}
                    </div>
                ) : requests.length === 0 ? (

                    <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-white/5">
                        <Bell className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-400">No new notifications.</p>
                    </div>
                ) : (
                    <div className="space-y-4">

                        {requests.map((req) => (
                            req.type === 'message_alert' ? (
                                <div
                                    key={req.id}
                                    onClick={() => handleMessageClick(req.id, req.from)}
                                    className="bg-slate-900/80 border border-white/10 rounded-xl p-5 flex items-start gap-4 cursor-pointer hover:bg-slate-800 transition-colors"
                                >
                                    <div className="p-3 bg-purple-500/10 rounded-full text-purple-400">
                                        <MessageSquare size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-medium text-base mb-1">
                                            Message from <span className="text-purple-400">{req.senderName}</span>
                                        </h3>
                                        <p className="text-sm text-slate-400 mb-2 italic">
                                            "{req.preview}..."
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Clock size={12} />
                                            {req.timestamp?.toDate().toLocaleString()}
                                        </div>
                                    </div>
                                    <button className="px-3 py-1 bg-purple-600 text-white text-xs rounded-lg">
                                        Reply
                                    </button>
                                </div>
                            ) : (
                                <div
                                    key={req.id}
                                    className="bg-slate-900/80 border border-white/10 rounded-xl p-5 flex items-start gap-4"
                                >
                                    <div className="p-3 bg-blue-500/10 rounded-full text-blue-400">
                                        <User size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-medium text-base mb-1">
                                            <span className="text-blue-400">{req.sender_name}</span> wants to connect with you.
                                        </h3>
                                        <p className="text-sm text-slate-400 mb-2">
                                            They found your profile via search and would like to collaborate.
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Clock size={12} />
                                            {req.timestamp?.toDate().toLocaleString()}
                                        </div>
                                    </div>
                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleAction(req.id, 'accepted', req.sender_id)}
                                            className="p-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors"
                                            title="Accept"
                                        >
                                            <CheckCircle size={20} />
                                        </button>
                                        <button
                                            onClick={() => handleAction(req.id, 'rejected', req.sender_id)}
                                            className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                                            title="Reject"
                                        >
                                            <XCircle size={20} />
                                        </button>
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
