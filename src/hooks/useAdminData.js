import { useState, useEffect } from 'react';
import { db, auth, functions } from '../core/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

export const INITIAL_FORM_STATE = {
  // 1. Basic Info & Contact
  orderId: '',
  eventName: '',
  date: new Date().toLocaleDateString('en-CA'),
  startTime: '18:00',
  servingTime: '',
  endTime: '23:00',
  selectedLocations: [],
  locationOther: '',
  venueLocation: '',

  eventType: '婚宴 (Wedding)',
  status: 'tentative',
  guestCount: '',
  tableCount: '',

  // Client Info
  clientName: '',
  companyName: '',
  clientPhone: '',
  clientEmail: '',
  secondaryContact: '',
  secondaryPhone: '',
  salesRep: '',
  address: '',

  // 2. F&B (Menu)
  menuType: '',
  menus: [{
    id: Date.now(),
    title: '主菜單 (Main Menu)',
    content: '',
    price: '',
    priceType: 'perTable',
    qty: 1,
    applySC: true
  }],
  menuVersions: [],
  specialMenuReq: '',
  staffMeals: '',
  drinksPackage: '',
  preDinnerSnacks: '',
  allergies: '',
  servingStyle: '圍餐',
  platingFee: '',
  platingFeeApplySC: true,
  enableHandCarry: false,
  handCarryStaffQty: '',
  drinkAllocation: {},

  // 3. Billing
  menuPrice: '',
  menuPriceType: 'perTable',
  drinksPrice: '',
  drinksPriceType: 'perTable',
  drinksQty: 1,
  drinksApplySC: true,

  specialMenuReqShowClient: false,
  specialMenuReqShowInternal: true,
  allergiesShowClient: false,
  allergiesShowInternal: true,

  customItems: [],

  totalAmount: '',
  deposit1: '',
  deposit1Received: false,
  deposit1Proof: [],
  deposit1Date: '',
  deposit2: '',
  deposit2Received: false,
  deposit2Proof: [],
  deposit2Date: '',
  deposit3: '',
  deposit3Received: false,
  deposit3Proof: [],
  deposit3Date: '',
  balance: '',
  balanceReceived: false,
  balanceProof: [],
  balanceDate: '',
  paymentMethod: '現金',
  discount: '',
  serviceCharge: '10%',
  enableServiceCharge: true,
  balanceDueDateType: 'eventDay',
  balanceDueDateOverride: '',
  autoSchedulePayment: false,

  // 4. Venue & AV
  tableClothColor: '',
  chairCoverColor: '',
  floorplan: { bgImage: '', elements: [] },
  headTableColorType: 'same',
  headTableCustomColor: '',
  bridalRoom: false,
  bridalRoomHours: '',
  stageDecor: '',
  stageDecorPhoto: '',
  venueDecor: '',
  venueDecorPhoto: '',
  venueDecorShowClient: false,
  venueDecorShowInternal: true,

  nameSignText: '',
  invitesQty: '',
  equipment: {
    podium: false, mic: false, micStand: false, cake: false, nameSign: false
  },
  decoration: {
    ceremonyService: false, ceremonyChairs: false, flowerPillars: false, guestBook: false,
    easel: false, mahjong: false, invites: false, wreaths: false
  },
  decorationChairsQty: '',
  decorationOther: '',
  avRequirements: {
    ledBig: false, projBig: false,
    ledSmall: false, projSmall: false,
    spotlight: false, movingHead: false, entranceLight: false,
    tv60v: false, tv60h: false,
    mic: false, speaker: false
  },
  avOther: '',
  avNotes: '',

  // 5. Logistics
  deliveries: [],
  parkingInfo: {
    ticketQty: '',
    ticketHours: '',
    plates: ''
  },
  rundown: [
    { id: 1, time: '18:00', activity: '恭候 (Reception)' },
    { id: 2, time: '20:00', activity: '入席 (March In)' }
  ],
  busCharge: '',
  otherNotesShowClient: true,
  otherNotesShowInternal: true,
  generalRemarks: '',
  generalRemarksShowClient: true,
  generalRemarksShowInternal: true,

  busInfo: {
    enabled: false,
    arrivals: [{ id: 1, time: '18:30', location: '', plate: '' }],
    departures: [{ id: 1, time: '22:30', location: '', plate: '' }],
    customRoutes: []
  },
  printSettings: {
    menu: {
      showPlatingFeeDisclaimer: true,
      validityDateOverride: '',
    },
    quotation: {
      showClientInfo: true,
    },
    contract: {
      showChop: true
    }
  },
  emailSubject: '',
  emailBody: '',
  whatsappDraft: '',
};

