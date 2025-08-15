
import { initializeApp, getApp, getApps, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app: FirebaseApp | null = null;
let db: any = null;

// Singleton pattern to initialize Firebase only once
function getFirebaseApp(): FirebaseApp {
    if (app) return app;
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }
    return app;
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
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
            cacheSizeBytes: CACHE_SIZE_UNLIMITED,
        })
    });
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn(
                "Firestore persistence failed: Multiple tabs open, persistence can only be enabled in one tab at a a time."
            );
        } else if (err.code == 'unimplemented') {
            console.warn(
                "Firestore persistence failed: The current browser does not support all of the features required to enable persistence."
            );
        }
    });
    return db;
}


export { getFirebaseApp, getFirebaseAuth, getFirestoreDB };
