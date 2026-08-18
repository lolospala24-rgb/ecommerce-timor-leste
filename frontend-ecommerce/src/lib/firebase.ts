import { initializeApp, getApps, type FirebaseOptions } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

function getFirebaseApp() {
  return getApps()[0] ?? initializeApp(firebaseConfig);
}

/**
 * Opens the Google sign-in popup and returns the Firebase ID token — the
 * caller sends this to POST /auth/google, which verifies it server-side
 * and issues the app's own session (same JWT/cookie flow as email login).
 */
export async function signInWithGoogle(): Promise<string> {
  const auth = getAuth(getFirebaseApp());
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  return credential.user.getIdToken();
}
