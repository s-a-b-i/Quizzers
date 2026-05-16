'use client';

/**
 * Mongo user + role sync uses POST /api/auth/google for every Firebase ID token,
 * whether the user signed in with email/password or Google. That route verifies
 * the token with Firebase Admin and find-or-creates the User in MongoDB. It is
 * not limited to Google sign-in despite the path name.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { getFirebaseAuth } from '@/lib/firebase';
import { PageLoader } from '@/components/ui/PageLoader';
import { apiGet, apiPost, registerApiAuth } from '@/lib/api';
import { AuthContext, useAuth } from '@/context/authState';

/** Paths where we send users after Firebase sign-in once Mongo profile is loaded. */
const POST_SIGN_IN_PATHS = new Set(['/login', '/register', '/']);

export function destinationAfterProfile(role, onboardingDone) {
  if (!onboardingDone) return '/onboarding';
  if (role === 'admin' || role === 'superAdmin') return '/admin/users';
  return '/dashboard';
}

function AuthLoadingShell({ children }) {
  const { loading } = useAuth();
  const pathname = usePathname();
  const [navOverlay, setNavOverlay] = useState(false);
  const prevPathRef = useRef(null);

  useEffect(() => {
    if (loading) {
      setNavOverlay(false);
    }
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    if (prevPathRef.current === null) {
      prevPathRef.current = pathname;
      return;
    }
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      setNavOverlay(true);
      const id = setTimeout(() => setNavOverlay(false), 200);
      return () => clearTimeout(id);
    }
  }, [pathname, loading]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <>
      {navOverlay ? <PageLoader /> : null}
      {children}
    </>
  );
}

export function AuthProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const tokenRef = useRef(null);
  const logoutRef = useRef(async () => {});

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  /** Full Mongo user from GET /api/users/me (source of truth for profile, onboarding, accountStatus). */
  const [mongoUser, setMongoUser] = useState(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const syncMongoUser = useCallback(async (idToken) => {
    const { data } = await apiPost(
      '/api/auth/google',
      { idToken },
      { skipAuthHeader: true }
    );
    if (!data?.success) {
      throw new Error(data?.message || 'Sync failed');
    }
    setRole(data.data.role);
  }, []);

  const refreshUserProfile = useCallback(async (idToken) => {
    tokenRef.current = idToken;
    await apiPost('/api/users/bootstrap', {});
    const { data } = await apiGet('/api/users/me');
    if (data?.success && data?.data?.user) {
      const doc = data.data.user;
      const onboardingDone = Boolean(doc.onboardingCompleted);
      const nextRole = typeof doc.role === 'string' ? doc.role : null;
      setMongoUser(doc);
      setOnboardingCompleted(onboardingDone);
      if (nextRole) setRole(nextRole);
      return { role: nextRole, onboardingCompleted: onboardingDone };
    }
    setMongoUser(null);
    setOnboardingCompleted(false);
    return null;
  }, []);

  /** Sync ref used by `lib/api` interceptors after `getIdToken(true)` (token may differ from React state). */
  const primeApiToken = useCallback((idToken) => {
    tokenRef.current = idToken ?? null;
  }, []);

  const logout = useCallback(async () => {
    const auth = getFirebaseAuth();
    let idToken = null;
    try {
      idToken = await auth.currentUser?.getIdToken();
    } catch {
      idToken = null;
    }
    if (idToken) {
      tokenRef.current = idToken;
      try {
        await apiPost('/api/auth/logout', {}, { skip401Logout: true });
      } catch {
        /* still sign out locally */
      }
    }
    tokenRef.current = null;
    await signOut(auth);
  }, []);

  logoutRef.current = logout;

  useLayoutEffect(() => {
    registerApiAuth({
      getAccessToken: () => tokenRef.current,
      onUnauthorized: async () => {
        await logoutRef.current?.();
      },
    });
  }, []);

  useEffect(() => {
    const auth = getFirebaseAuth();
    let unsubscribe = () => {};

    (async () => {
      await setPersistence(auth, browserLocalPersistence);
      unsubscribe = onAuthStateChanged(auth, async (u) => {
        if (!u) {
          tokenRef.current = null;
          setUser(null);
          setToken(null);
          setRole(null);
          setMongoUser(null);
          setOnboardingCompleted(false);
          setLoading(false);
          return;
        }
        setUser(u);
        setLoading(true);
        try {
          const idToken = await u.getIdToken();
          tokenRef.current = idToken;
          setToken(idToken);
          await syncMongoUser(idToken);
          await refreshUserProfile(idToken);
        } catch {
          setRole(null);
          setMongoUser(null);
          setOnboardingCompleted(false);
        } finally {
          setLoading(false);
        }
      });
    })();

    return () => {
      unsubscribe();
    };
  }, [syncMongoUser, refreshUserProfile]);

  useEffect(() => {
    if (loading || !user || !mongoUser) return;
    if (!pathname || !POST_SIGN_IN_PATHS.has(pathname)) return;
    router.replace(destinationAfterProfile(role, onboardingCompleted));
  }, [
    loading,
    user,
    mongoUser,
    pathname,
    role,
    onboardingCompleted,
    router,
  ]);

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

  const sendPasswordReset = useCallback(async (email) => {
    const trimmed = typeof email === 'string' ? email.trim() : '';
    if (!trimmed) {
      const err = new Error('Enter your email address.');
      err.code = 'auth/missing-email';
      throw err;
    }
    const auth = getFirebaseAuth();
    await sendPasswordResetEmail(auth, trimmed);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      role,
      mongoUser,
      setMongoUser,
      onboardingCompleted,
      setOnboardingCompleted,
      loading,
      login,
      loginWithGoogle,
      register,
      sendPasswordReset,
      logout,
      refreshUserProfile,
      primeApiToken,
    }),
    [
      user,
      token,
      role,
      mongoUser,
      onboardingCompleted,
      loading,
      login,
      loginWithGoogle,
      register,
      sendPasswordReset,
      logout,
      refreshUserProfile,
      primeApiToken,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      <AuthLoadingShell>{children}</AuthLoadingShell>
    </AuthContext.Provider>
  );
}
