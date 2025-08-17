
/**
 * Command-Line Script to Register a New School Admin
 * 
 * This script securely adds a new administrator to the Firestore `userRoles` collection.
 * This is the first step in onboarding a new school.
 * 
 * Usage:
 * npm run register:admin -- "admin.email@example.com" "12345678901"
 * 
 * Arguments:
 * 1. Admin's Email Address (string, required)
 * 2. School's UDISE Code (string, required)
 */

import 'dotenv/config';
import { adminDb } from '../lib/firebase-admin';

async function registerAdmin() {
    console.log('Starting admin registration script...');

    // 1. Get command-line arguments
    const args = process.argv.slice(2);
    const email = args[0];
    const udise = args[1];

    // 2. Validate arguments
    if (!email || !udise) {
        console.error('Error: Missing required arguments.');
        console.error('Usage: npm run register:admin -- "admin.email@example.com" "12345678901"');
        process.exit(1);
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        console.error(`Error: Invalid email format provided: ${email}`);
        process.exit(1);
    }

    if (!/^\d{11}$/.test(udise)) {
        console.error(`Error: Invalid UDISE code format. It must be 11 digits: ${udise}`);
        process.exit(1);
    }
    
    console.log(`Attempting to register admin:`);
    console.log(`  Email: ${email}`);
    console.log(`  UDISE: ${udise}`);

    try {
        // 3. Check for existing admin with the same email or UDISE
        const userRolesRef = adminDb.collection('userRoles');
        const emailQuery = userRolesRef.where('email', '==', email);
        const udiseQuery = userRolesRef.where('udise', '==', udise);

        const [emailSnapshot, udiseSnapshot] = await Promise.all([
            emailQuery.get(),
            udiseQuery.get(),
        ]);

        if (!emailSnapshot.empty) {
            console.error(`Error: An admin with the email "${email}" already exists.`);
            process.exit(1);
        }

        if (!udiseSnapshot.empty) {
            console.error(`Error: An admin with the UDISE code "${udise}" already exists.`);
            process.exit(1);
        }

        // 4. Create the new admin role document
        const newAdminRole = {
            email: email.toLowerCase(),
            role: 'admin',
            udise: udise,
            createdAt: new Date().toISOString(),
        };

        // Use the email as the document ID for easy lookup
        await userRolesRef.doc(email.toLowerCase()).set(newAdminRole);

        console.log('\n✅ Success! Admin role created successfully in Firestore.');
        console.log('The user can now log in to complete the school setup.');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ An unexpected error occurred during the registration process.');
        console.error(error);
        process.exit(1);
    }
}

registerAdmin();
