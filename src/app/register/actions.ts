
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
        const emailQuery = userRolesRef.where('email', '==', lowerCaseEmail);
        const udiseQuery = userRolesRef.where('udise', '==', udise);

        const schoolsRef = adminDb.collection('schoolAdmins');
        // This is a more complex query that Firestore doesn't support directly.
        // We will fetch all schools and check the teacher list manually.
        const allSchoolsSnapshot = await schoolsRef.get();

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
        
        // Check if email is already used by a teacher in ANY school
        for (const schoolDoc of allSchoolsSnapshot.docs) {
            const schoolData = schoolDoc.data() as AppState;
            if (schoolData.teachers?.some(teacher => teacher.email === lowerCaseEmail)) {
                 return { success: false, error: `This email is already registered as a teacher in another school. Please use a different email.` };
            }
        }


        const newAdminRole = {
            email: lowerCaseEmail,
            role: 'admin',
            udise: udise,
            createdAt: new Date().toISOString(),
        };

        await userRolesRef.doc(lowerCaseEmail).set(newAdminRole);

        return { success: true };

    } catch (error) {
        console.error('Error during admin registration:', error);
        return { success: false, error: 'An unexpected server error occurred. Please try again later.' };
    }
}
