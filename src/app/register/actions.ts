'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import type { AppState } from '@/types';

type RegistrationInput = {
    email: string;
    udise: string;
};

type RegistrationResult = {
    success: boolean;
    message: string;
};

/**
 * Registers a new school administrator directly via a server action.
 * It validates the input and creates a new user role document in Firestore.
 */
export async function registerAdmin(input: RegistrationInput): Promise<RegistrationResult> {
    const { email, udise } = input;

    // --- Basic Validation ---
    if (!email || !udise) {
        return { success: false, message: 'Email and UDISE code are required.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { success: false, message: `Invalid email format provided: ${email}` };
    }
    if (!/^\d{11}$/.test(udise)) {
        return { success: false, message: `Invalid UDISE code format. It must be 11 digits: ${udise}` };
    }

    const lowerCaseEmail = email.toLowerCase();

    try {
        const adminDb = getAdminDb();
        const userRolesRef = adminDb.collection('userRoles');

        // Check if email is already registered as an admin or teacher
        const roleDoc = await userRolesRef.doc(lowerCaseEmail).get();
        if (roleDoc.exists()) {
            const role = roleDoc.data()?.role || 'user';
            return { success: false, message: `This email is already registered as a ${role}. Please use a different email or log in.` };
        }
        
        // Check if UDISE is already taken
        const udiseQuery = await userRolesRef.where('udise', '==', udise).limit(1).get();
        if (!udiseQuery.empty) {
            return { success: false, message: `A school with UDISE code ${udise} is already registered.` };
        }

        // Create the new admin role document
        const newAdminRole = {
            email: lowerCaseEmail,
            role: 'admin',
            udise: udise,
            createdAt: new Date().toISOString(),
        };

        await userRolesRef.doc(lowerCaseEmail).set(newAdminRole);

        return {
            success: true,
            message: `Admin for UDISE ${udise} registered successfully. You can now log in.`,
        };

    } catch (error) {
        console.error('Error during admin registration:', error);
        return {
            success: false,
            message: `An unexpected server error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}
