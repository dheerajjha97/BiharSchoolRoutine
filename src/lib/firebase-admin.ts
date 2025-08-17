
import * as admin from 'firebase-admin';

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
    throw new Error('The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. This is required for admin operations.');
}

try {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(serviceAccountKey)),
        });
    }
} catch (error) {
    console.error('Firebase Admin initialization error:', error);
    // Log a more specific error if parsing fails
    if (error instanceof SyntaxError) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it is a valid JSON string.');
    }
    throw error;
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
