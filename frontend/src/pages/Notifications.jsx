import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import Navbar from '../components/Navbar';

import { Bell, User, Clock, CheckCircle, XCircle } from 'lucide-react';

import { motion } from 'framer-motion';

export default function Notifications() {
    const { currentUser } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);


    const handleAction = async (reqId, action, senderId, senderName) => {
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
        const fetchRequests = async () => {
            if (!currentUser) return;
            try {
                const q = query(
                    collection(db, "requests"),
                    where("receiver_id", "==", currentUser.uid),
                    where("status", "==", "pending") // Only show pending
                );

                const querySnapshot = await getDocs(q);

                const reqs = [];
                querySnapshot.forEach((doc) => {
                    reqs.push({ id: doc.id, ...doc.data() });
                });

                // Client-side Sort (to avoid Indexing requirements)
                reqs.sort((a, b) => b.timestamp - a.timestamp);

                setRequests(reqs);
            } catch (error) {
                console.error("Error fetching notifications:", error);
                setErrorMsg("Failed to load notifications. Please try again.");

            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, [currentUser]);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300">
            <Navbar />

            <main className="max-w-2xl mx-auto px-6 py-12">
                <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <Bell className="text-purple-500" /> Notifications
                </h1>

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
                            <motion.div
                                key={req.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
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
                                        onClick={() => handleAction(req.id, 'accepted', req.sender_id, req.sender_name)}
                                        className="p-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors"
                                        title="Accept"
                                    >
                                        <CheckCircle size={20} />
                                    </button>
                                    <button
                                        onClick={() => handleAction(req.id, 'rejected', req.sender_id, req.sender_name)}
                                        className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                                        title="Reject"
                                    >
                                        <XCircle size={20} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
