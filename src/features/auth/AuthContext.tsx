import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  type Auth,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth } from '@/shared/auth/firebase';
import {
  acknowledgePasswordChange,
  fetchCurrentMember,
  RosterError,
  type RosterMember,
} from '@/features/roster/rosterApi';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'unverified'; email: string }
  | { status: 'unregistered' }
  | { status: 'suspended' }
  | { status: 'unavailable' }
  | { status: 'ready'; member: RosterMember };

export interface AuthContextValue {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  resendVerification: () => Promise<void>;
  refreshVerification: () => Promise<boolean>;
  changePassword: (newPassword: string) => Promise<void>;
  retry: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function stateForRosterError(error: unknown): AuthState {
  if (error instanceof RosterError) {
    if (error.code === 'not_registered') return { status: 'unregistered' };
    if (error.code === 'suspended') return { status: 'suspended' };
  }
  return { status: 'unavailable' };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const resolveUser = useCallback(async (user: User | null) => {
    if (!user) {
      setState({ status: 'signedOut' });
      return;
    }
    setState({ status: 'loading' });
    try {
      const member = await fetchCurrentMember();
      setState({ status: 'ready', member });
    } catch (error) {
      setState(stateForRosterError(error));
    }
  }, []);

  useEffect(() => {
    let auth: Auth;
    try {
      auth = getFirebaseAuth();
    } catch {
      setState({ status: 'unavailable' });
      return;
    }
    return onAuthStateChanged(auth, (user) => {
      void resolveUser(user);
    });
  }, [resolveUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await sendPasswordResetEmail(getFirebaseAuth(), email);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(getFirebaseAuth());
  }, []);

  const resendVerification = useCallback(async () => {
    const user = getFirebaseAuth().currentUser;
    if (!user) throw new Error('not_signed_in');
    await sendEmailVerification(user);
  }, []);

  const refreshVerification = useCallback(async () => {
    const user = getFirebaseAuth().currentUser;
    if (!user) throw new Error('not_signed_in');
    await reload(user);
    await resolveUser(user);
    return user.emailVerified;
  }, [resolveUser]);

  const changePassword = useCallback(
    async (newPassword: string) => {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('not_signed_in');
      await updatePassword(user, newPassword);
      await acknowledgePasswordChange();
      await resolveUser(user);
    },
    [resolveUser]
  );

  const retry = useCallback(async () => {
    await resolveUser(getFirebaseAuth().currentUser);
  }, [resolveUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      signIn,
      sendPasswordReset,
      signOut,
      resendVerification,
      refreshVerification,
      changePassword,
      retry,
    }),
    [
      state,
      signIn,
      sendPasswordReset,
      signOut,
      resendVerification,
      refreshVerification,
      changePassword,
      retry,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
