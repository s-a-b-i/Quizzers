'use client';

/**
 * Mongo user + role sync uses POST /api/auth/google for every Firebase ID token,
 * whether the user signed in with email/password or Google. That route verifies
 * the token with Firebase Admin and find-or-creates the User in MongoDB. It is
 * not limited to Google sign-in despite the path name.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import axios from 'axios';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  inMemoryPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';

const AuthContext = createContext(null);

const api = axios.create({
  baseURL: '',
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncMongoUser = useCallback(async (idToken) => {
    const { data } = await api.post('/api/auth/google', { idToken });
    if (!data?.success) {
      throw new Error(data?.message || 'Sync failed');
    }
    setRole(data.data.role);
  }, []);

  useEffect(() => {
    const auth = getFirebaseAuth();
    let unsubscribe = () => {};

    (async () => {
      await setPersistence(auth, inMemoryPersistence);
      unsubscribe = onAuthStateChanged(auth, async (u) => {
        if (!u) {
          setUser(null);
          setToken(null);
          setRole(null);
          setLoading(false);
          return;
        }
        setUser(u);
        setLoading(true);
        try {
          const idToken = await u.getIdToken();
          setToken(idToken);
          await syncMongoUser(idToken);
        } catch {
          setRole(null);
        } finally {
          setLoading(false);
        }
      });
    })();

    return () => {
      unsubscribe();
    };
  }, [syncMongoUser]);

  const login = useCallback(async (email, password) => {
    const auth = getFirebaseAuth();
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, []);

  const register = useCallback(async (email, password) => {
    const auth = getFirebaseAuth();
    await createUserWithEmailAndPassword(auth, email, password);
  }, []);

  const logout = useCallback(async () => {
    const auth = getFirebaseAuth();
    const idToken = await auth.currentUser?.getIdToken();
    if (idToken) {
      try {
        await api.post(
          '/api/auth/logout',
          {},
          { headers: { Authorization: `Bearer ${idToken}` } }
        );
      } catch {
        /* still sign out locally */
      }
    }
    await signOut(auth);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      role,
      loading,
      login,
      loginWithGoogle,
      register,
      logout,
    }),
    [user, token, role, loading, login, loginWithGoogle, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
