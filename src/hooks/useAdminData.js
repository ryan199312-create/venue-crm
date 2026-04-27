import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'private', 'data', 'events'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(a.date) - new Date(b.date));
      setEvents(data);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Error:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [appId]);

  const saveEvent = async (formData, editingEventId) => {
    const privateRef = collection(db, 'artifacts', appId, 'private', 'data', 'events');
    const publicCalendarRef = collection(db, 'artifacts', appId, 'public_calendar');

    const cleanPhone = formData.clientPhone ? formData.clientPhone.replace(/[^0-9]/g, '').slice(-8) : '';
    const dataToSave = { ...formData, clientPhoneClean: cleanPhone };

    let docId = editingEventId;
    if (editingEventId) {
      await updateDoc(doc(privateRef, docId), dataToSave);
    } else {
      const newDoc = await addDoc(privateRef, { ...dataToSave, createdAt: serverTimestamp() });
      docId = newDoc.id;
    }

    await setDoc(doc(publicCalendarRef, docId), {
      date: formData.date,
      venue: formData.venueLocation || "Main Hall",
      isAvailable: formData.status === 'cancelled',
      status: formData.status
    });

    return docId;
  };

  const deleteEvent = async (id) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'private', 'data', 'events', id));
  };

  return { events, loading, saveEvent, deleteEvent };
}
