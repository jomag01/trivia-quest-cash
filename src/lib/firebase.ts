import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDo53NYkDeWZCBwCJwWUEY-5YzvegwyD24",
  authDomain: "triviabees-9e3ea.firebaseapp.com",
  projectId: "triviabees-9e3ea",
  storageBucket: "triviabees-9e3ea.firebasestorage.app",
  messagingSenderId: "768692385786",
  appId: "1:768692385786:web:d7a844795107f08bef9643",
  measurementId: "G-LLMD1LH9MB"
};

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);

// Initialize Analytics (only in browser and if supported)
export const initAnalytics = async () => {
  if (typeof window !== 'undefined' && await isSupported()) {
    return getAnalytics(firebaseApp);
  }
  return null;
};
