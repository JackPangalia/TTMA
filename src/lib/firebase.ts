import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function createApp() {
  const existing = getApps();
  if (existing.length > 0) {
    return existing[0];
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      // The private key comes from the env as a single-line string with literal \n.
      // We need to replace them with actual newlines.
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  });
}

const app = createApp();

/**
 * Firestore database instance.
 * Used by all data-access functions in sheets.ts.
 */
export const db = getFirestore(app);
