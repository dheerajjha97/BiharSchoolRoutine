
import { initializeApp, getApp, getApps, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let db: any = null;

// Singleton pattern to initialize Firebase only once
function getFirebaseApp(): FirebaseApp {
    if (!getApps().length) {
        return initializeApp(firebaseConfig);
    }
    return getApp();
}

function getFirebaseAuth() {
    const app = getFirebaseApp();
    return getAuth(app);
}

function getFirestoreDB() {
    if (db) {
        return db;
    }
    const app = getFirebaseApp();
    try {
        // First, try to initialize with offline persistence
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        });
    } catch (e: any) {
         // If persistence fails (e.g., multiple tabs, browser not supported),
         // fall back to in-memory persistence silently.
         db = initializeFirestore(app, {});
         console.warn(`Firestore persistence failed: ${e.code}. Falling back to memory-only.`);
    }
    return db;
}


export { getFirebaseApp, getFirebaseAuth, getFirestoreDB };