export function useAdminData(appId) {
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [appSettings, setAppSettings] = useState({ minSpendRules: [], defaultMenus: [], paymentRules: [], rolePermissions: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'private', 'data', 'events'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(a.date) - new Date(b.date));
      setEvents(data);
    }, (err) => {
      console.error("Firestore Error:", err);
    });
    return () => unsubscribe();
  }, [appId]);

  // --- FETCH USERS ---
  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'private', 'data', 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(data);
      setLoading(false);
    }, (err) => {
      console.error("Users Firestore Error:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [appId]);

  // --- FETCH APP SETTINGS ---
  useEffect(() => {
    const settingsRef = doc(db, 'artifacts', appId, 'private', 'data', 'settings', 'config');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        setAppSettings(prev => ({ ...prev, ...doc.data() }));
      }
      setLoading(false);
    }, (err) => {
      console.error("Settings Firestore Error:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [appId]);

  const saveEvent = async (formData, existingId = null) => {
    const eventData = {
      ...formData,
      updatedAt: serverTimestamp(),
      createdAt: existingId ? (formData.createdAt || serverTimestamp()) : serverTimestamp()
    };

    if (existingId) {
      const docRef = doc(db, 'artifacts', appId, 'private', 'data', 'events', existingId);
      await updateDoc(docRef, eventData);
      
      // Update public calendar if needed
      const publicRef = doc(db, 'artifacts', appId, 'public_calendar', existingId);
      await setDoc(publicRef, {
        eventName: eventData.eventName,
        date: eventData.date,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        venueLocation: eventData.venueLocation,
        status: eventData.status,
        updatedAt: serverTimestamp()
      }, { merge: true });

      return existingId;
    } else {
      const colRef = collection(db, 'artifacts', appId, 'private', 'data', 'events');
      const docRef = await addDoc(colRef, eventData);
      
      // Create public calendar entry
      const publicRef = doc(db, 'artifacts', appId, 'public_calendar', docRef.id);
      await setDoc(publicRef, {
        eventName: eventData.eventName,
        date: eventData.date,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        venueLocation: eventData.venueLocation,
        status: eventData.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return docRef.id;
    }
  };

  const deleteEvent = async (id) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'private', 'data', 'events', id));
    await deleteDoc(doc(db, 'artifacts', appId, 'public_calendar', id));
  };

  const updateUserRole = async (userId, newRole) => {
    await updateUserProfile(userId, { role: newRole });
  };

  const updateUserProfile = async (userId, updates) => {
    try {
      // 🌟 Try Secure Cloud Function first
      const updateUserProfileSecure = httpsCallable(functions, 'updateUserProfileSecure');
      await updateUserProfileSecure({ uid: userId, ...updates });
    } catch (err) {
      console.warn("Cloud Function failed or missing, falling back to direct Firestore update:", err.message);
      // 🌟 FALLBACK: Direct Firestore update
      const userRef = doc(db, 'artifacts', appId, 'private', 'data', 'users', userId);
      await updateDoc(userRef, { ...updates, updatedAt: serverTimestamp() });
    }
  };

  const deleteUser = async (userId) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'private', 'data', 'users', userId));
  };

  const createUser = async (userData) => {
    // 🌟 SECURE: Use Cloud Function to create Auth user and set Role
    const inviteUser = httpsCallable(functions, 'inviteUser');
    await inviteUser({ 
      email: userData.email, 
      displayName: userData.displayName, 
      role: userData.role 
    });
  };

  return { events, users, loading, saveEvent, deleteEvent, appSettings, updateUserRole, updateUserProfile, deleteUser, createUser };
}
