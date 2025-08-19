'use server';

import type { AppState } from '@/types';

type RegistrationInput = {
    email: string;
    udise: string;
};

type RegistrationResult = {
    success: boolean;
    message: string;
    isCommand: boolean;
};

/**
 * Generates a command to register a new admin.
 * This is a workaround to avoid direct Firebase Admin SDK calls from Next.js Server Actions
 * which can be problematic in some environments.
 * The user will be prompted to run the generated command in their terminal.
 */
export async function generateAdminRegistrationCommand(input: RegistrationInput): Promise<RegistrationResult> {
    const { email, udise } = input;

    // --- Validation ---
    if (!email || !udise) {
        return { success: false, message: 'Email and UDISE code are required.', isCommand: false };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { success: false, message: `Invalid email format provided: ${email}`, isCommand: false };
    }

    if (!/^\d{11}$/.test(udise)) {
        return { success: false, message: `Invalid UDISE code format. It must be 11 digits: ${udise}`, isCommand: false };
    }

    const lowerCaseEmail = email.toLowerCase();

    // Instead of performing the action, generate the command for the user to run.
    const command = `npm run register:admin -- "${lowerCaseEmail}" "${udise}"`;
    
    const message = `To complete registration, please run the following command in your project's terminal:\n\n${command}`;

    return { 
        success: true, 
        message: message,
        isCommand: true
    };
}