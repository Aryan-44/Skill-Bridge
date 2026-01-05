import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Send, User, MessageSquare, Users, Plus, X, Video } from 'lucide-react';

export default function Chat() {
    const { currentUser } = useAuth();
    const [searchParams] = useSearchParams();
    const activeUid = searchParams.get('uid'); // chat?uid=xyz

    // Data State
    const [connections, setConnections] = useState([]);
    const [groups, setGroups] = useState([]);
    const [activeChat, setActiveChat] = useState(null); // Can be User Object OR Group Object
    const [messages, setMessages] = useState([]);

    // UI State
    const [newMessage, setNewMessage] = useState("");
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [selectedForGroup, setSelectedForGroup] = useState([]);

    // Group Members State
    const [groupMembers, setGroupMembers] = useState([]);
    const [showMembersModal, setShowMembersModal] = useState(false);

    const messagesEndRef = useRef(null);

    // 1. Fetch Connections & Groups
    useEffect(() => {
        if (!currentUser) return;

        // Fetch Connections
        const fetchConnections = async () => {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            const connectedIds = userDoc.data()?.connected_users || [];
            if (connectedIds.length === 0) return;

            const connData = [];
            for (const id of connectedIds) {
                const friendSnap = await getDoc(doc(db, "users", id));
                if (friendSnap.exists()) {
                    connData.push(friendSnap.data());
                }
            }
            setConnections(connData);

            // Handle URL param for direct messaging
            if (activeUid) {
                const friend = connData.find(u => u.user_id === activeUid);
                if (friend) setActiveChat({ type: 'direct', data: friend });
            }
        };

        // Fetch Groups
        const fetchGroups = () => {
            const q = query(
                collection(db, "groups"),
                where("members", "array-contains", currentUser.uid)
            );
            return onSnapshot(q, (snapshot) => {
                const gData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    type: 'group' // Marker
                }));
                setGroups(gData);
            });
        };

        fetchConnections();
        const unsubGroups = fetchGroups();

        return () => unsubGroups();
    }, [currentUser, activeUid]);


    // 2. Load Chat History
    useEffect(() => {
        if (!currentUser || !activeChat) return;

        let chatId;
        let collRef;

        if (activeChat.type === 'direct') {
            // 1-on-1 Chat
            const uid1 = currentUser.uid;
            const uid2 = activeChat.data.user_id;
            chatId = uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
            collRef = collection(db, "chats", chatId, "messages");
        } else {
            // Group Chat
            chatId = activeChat.id;
            collRef = collection(db, "groups", chatId, "messages");
        }

        const q = query(collRef, orderBy("timestamp", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
            scrollToBottom();
        });

        return () => unsubscribe();
        return () => unsubscribe();
    }, [currentUser, activeChat]);

    // 3. Fetch Group Member Details
    useEffect(() => {
        if (!activeChat || activeChat.type !== 'group') {
            setGroupMembers([]);
            return;
        }

        const fetchMembers = async () => {
            const memberData = [];
            for (const uid of activeChat.members) {
                // Try to find in connections first to save reads
                const existing = connections.find(c => c.user_id === uid);
                if (existing) {
                    memberData.push(existing);
                } else if (uid === currentUser.uid) {
                    // Add self
                    memberData.push({
                        user_id: currentUser.uid,
                        name: currentUser.displayName || "Me",
                        role: "You"
                    });
                } else {
                    // Fetch from DB
                    try {
                        const snap = await getDoc(doc(db, "users", uid));
                        if (snap.exists()) memberData.push(snap.data());
                    } catch (e) {
                        console.error("Error fetching member:", uid, e);
                    }
                }
            }
            setGroupMembers(memberData);
        };

        fetchMembers();
    }, [activeChat, connections, currentUser]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const sendMessage = async (e, customText = null) => {
        if (e) e.preventDefault();
        const textToSend = customText || newMessage;

        if (!textToSend.trim() || !activeChat) return;

        let collRef;
        if (activeChat.type === 'direct') {
            const uid1 = currentUser.uid;
            const uid2 = activeChat.data.user_id;
            const chatId = uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
            collRef = collection(db, "chats", chatId, "messages");
        } else {
            collRef = collection(db, "groups", activeChat.id, "messages");
        }

        try {
            await addDoc(collRef, {
                text: textToSend,
                sender_id: currentUser.uid,
                sender_name: currentUser.displayName || "Unknown", // For Groups
                timestamp: serverTimestamp(),
                type: customText?.includes("meet.jit.si") ? "meeting" : "text" // Simple type detection
            });
            if (!customText) setNewMessage("");
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const handleStartMeeting = async () => {
        if (!activeChat) return;

        // Generate secure meeting ID
        const randomStr = Math.random().toString(36).substring(7);
        const meetingId = `skill-bridge-${activeChat.type === 'group' ? activeChat.id : 'dm'}-${randomStr}`;
        const meetingLink = `https://meet.jit.si/${meetingId}`;

        await sendMessage(null, `📞 Started a secure meeting: ${meetingLink}`);
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || selectedForGroup.length === 0) return;

        try {
            // Add self to members
            const memberIds = [currentUser.uid, ...selectedForGroup];

            await addDoc(collection(db, "groups"), {
                name: newGroupName,
                members: memberIds,
                created_by: currentUser.uid,
                created_at: serverTimestamp()
            });

            setShowCreateGroup(false);
            setNewGroupName("");
            setSelectedForGroup([]);
        } catch (err) {
            console.error("Error creating group:", err);
        }
    };

    const toggleGroupSelection = (uid) => {
        if (selectedForGroup.includes(uid)) {
            setSelectedForGroup(prev => prev.filter(id => id !== uid));
        } else {
            setSelectedForGroup(prev => [...prev, uid]);
        }
    };

    return (
        <div className="h-screen bg-slate-950 text-slate-300 flex flex-col">
            <Navbar />

            <div className="flex-1 max-w-7xl mx-auto w-full flex overflow-hidden border-t border-white/5">

                {/* SIDEBAR */}
                <div className="w-80 bg-slate-900/50 border-r border-white/5 flex flex-col">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center">
                        <h2 className="font-semibold text-white flex items-center gap-2">
                            <MessageSquare size={18} className="text-purple-400" /> Chats
                        </h2>
                        <button
                            onClick={() => setShowCreateGroup(true)}
                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                            title="Create Group"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-4">

                        {/* 1. GROUPS */}
                        <div className="space-y-1">
                            {groups.length > 0 && <p className="text-[10px] uppercase font-bold text-slate-500 px-3 mb-1">Groups</p>}
                            {groups.map(group => (
                                <button
                                    key={group.id}
                                    onClick={() => setActiveChat({ type: 'group', ...group })}
                                    className={`w-full p-2.5 flex items-center gap-3 rounded-lg transition-all ${activeChat?.id === group.id
                                        ? 'bg-purple-600/20 border border-purple-500/30'
                                        : 'hover:bg-white/5 border border-transparent'
                                        }`}
                                >
                                    <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center border border-white/10 text-purple-400">
                                        <Users size={16} />
                                    </div>
                                    <div className="text-left truncate">
                                        <p className={`text-sm font-medium ${activeChat?.id === group.id ? 'text-purple-200' : 'text-slate-300'}`}>
                                            {group.name}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* 2. DIRECT MESSAGES */}
                        <div className="space-y-1">
                            {connections.length > 0 && <p className="text-[10px] uppercase font-bold text-slate-500 px-3 mb-1">Direct Messages</p>}
                            {connections.map(user => (
                                <button
                                    key={user.user_id}
                                    onClick={() => setActiveChat({ type: 'direct', data: user })}
                                    className={`w-full p-2.5 flex items-center gap-3 rounded-lg transition-all ${activeChat?.data?.user_id === user.user_id
                                        ? 'bg-blue-600/20 border border-blue-500/30'
                                        : 'hover:bg-white/5 border border-transparent'
                                        }`}
                                >
                                    <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 text-blue-400">
                                        {user.name.charAt(0)}
                                    </div>
                                    <div className="text-left truncate">
                                        <p className={`text-sm font-medium ${activeChat?.data?.user_id === user.user_id ? 'text-blue-200' : 'text-slate-300'}`}>
                                            {user.name}
                                        </p>
                                        <p className="text-[10px] text-zinc-500 truncate">{user.role || 'Student'}</p>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {connections.length === 0 && groups.length === 0 && (
                            <p className="text-xs text-slate-500 text-center py-6">No conversations yet.</p>
                        )}
                    </div>
                </div>

                {/* MAIN CHAT AREA */}
                <div className="flex-1 flex flex-col bg-black/20">
                    {activeChat ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-white/5 bg-slate-900/30 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 flex items-center justify-center text-sm font-bold border rounded-lg ${activeChat.type === 'group'
                                        ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                                        : 'bg-blue-500/20 text-blue-400 border-blue-500/30 rounded-full'
                                        }`}>
                                        {activeChat.type === 'group' ? <Users size={16} /> : activeChat.data.name.charAt(0)}
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium text-white">
                                        {activeChat.type === 'group' ? activeChat.name : activeChat.data.name}
                                    </span>
                                    {activeChat.type === 'group' && (
                                        <div
                                            className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors group/header"
                                            onClick={() => setShowMembersModal(true)}
                                        >
                                            <div className="flex -space-x-2">
                                                {groupMembers.slice(0, 3).map(m => (
                                                    <div key={m.user_id} className="w-6 h-6 rounded-full border border-slate-900 bg-slate-700 flex items-center justify-center text-[9px] text-white overflow-hidden shadow-sm">
                                                        {m.name ? m.name.charAt(0) : '?'}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex flex-col ml-1">
                                                <span className="text-xs text-slate-300 font-medium group-hover/header:text-blue-400">
                                                    {groupMembers.slice(0, 2).map(m => m.name.split(' ')[0]).join(', ')}
                                                    {groupMembers.length > 2 && ` & ${groupMembers.length - 2} others`}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={handleStartMeeting}
                                    className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                                >
                                    <Video size={16} />
                                    <span className="hidden md:inline">Call</span>
                                </button>
                            </div>

                            {/* Messages List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.map((msg) => {
                                    const isMe = msg.sender_id === currentUser.uid;
                                    const isMeeting = msg.type === "meeting" || (msg.text && msg.text.includes("meet.jit.si"));
                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            {activeChat.type === 'group' && !isMe && (
                                                <span className="text-[10px] text-slate-500 mb-1 ml-1">{msg.sender_name}</span>
                                            )}
                                            <div className={`max-w-[80%] rounded-2xl text-sm ${isMe
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-slate-800 text-slate-300 rounded-tl-none border border-white/5'
                                                } ${isMeeting ? 'p-0 overflow-hidden' : 'p-3'}`}>

                                                {isMeeting ? (
                                                    <div className="bg-slate-900/50 p-4 min-w-[200px]">
                                                        <div className="flex items-center gap-2 mb-2 text-green-400 font-semibold">
                                                            <Video size={18} /> Meeting Started
                                                        </div>
                                                        <p className="text-xs text-slate-400 mb-3">Secure, audio/video meeting ready.</p>
                                                        <a
                                                            href={msg.text.split(" ").pop()}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="block w-full text-center py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                                                        >
                                                            Join Meeting
                                                        </a>
                                                    </div>
                                                ) : (
                                                    msg.text
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <form onSubmit={sendMessage} className="p-4 bg-slate-900/50 border-t border-white/5 flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={`Message ${activeChat.type === 'group' ? activeChat.name : activeChat.data.name}...`}
                                    className="flex-1 bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                                <button
                                    type="submit"
                                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    disabled={!newMessage.trim()}
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                            <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                            <p>Select a chat or start a new group</p>
                        </div>
                    )}
                </div>

                {/* CREATE GROUP MODAL */}
                {showCreateGroup && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-xl">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-white">Create New Group</h3>
                                <button onClick={() => setShowCreateGroup(false)} className="text-slate-400 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-2">Group Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                        placeholder="e.g. Hackathon Team Alpha"
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-2">Add Members</label>
                                    <div className="max-h-48 overflow-y-auto border border-white/10 rounded-lg divide-y divide-white/5">
                                        {connections.length === 0 && (
                                            <p className="p-3 text-xs text-slate-500 text-center">No connections available.</p>
                                        )}
                                        {connections.map(user => (
                                            <div
                                                key={user.user_id}
                                                onClick={() => toggleGroupSelection(user.user_id)}
                                                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors ${selectedForGroup.includes(user.user_id) ? 'bg-blue-900/20' : ''}`}
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedForGroup.includes(user.user_id) ? 'bg-blue-500 border-blue-500' : 'border-slate-600'}`}>
                                                    {selectedForGroup.includes(user.user_id) && <Plus size={10} className="text-white" />}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm text-white font-medium">{user.name}</p>
                                                    <p className="text-[10px] text-slate-400">{user.role}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-right text-[10px] text-slate-500 mt-1">{selectedForGroup.length} selected</p>
                                </div>

                                <button
                                    onClick={handleCreateGroup}
                                    disabled={!newGroupName.trim() || selectedForGroup.length === 0}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Create Group
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
