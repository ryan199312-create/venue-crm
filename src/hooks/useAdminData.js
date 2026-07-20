import { useState, useEffect } from 'react';
import { db, functions } from '../core/firebase';
import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

export const INITIAL_FORM_STATE = {
  // 1. Basic Info & Contact
  orderId: '', eventName: '',
  date: new Date().toLocaleDateString('en-CA'),
  startTime: '18:00', servingTime: '', endTime: '23:00',
  selectedLocations: [], locationOther: '', venueLocation: '',
  eventType: '婚宴 (Wedding)', status: 'tentative',
  guestCount: '', tableCount: '',

  // Client Info
  clientName: '', companyName: '', clientPhone: '', clientEmail: '',
  secondaryContact: '', secondaryPhone: '', salesRep: '', address: '',

  // 2. F&B (Menu)
  menuType: '',
  menus: [{ id: Date.now(), title: '主菜單 (Main Menu)', content: '', price: '', priceType: 'perTable', qty: 1, applySC: true }],
  menuVersions: [], specialMenuReq: '', staffMeals: '', drinksPackage: '', preDinnerSnacks: '', allergies: '',
  servingStyle: '圍餐', platingFee: '', platingFeeApplySC: true, enableHandCarry: false, handCarryStaffQty: '',
  drinkAllocation: {},

  // 3. Billing
  menuPrice: '', menuPriceType: 'perTable',
  drinksPrice: '', drinksPriceType: 'perTable', drinksQty: 1, drinksApplySC: true,
  customItems: [], totalAmount: '',
  deposit1: '', deposit1Received: false, deposit1Proof: [], deposit1Date: '',
  deposit2: '', deposit2Received: false, deposit2Proof: [], deposit2Date: '',
  deposit3: '', deposit3Received: false, deposit3Proof: [], deposit3Date: '',
  balance: '', balanceReceived: false, balanceProof: [], balanceDate: '',
  paymentMethod: '現金', discount: '', serviceCharge: '10%', enableServiceCharge: true,
  balanceDueDateType: 'eventDay', balanceDueDateOverride: '', autoSchedulePayment: false,

  // 4. Venue & AV
  tableClothColor: '', chairCoverColor: '',
  floorplan: { bgImage: '', elements: [] },
  headTableColorType: 'same', headTableCustomColor: '',
  bridalRoom: false, bridalRoomHours: '',
  stageDecor: '', stageDecorPhoto: '', venueDecor: '', venueDecorPhoto: '',
  nameSignText: '', invitesQty: '',
  equipment: { podium: false, mic: false, micStand: false, cake: false, nameSign: false },
  decoration: { ceremonyService: false, ceremonyChairs: false, flowerPillars: false, guestBook: false, easel: false, mahjong: false, invites: false, wreaths: false },
  avRequirements: { ledBig: false, projBig: false, ledSmall: false, projSmall: false, spotlight: false, movingHead: false, entranceLight: false, tv60v: false, tv60h: false, mic: false, speaker: false },
  avOther: '', avNotes: '',

  // 5. Logistics
  deliveries: [],
  parkingInfo: { ticketQty: '', ticketHours: '', plates: '' },
  rundown: [ { id: 1, time: '18:00', activity: '恭候 (Reception)' }, { id: 2, time: '20:00', activity: '入席 (March In)' } ],
  busCharge: '', generalRemarks: '',
  busInfo: { enabled: false, arrivals: [{ id: 1, time: '18:30', location: '', plate: '' }], departures: [{ id: 1, time: '22:30', location: '', plate: '' }], customRoutes: [] },
  printSettings: { menu: { showPlatingFeeDisclaimer: true, validityDateOverride: '' }, quotation: { showClientInfo: true }, contract: { showChop: true } },
  emailSubject: '', emailBody: '', whatsappDraft: '',
};

/**
 * useAdminData
 * Manages tenant-specific dynamic data (Events, Users).
 * 🌟 Consolidated: Global Settings are now handled exclusively by AuthContext.
 */
export function useAdminData(appId) {
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [init, setInit] = useState({ events: false, users: false });

  useEffect(() => {
    if (!appId) return;
    setLoading(true);
    setInit({ events: false, users: false });

    // 1. Events Stream
    const qEvents = query(collection(db, 'artifacts', appId, 'private', 'data', 'events'));
    const unsubEvents = onSnapshot(qEvents, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(a.date) - new Date(b.date));
      setEvents(data);
      setInit(prev => ({ ...prev, events: true }));
    }, (err) => {
      setInit(prev => ({ ...prev, events: true }));
    });

    // 2. Users Stream
    const qUsers = query(collection(db, 'artifacts', appId, 'private', 'data', 'users'));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(data);
      setInit(prev => ({ ...prev, users: true }));
    }, (err) => {
      setInit(prev => ({ ...prev, users: true }));
    });

    return () => { unsubEvents(); unsubUsers(); };
  }, [appId]);

  useEffect(() => {
    if (init.events && init.users) {
      setLoading(false);
    }
  }, [init]);

  const saveEvent = async (formData, existingId = null) => {
    const eventData = {
      ...formData,
      updatedAt: serverTimestamp(),
      createdAt: existingId ? (formData.createdAt || serverTimestamp()) : serverTimestamp()
    };
    if (existingId) {
      await updateDoc(doc(db, 'artifacts', appId, 'private', 'data', 'events', existingId), eventData);
      return existingId;
    }
    // Pre-generate the ref so orderId can be derived and the doc written in a single op.
    const newRef = doc(collection(db, 'artifacts', appId, 'private', 'data', 'events'));
    await setDoc(newRef, { ...eventData, orderId: eventData.orderId || `EO-${newRef.id.slice(0, 5)}` });
    return newRef.id;
  };

  const deleteEvent = async (id) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'private', 'data', 'events', id));
  };

  const updateUserProfile = async (userId, updates) => {
    const userRef = doc(db, 'artifacts', appId, 'private', 'data', 'users', userId);
    await updateDoc(userRef, { ...updates, updatedAt: serverTimestamp() });
  };

  const updateUserRole = async (userId, newRole) => {
    const updateUserRoleSecure = httpsCallable(functions, 'updateUserRoleSecure');
    await updateUserRoleSecure({ appId, uid: userId, newRole });
  };

  const createUser = async (userData) => {
    const inviteUser = httpsCallable(functions, 'inviteUser');
    await inviteUser({ ...userData, appId });
  };

  return { events, users, loading, saveEvent, deleteEvent, updateUserProfile, updateUserRole, createUser };
}
