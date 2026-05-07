import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, db } from '../core/firebase';
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCustomToken,
  onAuthStateChanged,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { getTenantId } from '../core/tenantResolver';
import { DEFAULT_ROLE_PERMISSIONS } from '../core/constants';


const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [appSettings, setAppSettings] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVenueId, setSelectedVenueId] = useState('all');

  const appId = getTenantId() || "vowsos-central";

  // 🌟 NEW: Fetch Settings at the highest level to drive the "Onboarding vs Dashboard" decision
  useEffect(() => {
    if (!appId) return;
    console.log("[AuthContext] Setting up snapshot for appId:", appId, "User:", user?.uid, "Role:", userProfile?.role);
    const settingsRef = doc(db, 'artifacts', appId, 'private', 'data', 'settings', 'config');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        console.log("[AuthContext] Settings loaded:", data.isSetupComplete ? "Complete" : "Incomplete");
        setAppSettings(data);
        setOutlets(data.outlets || []);
      } else {
        console.log("[AuthContext] Settings NOT FOUND, defaulting to incomplete");
        setAppSettings({ isSetupComplete: false });
        setOutlets([]);
      }
    }, (err) => {
      console.warn("[AuthContext] Settings access restricted:", err.message);
      // 🌟 Senior Fix: If we can't read settings (yet), assume incomplete to allow boot sequence
      if (!appSettings) {
        setAppSettings({ isSetupComplete: false });
      }
    });
    return () => unsubscribe();
  }, [appId, user?.uid, userProfile?.role]); // 🌟 Re-subscribe when identity or role changes!

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const idTokenResult = await u.getIdTokenResult(true);
          const claimRole = idTokenResult.claims.role;

          const userRef = doc(db, 'artifacts', appId, 'private', 'data', 'users', u.uid);
          const userSnap = await getDoc(userRef);

          let profileData = {
            uid: u.uid,
            lastLogin: serverTimestamp(),
            role: claimRole || 'staff',
            displayName: u.displayName || u.email || `User ${u.uid.slice(0, 4)}`,
            email: u.email || 'anonymous',
            accessibleVenues: [] 
          };

          if (userSnap.exists()) {
            const existingData = userSnap.data();
            // 🌟 Senior Fix: Prioritize high-privilege claims (super_admin, admin) over Firestore data
            let finalRole = existingData.role || claimRole || 'staff';
            if (claimRole === 'super_admin') finalRole = 'super_admin';
            else if (claimRole === 'admin') finalRole = 'admin';
            
            profileData = { ...profileData, ...existingData, role: finalRole };
            await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
          } else {
            await setDoc(userRef, profileData);
          }
          setUserProfile(profileData);
        } catch (err) {
          console.warn("User profile fetch skipped (expected for new registrations):", err.message);
          setUserProfile({ uid: u.uid, email: u.email, role: 'staff' });
        }
        setError("");
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [appId]);

  const login = async (email, password, isRegistering = false, clearOnly = false) => {
    if (clearOnly) {
      setError("");
      return;
    }
    try {
      setLoading(true);
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error(err);
      let msg = "登入失敗：密碼錯誤或找不到用戶。";
      if (err.code === 'auth/email-already-in-use') msg = "此電郵已被註冊，請直接登入。";
      if (err.code === 'auth/weak-password') msg = "密碼強度不足（需至少6位字元）。";
      if (err.code === 'auth/invalid-email') msg = "無效的電郵格式。";
      setError(msg);
      setLoading(false);
      throw err;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const hasPermission = useCallback((permission) => {
    if (userProfile?.role === 'super_admin' || userProfile?.role === 'admin') return true;
    
    // 🌟 Senior Fix: Role configuration has a nested 'permissions' object.
    const roleConfig = appSettings?.rolePermissions?.[userProfile?.role] || DEFAULT_ROLE_PERMISSIONS[userProfile?.role] || {};
    const permissions = roleConfig.permissions || {};
    
    return !!permissions[permission];
  }, [userProfile, appSettings]);

  const getVisibleVenues = useCallback((allOutlets) => {
    if (userProfile?.role === 'admin' || userProfile?.role === 'super_admin') return allOutlets;
    const allowedIds = userProfile?.accessibleVenues || [];
    return allOutlets.filter(o => allowedIds.includes(o.id));
  }, [userProfile]);

  const refreshUserClaims = async () => {
    if (!user) return;
    const idTokenResult = await user.getIdTokenResult(true);
    const claimRole = idTokenResult.claims.role;
    if (claimRole) {
      setUserProfile(prev => ({ ...prev, role: claimRole }));
    }
  };

  const value = {
    appId, user, userProfile, appSettings, loading, error, login, signOut,
    hasPermission, refreshUserClaims, selectedVenueId, setSelectedVenueId,
    getVisibleVenues, outlets
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
