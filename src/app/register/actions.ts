
'use server';

import { adminDb } from '@/lib/firebase-admin';

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

    try {
        const userRolesRef = adminDb.collection('userRoles');
        const emailQuery = userRolesRef.where('email', '==', email.toLowerCase());
        const udiseQuery = userRolesRef.where('udise', '==', udise);

        const [emailSnapshot, udiseSnapshot] = await Promise.all([
            emailQuery.get(),
            udiseQuery.get(),
        ]);

        if (!emailSnapshot.empty) {
            return { success: false, error: `An admin with the email "${email}" already exists.` };
        }

        if (!udiseSnapshot.empty) {
            return { success: false, error: `A school with the UDISE code "${udise}" is already registered.` };
        }

        const newAdminRole = {
            email: email.toLowerCase(),
            role: 'admin',
            udise: udise,
            createdAt: new Date().toISOString(),
        };

        await userRolesRef.doc(email.toLowerCase()).set(newAdminRole);

        return { success: true };

    } catch (error) {
        console.error('Error during admin registration:', error);
        return { success: false, error: 'An unexpected server error occurred. Please try again later.' };
    }
}
