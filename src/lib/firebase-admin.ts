
import * as admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;

const initializeAdminApp = () => {
    if (adminApp) {
        return adminApp;
    }

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountKey) {
        throw new Error('The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. This is required for admin operations.');
    }

    try {
        if (!admin.apps.length) {
            const credential = admin.credential.cert(JSON.parse(serviceAccountKey));
            adminApp = admin.initializeApp({ credential });
        } else {
            adminApp = admin.app();
        }
    } catch (error) {
        console.error('Firebase Admin initialization error:', error);
        if (error instanceof SyntaxError) {
            console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it is a valid JSON string.');
        }
        throw error;
    }
    
    return adminApp;
};

// Use getters to ensure the app is initialized before accessing db or auth
export const getAdminDb = () => {
    initializeAdminApp();
    return admin.firestore();
};

export const getAdminAuth = () => {
    initializeAdminApp();
    return admin.auth();
};
