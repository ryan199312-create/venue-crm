/**
 * One-time seed: grant the platform `super_admin` role to a user.
 *
 * The in-app "Bootstrap Super Admin" button was removed in the 2026-07 security
 * audit (it let anyone self-escalate). The FIRST super admin must therefore be
 * seeded out-of-band with admin credentials — that's what this script is for.
 *
 * Usage (run from the `functions/` directory so firebase-admin resolves):
 *
 *   # 1. Get a service-account key:
 *   #    Firebase Console -> Project Settings -> Service accounts -> Generate new private key
 *   # 2. Point ADC at it and run:
 *   #    Windows (PowerShell):  $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\key.json"
 *   #    macOS/Linux:           export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
 *   node scripts/grant-super-admin.js you@example.com
 *
 * Existing custom claims (e.g. tenantId) are preserved. After running, the user
 * must sign out and back in for the new claim to take effect on their token.
 */
const admin = require('firebase-admin');

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/grant-super-admin.js <email>');
    process.exit(1);
  }

  // When authenticating with gcloud user ADC (not a service-account key), the Identity
  // Toolkit API demands an explicit quota project. Default it so the script "just works".
  process.env.GOOGLE_CLOUD_QUOTA_PROJECT = process.env.GOOGLE_CLOUD_QUOTA_PROJECT || 'event-management-system-9f764';

  admin.initializeApp({ projectId: 'event-management-system-9f764' });

  const user = await admin.auth().getUserByEmail(email);
  const existing = user.customClaims || {};
  await admin.auth().setCustomUserClaims(user.uid, { ...existing, role: 'super_admin' });

  console.log(`✅ Granted super_admin to ${email} (uid: ${user.uid}).`);
  console.log('   Existing claims preserved:', JSON.stringify(existing));
  console.log('   Ask the user to sign out and back in to refresh their token.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
