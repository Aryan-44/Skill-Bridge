import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// import { getAnalytics } from "firebase/analytics"; // Optional

const firebaseConfig = {
  apiKey: "AIzaSyDe_lHOZKWdVbX8vI3HtX8eh49JDNzFsNk",
  authDomain: "smart-bridge-800dc.firebaseapp.com",
  projectId: "smart-bridge-800dc",
  storageBucket: "smart-bridge-800dc.firebasestorage.app",
  messagingSenderId: "738270731604",
  appId: "1:738270731604:web:26fbab8b3ad161088dfcc1",
  measurementId: "G-D8N1ZNETCQ"
};

const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);