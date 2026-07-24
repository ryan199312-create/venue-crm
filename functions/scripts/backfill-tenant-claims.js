/**
 * One-time migration: stamp every tenant user's `tenantId` (and `role`) custom claim,
 * mirroring the backfillTenantClaims Cloud Function. Run this AFTER deploying the
 * tenant-bound Firestore rules. Users pick up the claim on their next token refresh
 * (login, or the app's force-refresh on load). First-write-wins on tenantId — a user
 * already bound is never reassigned.
 *
 * Usage (from the functions/ directory):
 *   node scripts/backfill-tenant-claims.js
 *
 * Needs ADC: either GOOGLE_APPLICATION_CREDENTIALS pointing at a service-account key,
 * or `gcloud auth application-default login`.
 */
const admin = require('firebase-admin');

async function main() {
  // gcloud user ADC needs an explicit quota project for the Identity Toolkit API.
  process.env.GOOGLE_CLOUD_QUOTA_PROJECT = process.env.GOOGLE_CLOUD_QUOTA_PROJECT || 'event-management-system-9f764';
  admin.initializeApp({ projectId: 'event-management-system-9f764' });
  const db = admin.firestore();

  const tenantsSnap = await db.collection('tenants').get();
  const appIds = tenantsSnap.docs.map(d => d.id);
  console.log(`Tenants: ${appIds.join(', ')}`);

  let updated = 0, skipped = 0, alreadyBound = 0;
  for (const appId of appIds) {
    const usersSnap = await db.collection('artifacts').doc(appId)
      .collection('private').doc('data').collection('users').get();
    for (const userDoc of usersSnap.docs) {
      try {
        const authUser = await admin.auth().getUser(userDoc.id);
        const existing = authUser.customClaims || {};
        const role = existing.role || userDoc.data().role || 'staff';
        if (existing.tenantId) alreadyBound++;
        await admin.auth().setCustomUserClaims(userDoc.id, {
          ...existing,
          role,
          tenantId: existing.tenantId || appId, // first-write-wins
        });
        updated++;
        console.log(`  [${appId}] ${userDoc.id} -> tenantId=${existing.tenantId || appId}, role=${role}`);
      } catch (e) {
        skipped++;
        console.warn(`  [${appId}] SKIP ${userDoc.id}: ${e.message}`);
      }
    }
    console.log(`  Tenant ${appId}: ${usersSnap.size} user docs`);
  }
  console.log(`\nDone. updated=${updated} (already-bound=${alreadyBound}), skipped=${skipped}`);
  console.log('Users must refresh their token (re-login or app force-refresh) for the claim to apply.');
  process.exit(0);
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
