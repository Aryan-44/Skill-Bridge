import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const NotificationContext = createContext();

export function useNotifications() {
    return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
    const { currentUser } = useAuth();
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

    useEffect(() => {
        if (!currentUser) return;

        // 1. Listen for Pending Requests (for Bell Icon)
        const qRequests = query(
            collection(db, "requests"),
            where("receiver_id", "==", currentUser.uid),
            where("status", "==", "pending")
        );

        const unsubRequests = onSnapshot(qRequests, (snapshot) => {
            setPendingRequestsCount(snapshot.size);

            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    // Only toast if it's a reasonably new request to avoid spam on load
                    // (Simple check: if we are loading initial snapshot, ignore. 
                    // But onSnapshot handles initial load as 'added'. 
                    // To fix this properly, we'd check timestamps, but for MVP this is acceptable or we use a ref to track init)
                    if (!change.doc.metadata.hasPendingWrites) {
                        toast.success(`New connection request from ${data.sender_name}`);
                    }
                }
            });
        }, (error) => {
            console.error("Error listening to requests:", error);
        });

        // 2. Listen for User Doc (Unread Badge Count)
        const unsubUser = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const unreadList = data.unread_from || [];
                setUnreadMessagesCount(unreadList.length);
            }
        });

        // 3. Listen for Toast Notifications (Messages) - Keep this for Popups
        const qMsgNotifications = query(
            collection(db, "notifications"),
            where("to", "==", currentUser.uid),
            where("type", "==", "message"),
            where("read", "==", false)
        );

        const unsubMsg = onSnapshot(qMsgNotifications, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    // Optional: Avoid double toast if we use something else, 
                    // but for now this is the specific "popup" mechanism
                    toast(`New message from ${data.senderName}`, {
                        icon: '💬',
                        style: {
                            borderRadius: '10px',
                            background: '#1e293b',
                            color: '#fff',
                        },
                    });
                }
            });
        });

        return () => {
            unsubRequests();
            unsubUser();
            unsubMsg();
        };
    }, [currentUser]);

    const value = {
        unreadMessagesCount,
        pendingRequestsCount
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}
