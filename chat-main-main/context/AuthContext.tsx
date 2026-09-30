'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  ref,
  get,
  set,
  update,
  onValue,
  onDisconnect,
} from 'firebase/database';
import { getFirebaseInstances, isFirebaseConfigured } from '@/lib/firebase';
import { UserProfile, Gender, AvatarType } from '@/lib/types';

export const FIXED_ADMIN_UID = 'EqI2wKJjJ0hQ0VWg8SaFssooWk43';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isConfigured: boolean;
  needsProfileSetup: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, gender: Gender) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  completeProfileSetup: (name: string, gender: Gender) => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isConfigured: false,
  needsProfileSetup: false,
  loginWithEmail: async () => {},
  signUpWithEmail: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
  completeProfileSetup: async () => {},
  updateProfileData: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean>(() => isFirebaseConfigured());
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [needsProfileSetup, setNeedsProfileSetup] = useState<boolean>(false);

  // Check admin status against fixed ADMIN_UID
  const verifyAdminStatus = useCallback(async (uid: string) => {
    if (uid === FIXED_ADMIN_UID) {
      setIsAdmin(true);
      return;
    }
    try {
      const res = await fetch('/api/admin/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });
      const data = await res.json();
      setIsAdmin(Boolean(data.isAdmin) || uid === FIXED_ADMIN_UID);
    } catch (e) {
      setIsAdmin(uid === FIXED_ADMIN_UID);
    }
  }, []);

  // Setup presence with Firebase RTDB
  const setupPresence = useCallback((uid: string) => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb) return () => {};

    const connectedRef = ref(rtdb, '.info/connected');
    const presenceRef = ref(rtdb, `presence/${uid}`);
    const userRef = ref(rtdb, `users/${uid}`);

    const unsubscribe = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        onDisconnect(presenceRef).set({
          online: false,
          lastSeen: Date.now(),
        });
        onDisconnect(userRef).update({
          online: false,
          lastSeen: Date.now(),
          updatedAt: Date.now(),
        });

        set(presenceRef, {
          online: true,
          lastSeen: Date.now(),
        });
        update(userRef, {
          online: true,
          lastSeen: Date.now(),
          updatedAt: Date.now(),
        });
      }
    });

    return () => {
      unsubscribe();
      set(presenceRef, {
        online: false,
        lastSeen: Date.now(),
      }).catch(() => {});
      update(userRef, {
        online: false,
        lastSeen: Date.now(),
        updatedAt: Date.now(),
      }).catch(() => {});
    };
  }, []);

  useEffect(() => {
    const configured = isFirebaseConfigured();
    if (!configured) {
      queueMicrotask(() => {
        setIsConfigured(false);
        setLoading(false);
      });
      return;
    }

    const { auth, rtdb } = getFirebaseInstances();
    if (!auth) {
      queueMicrotask(() => {
        setLoading(false);
      });
      return;
    }

    let presenceCleanup: (() => void) | null = null;
    let profileUnsubscribe: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser && rtdb) {
        await verifyAdminStatus(currentUser.uid);

        // Realtime User Profile Listener (Instantly detects if admin blocks or unblocks the user)
        const userRef = ref(rtdb, `users/${currentUser.uid}`);
        profileUnsubscribe = onValue(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.val() as UserProfile;
            setProfile(data);
            setNeedsProfileSetup(!data.gender || !data.name);
          } else {
            setNeedsProfileSetup(true);
          }
          setLoading(false);
        });

        presenceCleanup = setupPresence(currentUser.uid);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setNeedsProfileSetup(false);
        if (profileUnsubscribe) {
          profileUnsubscribe();
          profileUnsubscribe = null;
        }
        if (presenceCleanup) {
          presenceCleanup();
          presenceCleanup = null;
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (profileUnsubscribe) profileUnsubscribe();
      if (presenceCleanup) presenceCleanup();
    };
  }, [setupPresence, verifyAdminStatus, isConfigured]);

  const loginWithEmail = async (email: string, pass: string) => {
    const { auth } = getFirebaseInstances();
    if (!auth) throw new Error('Firebase Authentication is not initialized');
    await signInWithEmailAndPassword(auth, email.trim(), pass);
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    name: string,
    gender: Gender
  ) => {
    const { auth, rtdb } = getFirebaseInstances();
    if (!auth || !rtdb) throw new Error('Firebase is not initialized');

    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const uid = cred.user.uid;

    const validGender: Gender =
      gender?.toLowerCase() === 'female' ? 'Female' : 'Male';
    const avatarType: AvatarType = validGender === 'Female' ? 'female' : 'male';

    const newProfile: UserProfile = {
      uid,
      name: name.trim().slice(0, 80),
      email: email.trim().toLowerCase().slice(0, 320),
      gender: validGender,
      avatarType,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastSeen: Date.now(),
      online: true,
      banned: false,
      disabled: false,
      role: uid === FIXED_ADMIN_UID ? 'admin' : 'user',
    };

    await set(ref(rtdb, `users/${uid}`), newProfile);
    setProfile(newProfile);
    setNeedsProfileSetup(false);
  };

  const loginWithGoogle = async () => {
    const { auth, rtdb } = getFirebaseInstances();
    if (!auth || !rtdb) throw new Error('Firebase is not initialized');

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const googleUser = result.user;

    const userRef = ref(rtdb, `users/${googleUser.uid}`);
    const snap = await get(userRef);

    if (!snap.exists()) {
      setNeedsProfileSetup(true);
    } else {
      const data = snap.val() as UserProfile;
      setProfile(data);
      if (!data.gender) {
        setNeedsProfileSetup(true);
      }
    }
  };

  const completeProfileSetup = async (name: string, gender: Gender) => {
    const { rtdb } = getFirebaseInstances();
    if (!user || !rtdb) throw new Error('User not logged in or database unavailable');

    const validGender: Gender =
      gender?.toLowerCase() === 'female' ? 'Female' : 'Male';
    const avatarType: AvatarType = validGender === 'Female' ? 'female' : 'male';

    const newProfile: UserProfile = {
      uid: user.uid,
      name: (name.trim() || user.displayName || 'Community Member').slice(0, 80),
      email: (user.email || '').slice(0, 320),
      gender: validGender,
      avatarType,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastSeen: Date.now(),
      online: true,
      banned: false,
      disabled: false,
      role: user.uid === FIXED_ADMIN_UID ? 'admin' : 'user',
    };

    await set(ref(rtdb, `users/${user.uid}`), newProfile);
    setProfile(newProfile);
    setNeedsProfileSetup(false);
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    const { rtdb } = getFirebaseInstances();
    if (!user || !rtdb) return;

    const userRef = ref(rtdb, `users/${user.uid}`);
    const updated = {
      ...data,
      updatedAt: Date.now(),
    };
    await update(userRef, updated);
    setProfile((prev) => (prev ? { ...prev, ...updated } : null));
  };

  const logout = async () => {
    const { auth, rtdb } = getFirebaseInstances();
    if (user && rtdb) {
      try {
        await update(ref(rtdb, `presence/${user.uid}`), {
          online: false,
          lastSeen: Date.now(),
        });
        await update(ref(rtdb, `users/${user.uid}`), {
          online: false,
          lastSeen: Date.now(),
        });
      } catch (err) {
        console.error('Presence offline update on logout:', err);
      }
    }
    if (auth) {
      await signOut(auth);
    }
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
  };

  const resetPassword = async (email: string) => {
    const { auth } = getFirebaseInstances();
    if (!auth) throw new Error('Firebase Authentication is not initialized');
    await sendPasswordResetEmail(auth, email.trim());
  };

  const refreshProfile = async () => {
    if (user) {
      const { rtdb } = getFirebaseInstances();
      if (rtdb) {
        const snap = await get(ref(rtdb, `users/${user.uid}`));
        if (snap.exists()) {
          setProfile(snap.val());
        }
      }
      await verifyAdminStatus(user.uid);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        isConfigured,
        needsProfileSetup,
        loginWithEmail,
        signUpWithEmail,
        loginWithGoogle,
        logout,
        resetPassword,
        completeProfileSetup,
        updateProfileData,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
