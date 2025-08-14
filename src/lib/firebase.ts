
import { initializeApp, getApp, getApps, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, CACHE_SIZE_UNLIMITED, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

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
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        });
    } catch (e: any) {
         if (e.code === 'failed-precondition') {
            console.warn('Firestore persistence failed: Multiple tabs open. Falling back to memory-only persistence.');
             db = initializeFirestore(app, {});
         } else if (e.code === 'unimplemented') {
            console.warn('Firestore persistence not available in this browser. Falling back to memory-only persistence.');
             db = initializeFirestore(app, {});
         } else {
            console.error("Firestore initialization failed", e);
            db = initializeFirestore(app, {});
         }
    }
    return db;
}


export { getFirebaseApp, getFirebaseAuth, getFirestoreDB };
