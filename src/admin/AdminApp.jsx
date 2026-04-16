import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { renderToString } from 'react-dom/server';

// Firebase
import { db, auth, storage } from '../firebase';
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
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
import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';

// Components
import AiAssistant from '../components/AiAssistant';
import DataAssistant from '../components/DataAssistant';
import { ConfirmationModal, MenuPrintSelector, Toast } from '../components/ui';

// Admin Views
import AdminSidebar from './AdminSidebar';
import AdminMobileHeader from './AdminMobileHeader';
import DashboardView from './DashboardView';
import EventsListView from './EventsListView';
import SettingsView from './SettingsView';
import LoginView from './LoginView';
import EventFormModal from './EventFormModal';
import DocumentRenderer from './DocumentRenderer';
import { usePdfGenerator } from '../hooks/usePdfGenerator';

// ==========================================
// SECTION 1: CONFIGURATION & CONSTANTS
// ==========================================

const appId = typeof __app_id !== 'undefined' ? __app_id : "my-venue-crm";

export default function AdminApp() {
  const [user, setUser] = useState(null);
  const [printData, setPrintData] = useState(null);
  const [printMode, setPrintMode] = useState('EO');
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [isDataAiOpen, setIsDataAiOpen] = useState(false);

  const { generatePdf } = usePdfGenerator();

  // UI State for Toast & Modals
  const [toasts, setToasts] = useState([]);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard'); // Default to Dashboard
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);


  // Settings State
  const [appSettings, setAppSettings] = useState({
    minSpendRules: [],
    defaultMenus: [],
    paymentRules: []
  });

  // User Management State
  const [userProfile, setUserProfile] = useState(null);

  // EO Form State
  const initialFormState = {
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

    // 2. F&B (Menu) - UPDATED STRUCTURE
    menuType: '',
    menus: [{
      id: Date.now(),
      title: '主菜單 (Main Menu)',
      content: '',
      price: '',           // NEW: Price per menu
      priceType: 'perTable', // NEW: perTable, perPerson, total
      qty: 1,
      applySC: true        // NEW: Service Charge Toggle per menu
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
    enableHandCarry: false, // Toggle for Hand Carry
    handCarryStaffQty: '',  // Number of staff
    drinkAllocation: {},


    // 3. Billing - UPDATED STRUCTURE
    menuPrice: '', // Kept for legacy compatibility, but main logic moves to 'menus' array
    menuPriceType: 'perTable',
    drinksPrice: '',
    drinksPriceType: 'perTable',
    drinksQty: 1,
    drinksApplySC: true, // NEW: Service Charge Toggle for Drinks

    specialMenuReqShowClient: false,
    specialMenuReqShowInternal: true,
    allergiesShowClient: false,
    allergiesShowInternal: true,

    customItems: [], // NEW: Array for Extra Items { name, price, qty, applySC }

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
    enableServiceCharge: true, // NEW: Master switch for Service Charge
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
    stageDecorPhoto: '', // NEW: Photo URL
    venueDecor: '',      // NEW: General Decor Text
    venueDecorPhoto: '', // NEW: Photo URL
    venueDecorShowClient: false,
    venueDecorShowInternal: true,

    nameSignText: '',    // NEW: Text for name sign
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
    deliveries: [], // Array: { id, unit, time, items }

    parkingInfo: {
      ticketQty: '',    // Changed from 'qty'
      ticketHours: '',  // Changed from 'hours'
      plates: ''
    },
    // ✅ NEW: Rundown
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

    // ✅ UPDATED BUS STRUCTURE (Arrays for multiple buses)
    busInfo: {
      enabled: false,
      arrivals: [{ id: 1, time: '18:30', location: '', plate: '' }],
      departures: [{ id: 1, time: '22:30', location: '', plate: '' }],
      customRoutes: []
    },
    printSettings: {
      menu: {
        showPlatingFeeDisclaimer: true, // Default: Show the $800 fee line
        validityDateOverride: '',       // Default: Empty (Use auto-calc)
      },
      quotation: {
        showClientInfo: true,           // Default: Show Client Name/Details
      },
      contract: {
        showChop: true                  // Default: Show Company Chop on Contract
      }
    },
    //AI feature
    emailSubject: '',
    emailBody: '',
    whatsappDraft: '',
  };

  const [formData, setFormData] = useState(initialFormState);

  // --- Printing Handlers (Native Browser Print) ---
  const triggerLocalPrint = (mode) => {
    // 1. Show loader immediately to give user feedback
    setIsPreparingPrint(true);
    // 2. Set the data. This will trigger the slow, blocking render of DocumentRenderer.
    // The user will see the loader overlay during this UI freeze.
    setPrintData(formData);
    setPrintMode(mode);
  };

  // This effect handles the actual printing AFTER the component has rendered
  useEffect(() => {
    if (isPreparingPrint && printData) {
      const handleAfterPrint = () => {
        // Reset state after print dialog is closed or cancelled.
        setPrintData(null);
        setIsPreparingPrint(false);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
      window.addEventListener('afterprint', handleAfterPrint);

      // Use requestAnimationFrame to ensure the DOM is painted before printing
      requestAnimationFrame(() => {
        setTimeout(() => window.print(), 50); // A small delay to let the browser fully render the complex doc
      });
    }
  }, [isPreparingPrint, printData]);

  const handlePrintEO = () => triggerLocalPrint('EO');
  const handlePrintReceipt = () => triggerLocalPrint('RECEIPT');
  const handlePrintInvoice = () => triggerLocalPrint('INVOICE');
  const handlePrintBriefing = () => triggerLocalPrint('BRIEFING');
  const handlePrintQuotation = () => triggerLocalPrint('QUOTATION');
  const handlePrintContractEN = () => triggerLocalPrint('CONTRACT');
  const handlePrintContractCN = () => triggerLocalPrint('CONTRACT_CN');
  const handleOpenMenuPrint = () => triggerLocalPrint('MENU_CONFIRM');
  const handlePrintInternalNotes = () => triggerLocalPrint('INTERNAL_NOTES');

  // --- Toast Helpers ---
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };
  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };


  // --- Auth Logic ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try {
          await signInWithCustomToken(auth, __initial_auth_token);
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
        setAuthError("");
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (email, password) => {
    try {
      setAuthLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      setAuthError("登入失敗：密碼錯誤或找不到用戶。");
      setAuthLoading(false);
    }
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      const docRef = doc(db, 'artifacts', appId, 'private', 'data', 'settings', 'config');
      await setDoc(docRef, newSettings); // Saves to Firebase
      setAppSettings(newSettings); // Updates local state
      addToast("Settings Saved Successfully!", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to save settings", "error");
    }
  };

  const handleGuestLogin = async () => {
    try {
      setAuthLoading(true);
      await signInAnonymously(auth);
    } catch (err) {
      setAuthError("訪客登入失敗。");
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  // Fetch Events
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'private', 'data', 'events'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(a.date) - new Date(b.date));
      setEvents(data);
    }, (err) => {
      console.error("Firestore Error:", err);
      addToast("Failed to sync events", "error");
    });
    return () => unsubscribe();
  }, [user]);
  useEffect(() => {
    if (events.length === 0) return;

    // Get today's date in strictly YYYY-MM-DD format (local timezone)
    const todayStr = new Date().toLocaleDateString('en-CA');

    events.forEach(async (event) => {
      // If the event date is strictly in the past, and it's not already completed or cancelled
      if (event.date && event.date < todayStr && (event.status === 'confirmed' || event.status === 'tentative')) {
        try {
          // 1. Update the main private database
          const eventRef = doc(db, 'artifacts', appId, 'private', 'data', 'events', event.id);
          await updateDoc(eventRef, { status: 'completed' });

          // 2. Update the public calendar (so SleekFlow knows the date is free again)
          const publicRef = doc(db, 'artifacts', appId, 'public_calendar', event.id);
          await updateDoc(publicRef, { status: 'completed' });

          console.log(`Auto-completed past event: ${event.eventName}`);
        } catch (err) {
          console.error("Auto-complete failed:", err);
        }
      }
    });
  }, [events]);
  // Fetch Settings
  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'artifacts', appId, 'private', 'data', 'settings', 'config');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const savedData = snap.data();
          setAppSettings(prev => ({
            ...prev,
            ...savedData,
            minSpendRules: savedData.minSpendRules || [],
            defaultMenus: savedData.defaultMenus || []
          }));
        }
      } catch (e) {
        console.error("Fetch settings error", e);
      }
    };
    fetchSettings();
  }, [user]);

  const openNewEventModal = () => {
    setEditingEvent(null);
    setPrintData(null);
    setPrintMode('EO');
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-CA').replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);

    setFormData({
      ...initialFormState,
      floorplan: {
        bgImage: appSettings?.defaultFloorplan?.bgImage || '',
        itemScale: appSettings?.defaultFloorplan?.itemScale || 40,
        zones: appSettings?.defaultFloorplan?.zones || [],
        elements: []
      },
      menus: [{ id: Date.now(), title: '主菜單 (Main Menu)', content: '' }],
      orderId: `EO-${dateStr}-${randomSuffix}`,
      salesRep: userProfile?.displayName || user?.email || '',
      date: today.toLocaleDateString('en-CA')
    });
    setIsModalOpen(true);
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
    setPrintData(null);
    setPrintMode('EO');
    const safeData = {
      ...initialFormState,
      ...event,
      floorplan: {
        bgImage: event.floorplan?.bgImage || appSettings?.defaultFloorplan?.bgImage || '',
        itemScale: event.floorplan?.itemScale || appSettings?.defaultFloorplan?.itemScale || 40,
        zones: (event.floorplan?.zones && event.floorplan.zones.length > 0) ? event.floorplan.zones : (appSettings?.defaultFloorplan?.zones || []),
        elements: event.floorplan?.elements || []
      },
      selectedLocations: event.selectedLocations || (event.venueLocation ? [event.venueLocation] : []),
      menus: (event.menus && event.menus.length > 0)
        ? event.menus
        : [{ id: 'default', title: '主菜單 (Main Menu)', content: event.menuType || '' }],
      menuPrice: event.menuPrice || '',
      menuPriceType: event.menuPriceType || 'perTable',
      drinksPrice: event.drinksPrice || '',
      drinksPriceType: event.drinksPriceType || 'perTable',
      stageDecorPhotos: event.stageDecorPhotos || (event.stageDecorPhoto ? [event.stageDecorPhoto] : []),
      venueDecorPhotos: event.venueDecorPhotos || (event.venueDecorPhoto ? [event.venueDecorPhoto] : []),
    };
    setFormData(safeData);

    setIsModalOpen(true);
  };

  const handleUploadProof = async (file) => {
    if (!user) throw new Error("Not logged in");
    const storageRef = ref(storage, `receipts/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleMultiImageUpload = async (files, fieldName) => {
    if (!user || !files || files.length === 0) return;

    addToast(`正在上傳 ${files.length} 張圖片... (Uploading...)`, "info");
    const newUrls = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const storageRef = ref(storage, `images/${Date.now()}_${file.name}`);
      try {
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newUrls.push(url);
      } catch (e) {
        addToast(`上傳 ${file.name} 失敗`, "error");
      }
    }

    if (newUrls.length > 0) {
      setFormData(prev => ({
        ...prev,
        [fieldName]: [...(prev[fieldName] || []), ...newUrls]
      }));
      addToast("圖片上傳完成！", "success");
    }
  };

  const handleRemoveProof = (key, urlToRemove) => {
    setConfirmConfig({
      isOpen: true,
      title: "移除收據",
      message: "確定要移除此收據嗎？此操作無法還原。",
      onConfirm: () => {
        setFormData(prev => {
          const existing = Array.isArray(prev[key]) ? prev[key] : (prev[key] ? [prev[key]] : []);
          return { ...prev, [key]: existing.filter(u => u !== urlToRemove) };
        });
        setConfirmConfig({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    const privateRef = collection(db, 'artifacts', appId, 'private', 'data', 'events');
    const publicCalendarRef = collection(db, 'artifacts', appId, 'public_calendar');

    try {
      let docId;
      
      // Create a clean phone number for backend querying
      const cleanPhone = formData.clientPhone ? formData.clientPhone.replace(/[^0-9]/g, '').slice(-8) : '';
      const dataToSave = { ...formData, clientPhoneClean: cleanPhone };

      if (editingEvent) {
        docId = editingEvent.id;
        await updateDoc(doc(privateRef, docId), dataToSave);
      } else {
        const newDoc = await addDoc(privateRef, { ...dataToSave, createdAt: serverTimestamp() });
        docId = newDoc.id;
          
          // Mark as editing so subsequent saves in the same modal session update instead of creating duplicates
          setEditingEvent({ id: docId, ...formData });
      }

      // --- SYNC TO PUBLIC CALENDAR FOR SLEEKFLOW ---
      await setDoc(doc(publicCalendarRef, docId), {
        date: formData.date,
        venue: formData.venueLocation || "Main Hall",
        // Only send 'busy' if the status is confirmed or tentative
        isAvailable: formData.status === 'cancelled' ? true : false,
        status: formData.status
      });

      addToast("Saved & Calendar Synced", "success");
    } catch (err) {
      console.error(err);
      addToast("Save failed", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!user) return;
    setConfirmConfig({
      isOpen: true,
      title: "刪除訂單",
      message: "確定要刪除此訂單嗎？此操作無法還原。",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'artifacts', appId, 'private', 'data', 'events', id));
          addToast("訂單已刪除", "success");
        } catch (error) {
          addToast("刪除失敗", "error");
        } finally {
          setConfirmConfig({ isOpen: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  // ==========================================
  // ✍️ SIGNATURE SAVING
  // ==========================================
  const handleSaveSignature = async (docType, base64, role) => {
    if (!editingEvent) return;
    try {
      const updateData = {
        [`signatures.${docType}.${role}`]: base64,
        [`signatures.${docType}.${role}Date`]: new Date().toISOString()
      };
      await updateDoc(doc(db, 'artifacts', appId, 'private', 'data', 'events', editingEvent.id), updateData);
    } catch (err) {
      console.error("Signature Save Error:", err);
      addToast("自動儲存簽名失敗", "error");
    }
  };

  // ==========================================
  // 📤 COMMUNICATION HANDLERS
  // ==========================================
  const generateAndUploadPDF = async (docType) => {
    try {
      addToast(`正在雲端產生並儲存 ${docType} PDF...`, "info");
      const pdfData = await generatePdf({ docType, data: formData, appSettings });
      if (!pdfData || !pdfData.url) return null;
      
      addToast("文件產生並上傳成功！", "success");
      return pdfData.url;

    } catch (error) {
      addToast(`文件上傳失敗: ${error.message}`, "error");
      return null;
    }
  };

  const handleSendEmail = async (docType = 'INVOICE') => {
    if (!formData.clientEmail) return addToast("客戶未提供 Email", "error");

    // 1. Generate & Upload PDF
    const pdfUrl = await generateAndUploadPDF(docType);
    if (!pdfUrl) return;

    // 2. Prepare Email Body
    const subject = formData.emailSubject || `[璟瓏軒] ${formData.eventName} - ${docType}`;
    const baseBody = formData.emailBody || `你好 ${formData.clientName},\n\n感謝您選擇璟瓏軒。請查看以下連結以獲取您的最新文件。`;

    // Append the Document Link to the body
    const finalBody = `${baseBody}\n\n📄 點擊下載文件 (Click to download document):\n${pdfUrl}\n\nKing Lung Heen`;

    // 3. Open Email Client
    const mailtoLink = `mailto:${formData.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(finalBody)}`;
    window.open(mailtoLink, '_blank');

    addToast("已開啟電郵草稿 (Email client opened)", "success");
  };
  

  // ==========================================
  // 📤 SLEEKFLOW HANDLER
  // ==========================================
  const handleSendSleekFlow = async (isTemplate = false, docType = 'INVOICE') => {
    let phone = formData.clientPhone?.replace(/[^0-9]/g, ''); 
    if (phone && phone.length === 8) phone = '852' + phone;

    if (!phone) return addToast("客戶未提供有效電話", "error");

    try {
      addToast("正在處理文件...", "info");
      addToast(`正在雲端產生 ${docType} 向量 PDF...`, "info");

      // 取得 PDF 雲端連結資料
      const pdfData = await generatePdf({ docType, data: formData, appSettings });
      if (!pdfData) return;

      const messageContent = formData.whatsappDraft || `你好 ${formData.clientName}，請查看您的文件。`;

      addToast("正在透過後端直接發送檔案...", "info");

      // 呼叫更新後的 Cloud Function
      const sendSleekFlow = httpsCallable(functions, 'sendSleekFlow');
      await sendSleekFlow({ 
        to: phone, 
        messageContent: messageContent,
        pdfUrl: pdfData.url,  // Pass the URL instead of base64
        fileName: pdfData.fileName,
        isTemplate: isTemplate
      });

      addToast("WhatsApp 檔案發送成功！", "success");
    } catch (error) {
      console.error("SleekFlow 發送錯誤:", error);
      addToast(`發送失敗: ${error.message}`, "error");
    }
  };

  // ==========================================
  // 📥 PDF DOWNLOAD HANDLER
  // ==========================================
  const handleDownloadPDF = async (docType) => {
    addToast(`正在雲端產生 ${docType} 向量 PDF...`, "info");
    
    try {
      await generatePdf({ docType, data: formData, appSettings, download: true });

      addToast(`${docType} PDF 產生完成！`, "success");
    } catch (error) {
      console.error("PDF Download Error:", error);
      addToast(`PDF 下載失敗: ${error.message}`, "error");
    }
  };

  // --- Views ---

  // --- Render Logic ---

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500"><Loader2 className="animate-spin mr-2" /> 載入中 (Loading)...</div>;

  if (!user) {
    return <LoginView onLogin={handleLogin} onGuestLogin={handleGuestLogin} error={authError} />;
  }

  return (
    <>
      {/* Modals & Toasts */}
      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig({ isOpen: false, title: '', message: '', onConfirm: null })}
      />

      {/* Print Preparation Overlay */}
      {isPreparingPrint && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center text-slate-700 font-bold animate-in fade-in print:hidden">
          <Loader2 className="animate-spin mb-4 text-blue-600" size={48} />
          正在準備列印... (Preparing Print...)
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-[100] flex flex-col space-y-2 print:hidden no-print">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        ))}
      </div>

      {/* Main App */}
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex no-print">
        {/* Sidebar */}
          <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} userProfile={userProfile} user={user} handleSignOut={handleSignOut} />

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen bg-slate-50">
            <AdminMobileHeader activeTab={activeTab} setActiveTab={setActiveTab} />

          <div className="flex-1 overflow-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6 pb-20">
              {activeTab === 'dashboard' && <DashboardView events={events} openEditModal={openEditModal} setIsDataAiOpen={setIsDataAiOpen} />}
              {activeTab === 'events' && <EventsListView 
                events={events} 
                openNewEventModal={openNewEventModal} 
                openEditModal={openEditModal} 
                handleDelete={handleDelete} 
              />}
              {activeTab === 'settings' && (<SettingsView
                settings={appSettings}
                onSave={handleSaveSettings}
                addToast={addToast}
                onUploadProof={handleUploadProof}
              />
              )}
            </div>
          </div>
        </main>

        {/* Modal */}
        <EventFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editingEvent={editingEvent}
          formData={formData}
          setFormData={setFormData}
          appSettings={appSettings}
          onSubmit={handleSubmit}
          onSaveSignature={handleSaveSignature}
          onUploadProof={handleUploadProof}
          onMultiImageUpload={handleMultiImageUpload}
          onRemoveProof={handleRemoveProof}
          addToast={addToast}
          onOpenAi={() => setIsAiOpen(true)}
          onPrintEO={handlePrintEO}
          onPrintBriefing={handlePrintBriefing}
          onPrintQuotation={handlePrintQuotation}
          onPrintInvoice={handlePrintInvoice}
          onPrintReceipt={handlePrintReceipt}
          onPrintContractEN={handlePrintContractEN}
          onPrintContractCN={handlePrintContractCN}
          onOpenMenuPrint={handleOpenMenuPrint}
          onPrintInternalNotes={handlePrintInternalNotes}
          onDownloadPDF={handleDownloadPDF}
          onSendSleekFlow={handleSendSleekFlow}
          onSendEmail={handleSendEmail}
          events={events}
        />
      </div>

      {/* ======================================================== */}
      {/* 1. AI Assistant Popup */}
      {isAiOpen && (
        <AiAssistant
          formData={formData}
          setFormData={setFormData}
          onClose={() => setIsAiOpen(false)}
        />
      )}

      {/* 2. Data Assistant Popup */}
      {isDataAiOpen && (
        <DataAssistant
          events={events}
          onClose={() => setIsDataAiOpen(false)}
        />
      )}

      {/* 5. Print Output */}
      {printData && (
        <div className="hidden print:block print-only">
          <DocumentRenderer data={printData} printMode={printMode} appSettings={appSettings} />
        </div>
      )}
    </>
  );
}