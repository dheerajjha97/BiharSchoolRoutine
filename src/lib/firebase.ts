
import { initializeApp, getApp, getApps, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, initializeAuth, browserLocalPersistence, type Auth } from "firebase/auth";
import { initializeFirestore, getFirestore, enableIndexedDbPersistence, type Firestore } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// This singleton pattern ensures that Firebase is initialized only once.
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let persistenceEnabled = false;

function initializeFirebase() {
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
        auth = initializeAuth(app, {
            persistence: browserLocalPersistence,
        });
        db = getFirestore(app);
    } else {
        app = getApp();
        auth = getAuth(app);
        db = getFirestore(app);
    }
}

// Call initialization right away
initializeFirebase();

export function getFirebaseApp(): FirebaseApp {
    if (!app) initializeFirebase();
    return app;
}

export function getFirebaseAuth(): Auth {
    if (!auth) initializeFirebase();
    return auth;
}

export function getFirestoreDB(): Firestore {
    if (!db) initializeFirebase();
    
    // Enable persistence only on the client side and only once
    if (typeof window !== 'undefined' && !persistenceEnabled) {
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
