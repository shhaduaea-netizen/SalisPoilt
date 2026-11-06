import { initializeApp, type FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
  type Auth,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBFDmVRDoPF5QZd1l9JWhQ4rI34__NVPUU',
  authDomain: 'salespilot-e581d.firebaseapp.com',
  projectId: 'salespilot-e581d',
  storageBucket: 'salespilot-e581d.firebasestorage.app',
  messagingSenderId: '606373180080',
  appId: '1:606373180080:web:26e37b4a9340e0d6f84175',
};

let authInstance: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!authInstance) authInstance = getAuth(initializeApp(firebaseConfig));
  return authInstance;
}

export function firebaseErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null;
  const code = (error as Pick<FirebaseError, 'code'>).code;
  return typeof code === 'string' ? code : null;
}

export async function currentIdToken(): Promise<string> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('not_signed_in');
  return user.getIdToken();
}

let provisioningAuth: Auth | null = null;

function getProvisioningAuth(): Auth {
  if (!provisioningAuth) {
    provisioningAuth = getAuth(initializeApp(firebaseConfig, 'roster-provisioning'));
  }
  return provisioningAuth;
}

export type ProvisionOutcome = 'created' | 'existing';

// Creates the sign-in account for a roster member on a separate auth instance so the owner stays signed in.
export async function provisionFirebaseAccount(email: string, temporaryPassword: string): Promise<ProvisionOutcome> {
  const auth = getProvisioningAuth();
  try {
    await createUserWithEmailAndPassword(auth, email, temporaryPassword);
    return 'created';
  } catch (error) {
    if (firebaseErrorCode(error) === 'auth/email-already-in-use') return 'existing';
    throw error;
  } finally {
    await signOut(auth);
  }
}

export async function provisionSingleAccount(email: string, password: string): Promise<ProvisionOutcome> {
  return provisionFirebaseAccount(email, password);
}
