
'use server';

import { getFirestoreDB } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

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
        const db = getFirestoreDB();
        const userRolesRef = collection(db, 'userRoles');

        // Check if email is already registered as an admin or teacher
        const isUnique = await isEmailUnique(lowerCaseEmail);
        if (!isUnique) {
             return { success: false, message: `This email is already registered. Please use a different email or log in.` };
        }
        
        // Check if UDISE is already taken by another admin
        const udiseQuery = await getDocs(query(userRolesRef, where('udise', '==', udise), where('role', '==', 'admin')));
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

        await setDoc(doc(userRolesRef, lowerCaseEmail), newAdminRole);

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

export async function addTeacherRole(email: string, udise: string): Promise<{success: boolean}> {
    if (!email || !udise) return { success: false };
    const lowerCaseEmail = email.toLowerCase();
    try {
        const db = getFirestoreDB();
        const newTeacherRole = {
            email: lowerCaseEmail,
            role: 'teacher',
            udise: udise,
            createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'userRoles', lowerCaseEmail), newTeacherRole);
        return { success: true };
    } catch (error) {
        console.error("Error adding teacher role:", error);
        return { success: false };
    }
}


export async function isEmailUnique(email: string): Promise<boolean> {
    const lowerCaseEmail = email.toLowerCase();
    if (!lowerCaseEmail) return false;

    try {
        const db = getFirestoreDB();

        // 1. Check in userRoles collection (for admins and teachers)
        const roleDocRef = doc(db, 'userRoles', lowerCaseEmail);
        const roleDoc = await getDoc(roleDocRef);
        if (roleDoc.exists()) {
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error checking email uniqueness:", error);
        // Fail-safe: if there's an error, assume it's not unique to prevent duplicates.
        return false; 
    }
}

export async function getTotalUserCount(): Promise<number> {
    try {
        const db = getFirestoreDB();
        
        // userRoles collection contains all users (admins and teachers)
        const userRolesRef = collection(db, 'userRoles');
        const snapshot = await getDocs(userRolesRef);
        
        return snapshot.size;

    } catch (error) {
        console.error("Error getting total user count:", error);
        return 0;
    }
}

    