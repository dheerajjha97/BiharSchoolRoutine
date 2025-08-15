
import { initializeApp, getApp, getApps, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, initializeAuth, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED, Firestore } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app: FirebaseApp;
let auth: ReturnType<typeof getAuth>;
let db: Firestore;
let persistenceEnabled = false;

// Singleton pattern to initialize Firebase only once
function getFirebaseApp(): FirebaseApp {
    if (getApps().length) {
        return getApp();
    }
    return initializeApp(firebaseConfig);
}

function getFirebaseAuth() {
    if (auth) {
        return auth;
    }
    
    app = getFirebaseApp();

    // Use initializeAuth for persistence control
    auth = initializeAuth(app, {
        persistence: browserLocalPersistence,
    });
    
    return auth;
}

function getFirestoreDB() {
    if (db) {
        return db;
    }

    app = getFirebaseApp();
    db = getFirestore(app);

    // Ensure persistence is only enabled once
    if (!persistenceEnabled) {
         enableIndexedDbPersistence(db).then(() => {
            persistenceEnabled = true;
         }).catch((err) => {
            if (err.code == 'failed-precondition') {
                console.warn(
                    "Firestore persistence failed: Multiple tabs open, persistence can only be enabled in one tab at a time."
                );
            } else if (err.code == 'unimplemented') {
                console.warn(
                    "Firestore persistence failed: The current browser does not support all of the features required to enable persistence."
                );
            }
        });
    }

    return db;
}


export { getFirebaseApp, getFirebaseAuth, getFirestoreDB };
