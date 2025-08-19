
'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import type { AppState } from '@/types';

type RegistrationInput = {
    email: string;
    udise: string;
};

type RegistrationResult = {
    success: boolean;
    error?: string;
};

export async function registerNewAdmin(input: RegistrationInput): Promise<RegistrationResult> {
    const { email, udise } = input;

    // --- Validation ---
    if (!email || !udise) {
        return { success: false, error: 'Email and UDISE code are required.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { success: false, error: `Invalid email format provided: ${email}` };
    }

    if (!/^\d{11}$/.test(udise)) {
        return { success: false, error: `Invalid UDISE code format. It must be 11 digits: ${udise}` };
    }

    const lowerCaseEmail = email.toLowerCase();

    try {
        const adminDb = getAdminDb();
        const userRolesRef = adminDb.collection('userRoles');
        
        // Check if email is already registered as an admin or a teacher
        const emailQuery = userRolesRef.where('email', '==', lowerCaseEmail);
        const emailSnapshot = await emailQuery.get();

        if (!emailSnapshot.empty) {
            return { success: false, error: `An account with the email "${email}" already exists.` };
        }

        // Check if UDISE code is already registered
        const udiseQuery = userRolesRef.where('udise', '==', udise).where('role', '==', 'admin');
        const udiseSnapshot = await udiseQuery.get();

        if (!udiseSnapshot.empty) {
            return { success: false, error: `A school with the UDISE code "${udise}" is already registered.` };
        }
        
        const newAdminRole = {
            email: lowerCaseEmail,
            role: 'admin',
            udise: udise,
            createdAt: new Date().toISOString(),
        };

        // Use the email as the doc ID for easy lookups
        await userRolesRef.doc(lowerCaseEmail).set(newAdminRole);

        return { success: true };

    } catch (error) {
        console.error('Error during admin registration:', error);
        return { success: false, error: 'An unexpected server error occurred. Please try again later.' };
    }
}
