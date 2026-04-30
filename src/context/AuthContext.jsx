import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, db } from '../core/firebase';
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  onAuthStateChanged,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { APP_ID } from '../core/env';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVenueId, setSelectedVenueId] = useState('all');
  const [outlets, setOutlets] = useState([]);

  const appId = APP_ID;

  // --- FETCH APP SETTINGS (FOR RBAC & OUTLETS) ---
  useEffect(() => {
    const settingsRef = doc(db, 'artifacts', appId, 'private', 'data', 'settings', 'config');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setAppSettings(data);
        setOutlets(data.outlets || []);
      }
    }, (err) => {
      console.warn("Settings access restricted (expected for guests):", err.message);
    });
    return () => unsubscribe();
  }, [appId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // 🌟 GET SECURE CUSTOM CLAIMS
        const idTokenResult = await u.getIdTokenResult(true);
        const claimRole = idTokenResult.claims.role;

        const userRef = doc(db, 'artifacts', appId, 'private', 'data', 'users', u.uid);
        const userSnap = await getDoc(userRef);

        let profileData = {
          uid: u.uid,
          lastLogin: serverTimestamp(),
          role: 'staff', // Default
          displayName: u.displayName || u.email || `User ${u.uid.slice(0, 4)}`,
          email: u.email || 'anonymous',
          accessibleVenues: [] // Default empty
        };

        if (userSnap.exists()) {
          const existingData = userSnap.data();
          // 🌟 TRUST FIRESTORE ROLE (Best for your current situation)
          profileData = { ...profileData, ...existingData, role: existingData.role || claimRole || 'staff' };
          await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
        } else {
          // If Firestore doesn't exist, use Claim or default
          profileData.role = claimRole || 'staff';
          await setDoc(userRef, profileData);
        }
        setUserProfile(profileData);
        setError("");
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [appId]);

  // --- REFRESH CLAIMS HELPER ---
  const refreshUserClaims = async () => {
    if (!user) return;
    const idTokenResult = await user.getIdTokenResult(true);
    const claimRole = idTokenResult.claims.role;
    if (claimRole) {
      setUserProfile(prev => ({ ...prev, role: claimRole }));
    }
  };

  // --- PERMISSION HELPER ---
  const hasPermission = useCallback((permissionId) => {
    if (!userProfile) return false;
    const role = userProfile.role || 'staff';
    if (role === 'admin') return true;

    // Check custom permissions from settings, fallback to defaults
    const permissionsMatrix = (appSettings?.rolePermissions && Object.keys(appSettings.rolePermissions).length > 0)
      ? appSettings.rolePermissions
      : DEFAULT_ROLE_PERMISSIONS;
      
    const roleConfig = permissionsMatrix[role];
    
    if (!roleConfig) {
      // Fallback to staff if role not found
      return DEFAULT_ROLE_PERMISSIONS.staff.permissions[permissionId] || false;
    }

    return roleConfig.permissions?.[permissionId] || false;
  }, [userProfile, appSettings]);

  // --- OUTLET HELPER ---
  const getVisibleVenues = useCallback((allOutlets) => {
    if (!userProfile) return [];
    if (hasPermission('manage_all_outlets')) return allOutlets;
    
    return allOutlets.filter(v => userProfile.accessibleVenues?.includes(v.id));
  }, [userProfile, hasPermission]);

  // --- AUTO-DEFAULT VENUE ---
  useEffect(() => {
    if (!loading && userProfile && outlets.length > 0) {
      if (selectedVenueId === 'all' && !hasPermission('manage_all_outlets')) {
        const visible = getVisibleVenues(outlets);
        if (visible.length > 0) {
          setSelectedVenueId(visible[0].id);
        }
      }
    }
  }, [loading, userProfile, outlets, hasPermission, getVisibleVenues, selectedVenueId]);

  const login = async (email, password) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      setError("登入失敗：密碼錯誤或找不到用戶。");
      setLoading(false);
      throw err;
    }
  };

  const loginGuest = async () => {
    try {
      setLoading(true);
      await signInAnonymously(auth);
    } catch (err) {
      setError("訪客登入失敗。");
      setLoading(false);
      throw err;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const value = {
    user,
    userProfile,
    appSettings,
    loading,
    error,
    login,
    loginGuest,
    signOut,
    hasPermission,
    refreshUserClaims,
    selectedVenueId,
    setSelectedVenueId,
    getVisibleVenues,
    outlets
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

