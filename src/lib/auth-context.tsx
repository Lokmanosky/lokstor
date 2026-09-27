'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User, signOut as firebaseSignOut, getRedirectResult } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: 'admin' | 'customer' | null;
  isAdmin: boolean;
  loading: boolean;
  profileLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  isAdmin: false,
  loading: true,
  profileLoading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    // Handle Google redirect auth for mobile
    getRedirectResult(auth).catch(() => {});

    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);

      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!u) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      const userDocRef = doc(db, 'users', u.uid);

      try {
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) {
          // Default role is ALWAYS 'customer'. Only owner email defaults to admin.
          const isOwner = u.email?.toLowerCase() === 'loktech.dz@gmail.com';
          const defaultRole: 'admin' | 'customer' = isOwner ? 'admin' : 'customer';

          const newProfile: UserProfile = {
            uid: u.uid,
            email: u.email || '',
            displayName: u.displayName || u.email?.split('@')[0] || 'عميل',
            role: defaultRole,
            createdAt: Date.now(),
            lastLoginAt: Date.now(),
          };
          await setDoc(userDocRef, newProfile);
        } else {
          // Update lastLoginAt without modifying role!
          setDoc(userDocRef, { lastLoginAt: Date.now() }, { merge: true }).catch(() => {});
        }
      } catch (err) {
        console.error('Error fetching/creating user doc in Firestore:', err);
      }

      // Real-time listener: when admin modifies "role" in Firebase Console, it reflects immediately!
      unsubProfile = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile(data);
        } else {
          const isOwner = u.email?.toLowerCase() === 'loktech.dz@gmail.com';
          setProfile({
            uid: u.uid,
            email: u.email || '',
            displayName: u.displayName || '',
            role: isOwner ? 'admin' : 'customer',
            createdAt: Date.now(),
          });
        }
        setProfileLoading(false);
      }, (err) => {
        console.error('onSnapshot user error:', err);
        setProfileLoading(false);
      });
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  };

  const isOwner = user?.email?.toLowerCase() === 'loktech.dz@gmail.com';
  const role: 'admin' | 'customer' = profile?.role || (isOwner ? 'admin' : 'customer');
  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider value={{ user, profile, role, isAdmin, loading, profileLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
