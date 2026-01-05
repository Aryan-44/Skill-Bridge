import { createContext, useContext, useEffect, useState } from "react";
import { auth, googleProvider } from "../firebaseConfig";
import { signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    function login() {
        return signInWithPopup(auth, googleProvider);
    }

    function signupWithEmail(email, password, name) {
        return createUserWithEmailAndPassword(auth, email, password).then(async (result) => {
            // Update Display Name immediately
            await updateProfile(result.user, { displayName: name });
            return result;
        });
    }

    function loginWithEmail(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    function logout() {
        return signOut(auth);
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const value = { currentUser, login, logout, signupWithEmail, loginWithEmail };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
