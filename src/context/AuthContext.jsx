import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  onAuthStateChanged,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { APP_ID, INITIAL_AUTH_TOKEN } from '../env';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const appId = APP_ID;

  useEffect(() => {
    const initAuth = async () => {
      if (INITIAL_AUTH_TOKEN) {
        try {
          await signInWithCustomToken(auth, INITIAL_AUTH_TOKEN);
        } catch (e) {
          console.error("Auth token failed", e);
        }
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, 'artifacts', appId, 'private', 'data', 'users', u.uid);
        const userSnap = await getDoc(userRef);

        let profileData = {
          uid: u.uid,
          lastLogin: serverTimestamp(),
          role: 'staff',
          displayName: u.displayName || u.email || `User ${u.uid.slice(0, 4)}`,
          email: u.email || 'anonymous'
        };

        if (userSnap.exists()) {
          const existingData = userSnap.data();
          profileData = { ...profileData, role: existingData.role };
        } else {
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
    loading,
    error,
    login,
    loginGuest,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
