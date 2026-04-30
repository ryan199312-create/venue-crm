import React, { useState, useEffect } from 'react';
import { Loader2, Rocket, ShieldAlert } from 'lucide-react';

// Firebase
import { db, auth, storage, functions } from '../core/firebase';
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import {
  doc,
  serverTimestamp,
  setDoc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';

// Components
import { ConfirmationModal, Toast, Card } from '../components/ui';

// Admin Views
import AdminSidebar from './AdminSidebar';
import AdminMobileHeader from './AdminMobileHeader';
import AdminLogin from './AdminLogin';
import { useAuth } from '../context/AuthContext';

// Lazy Loaded Views
const AdminDashboard = React.lazy(() => import('./AdminDashboard'));
const EventsListView = React.lazy(() => import('../features/events/components/EventsListView'));
const SettingsView = React.lazy(() => import('../features/settings/SettingsView'));
const DocumentListView = React.lazy(() => import('../features/documents/components/DocumentListView'));
const EventFormModal = React.lazy(() => import('../features/events/components/EventFormModal'));
const DocumentRouter = React.lazy(() => import('../features/documents/components/DocumentRouter'));
const AiAssistant = React.lazy(() => import('../components/AiAssistant'));
const AnalysisAssistant = React.lazy(() => import('../components/AnalysisAssistant'));
import { usePdfGenerator } from '../features/documents/hooks/usePdfGenerator';
import { useAdminData, INITIAL_FORM_STATE } from '../hooks/useAdminData';
import { APP_ID, INITIAL_AUTH_TOKEN } from '../core/env';
import { getScopedSettings } from '../services/helpers';

// ==========================================
// SECTION 1: CONFIGURATION & CONSTANTS
// ==========================================

const appId = APP_ID;

export default function AdminLayout() {
  const { 
    user, userProfile, loading: authLoading, error: authError, 
    hasPermission, login, loginGuest, signOut: handleSignOut, 
    refreshUserClaims, selectedVenueId, outlets 
  } = useAuth();
  const [printData, setPrintData] = useState(null);
  const [printMode, setPrintMode] = useState('EO');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [isDataAiOpen, setIsDataAiOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const { generatePdf } = usePdfGenerator();
  const { events, users, saveEvent, deleteEvent, appSettings, updateUserRole, updateUserProfile, deleteUser } = useAdminData(appId);

  // UI State for Toast & Modals
  const [toasts, setToasts] = useState([]);

  const handleClaimAdmin = async () => {
    if (!user) return;
    setIsClaiming(true);
    try {
      const updateUserRoleSecure = httpsCallable(functions, 'updateUserRoleSecure');
      await updateUserRoleSecure({ uid: user.uid, newRole: 'admin' });
      addToast("成功獲取管理員權限！請重新登入以刷新憑證。", "success");
      
      // Auto-refresh or force logout to refresh token
      setTimeout(() => handleSignOut(), 3000);
    } catch (err) {
      console.error(err);
      addToast("獲取權限失敗: " + err.message, "error");
    } finally {
      setIsClaiming(false);
    }
  };

  // --- Views ---
  const isHeadless = !authLoading && users.length > 0 && !users.some(u => u.role === 'admin');
  const hasNoAccess = user && !hasPermission('dashboard') && !hasPermission('events');
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const [activeTab, setActiveTab] = useState('dashboard'); // Default to Dashboard
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // --- Redirect if tab not allowed ---
  useEffect(() => {
    const tabs = [
      { id: 'dashboard', permission: 'dashboard' },
      { id: 'events', permission: 'events' },
      { id: 'docs', permission: 'docs' },
      { id: 'settings', permission: 'settings' }
    ];
    
    const currentTab = tabs.find(t => t.id === activeTab);
    if (currentTab && !hasPermission(currentTab.permission)) {
      const fallback = tabs.find(t => hasPermission(t.permission));
      if (fallback) setActiveTab(fallback.id);
    }
  }, [activeTab, hasPermission]);

  // --- Printing Handlers (Native Browser Print) ---
  const triggerLocalPrint = (mode) => {
    // 1. Show loader immediately to give user feedback
    setIsPreparingPrint(true);
    // 2. Set the data. This will trigger the slow, blocking render of DocumentRouter.
    // The user will see the loader overlay during this UI freeze.
    setPrintData(formData);
    setPrintMode(mode);
  };

  // This effect handles the actual printing AFTER the component has rendered
  useEffect(() => {
    if (isPreparingPrint && printData) {
      // 0. Setup listener to clear print data after print dialog is closed
      const handleAfterPrint = () => {
        setPrintData(null);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
      window.addEventListener('afterprint', handleAfterPrint);

      // 1. Give the browser time to paint the heavy DocumentRouter component
      setTimeout(() => {
        // 2. Hide the loading spinner BEFORE opening the print dialog.
        // This ensures React has completely finished all DOM mutations. Modifying the DOM while 
        // Chrome's "Save as PDF" spooler is running causes it to freeze permanently!
        setIsPreparingPrint(false);
        
        // 3. Wait a tiny bit for the spinner removal to commit to the DOM, then trigger print.
        requestAnimationFrame(() => {
          setTimeout(() => window.print(), 100); 
        });
      }, 800); // 800ms gives SVGs and high-res images plenty of time to load
    }
  }, [isPreparingPrint, printData]);

  const handlePrintEO = () => triggerLocalPrint('EO');
  const handlePrintReceipt = () => triggerLocalPrint('RECEIPT');
  const handlePrintInvoice = () => triggerLocalPrint('INVOICE');
  const handlePrintBriefing = () => triggerLocalPrint('BRIEFING');
  const handlePrintQuotation = () => triggerLocalPrint('QUOTATION');
  const handlePrintContractEN = () => triggerLocalPrint('CONTRACT');
  const handlePrintContractCN = () => triggerLocalPrint('CONTRACT_CN');
  const handleOpenMenuPrint = (docType) => triggerLocalPrint(docType || 'MENU_CONFIRM');
  const handlePrintInternalNotes = () => triggerLocalPrint('INTERNAL_NOTES');
  const handlePrintAddendum = () => triggerLocalPrint('ADDENDUM');
  const handlePrintFloorplan = () => triggerLocalPrint('FLOORPLAN');

  // --- Toast Helpers ---
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };
  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      const docRef = doc(db, 'artifacts', appId, 'private', 'data', 'settings', 'config');
      await setDoc(docRef, newSettings); // Saves to Firebase
      addToast("Settings Saved Successfully!", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to save settings", "error");
    }
  };

  useEffect(() => {
    if (events.length === 0) return;

    const todayStr = new Date().toLocaleDateString('en-CA');

    events.forEach(async (event) => {
      if (event.date && event.date < todayStr && (event.status === 'confirmed' || event.status === 'tentative')) {
        try {
          const eventRef = doc(db, 'artifacts', appId, 'private', 'data', 'events', event.id);
          await updateDoc(eventRef, { status: 'completed' });

          const publicRef = doc(db, 'artifacts', appId, 'public_calendar', event.id);
          await updateDoc(publicRef, { status: 'completed' });

          console.log(`Auto-completed past event: ${event.eventName}`);
        } catch (err) {
          console.error("Auto-complete failed:", err);
        }
      }
    });
  }, [events]);

  const openNewEventModal = () => {
    setEditingEvent(null);
    setPrintData(null);
    setPrintMode('EO');
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-CA').replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);

    // --- DEFAULT VENUE LOGIC ---
    const defaultVenueId = selectedVenueId !== 'all' ? selectedVenueId : (outlets.length === 1 ? outlets[0].id : '');
    const defaultVenue = outlets.find(o => o.id === defaultVenueId);
    const defaultVenueName = defaultVenue?.name || '';
    const scopedAppSettings = getScopedSettings(appSettings, defaultVenueId);

    setFormData({
      ...INITIAL_FORM_STATE,
      venueId: defaultVenueId,
      venueLocation: defaultVenueName, // Also set venueLocation for legacy compatibility
      selectedLocations: defaultVenueName ? [defaultVenueName] : [],
      floorplan: {
        // Only lock in floorplan defaults if a specific venue is already selected.
        // If 'all' is selected, we leave these empty so they can be dynamic 
        // when the user picks a venue inside the modal.
        bgImage: defaultVenueId ? (scopedAppSettings?.defaultFloorplan?.bgImage || '') : undefined,
        itemScale: defaultVenueId ? (scopedAppSettings?.defaultFloorplan?.itemScale || undefined) : undefined,
        zones: defaultVenueId ? (scopedAppSettings?.zonesConfig || []) : [],
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

    // Auto-resolve venueId if missing (for legacy data)
    let resolvedVenueId = event.venueId;
    if (!resolvedVenueId && event.venueLocation && outlets.length > 0) {
      const match = outlets.find(o => o.name === event.venueLocation || o.id === event.venueLocation);
      if (match) resolvedVenueId = match.id;
    }

    const scopedAppSettings = getScopedSettings(appSettings, resolvedVenueId);

    const safeData = {
      ...INITIAL_FORM_STATE,
      ...event,
      venueId: resolvedVenueId,
      floorplan: {
        bgImage: event.floorplan?.bgImage || scopedAppSettings?.defaultFloorplan?.bgImage || undefined,
        itemScale: event.floorplan?.itemScale || scopedAppSettings?.defaultFloorplan?.itemScale || undefined,
        zones: (event.floorplan?.zones && event.floorplan.zones.length > 0) ? event.floorplan.zones : (scopedAppSettings?.zonesConfig || []),
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

    if (formData.clientPhone) {
      formData.clientPhoneClean = String(formData.clientPhone).replace(/[^0-9]/g, '').slice(-8);
    }

    try {
      const docId = await saveEvent(formData, editingEvent?.id);
      if (!editingEvent) {
        setEditingEvent({ id: docId, ...formData });
      }
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
          await deleteEvent(id);
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
      const scopedAppSettings = getScopedSettings(appSettings, formData.venueId);
      const pdfData = await generatePdf({ docType, data: formData, appSettings: scopedAppSettings });
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
    const scopedAppSettings = getScopedSettings(appSettings, formData.venueId);
    const subject = formData.emailSubject || `[${scopedAppSettings.venueProfile?.nameZh || '璟瓏軒'}] ${formData.eventName} - ${docType}`;
    const baseBody = formData.emailBody || `你好 ${formData.clientName},\n\n感謝您選擇${scopedAppSettings.venueProfile?.nameZh || '璟瓏軒'}。請查看以下連結以獲取您的最新文件。`;

    // Append the Document Link to the body
    const finalBody = `${baseBody}\n\n📄 點擊下載文件 (Click to download document):\n${pdfUrl}\n\n${scopedAppSettings.venueProfile?.nameZh || 'King Lung Heen'}`;

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
      const scopedAppSettings = getScopedSettings(appSettings, formData.venueId);
      const pdfData = await generatePdf({ docType, data: formData, appSettings: scopedAppSettings });
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
      const scopedAppSettings = getScopedSettings(appSettings, formData.venueId);
      await generatePdf({ docType, data: formData, appSettings: scopedAppSettings, download: true });

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
    return <AdminLogin onLogin={login} onGuestLogin={loginGuest} error={authError} />;
  }

  // 🌟 BOOTSTRAP OVERLAY: If no admins exist, allow claiming the role
  if (hasNoAccess && isHeadless) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-8 animate-in zoom-in-95 duration-500">
          <div className="relative inline-block">
             <div className="absolute -inset-4 bg-indigo-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
             <ShieldAlert size={80} className="text-indigo-500 relative mx-auto" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight">系統初始化 (System Setup)</h1>
            <p className="text-slate-400 font-medium">偵測到目前系統尚未設定管理員權限</p>
          </div>

          <Card className="p-6 bg-slate-800 border-slate-700 text-left space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
                <Rocket size={20} />
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                您目前以 <span className="text-white font-bold">{user.email}</span> 登入。您可以點擊下方按鈕將此帳號升級為 <span className="text-indigo-400 font-bold">第一位管理員</span> 並解鎖所有功能。
              </p>
            </div>
            
            <button 
              onClick={handleClaimAdmin}
              disabled={isClaiming}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-xl font-black shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              {isClaiming ? <Loader2 className="animate-spin" /> : <><ShieldAlert size={20}/> 立即獲取管理權限 (Claim Admin)</>}
            </button>
          </Card>

          <button onClick={handleSignOut} className="text-slate-500 hover:text-white text-sm font-bold transition-colors">
            使用其他帳號登入
          </button>
        </div>
      </div>
    );
  }

  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500"><Loader2 className="animate-spin mr-2" /> 載入組件 (Loading Components)...</div>}>
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

      <div className="fixed bottom-4 right-4 z-[100] flex flex-col space-y-2 print:hidden">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        ))}
      </div>

      {/* Main App */}
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex print:hidden">
        {/* Sidebar */}
          <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} userProfile={userProfile} user={user} handleSignOut={handleSignOut} />

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen bg-slate-50">
            <AdminMobileHeader activeTab={activeTab} setActiveTab={setActiveTab} />

          <div className="flex-1 overflow-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6 pb-20">
              {activeTab === 'dashboard' && <AdminDashboard events={events} openEditModal={openEditModal} setIsDataAiOpen={setIsDataAiOpen} />}
              {activeTab === 'events' && <EventsListView 
                events={events} 
                openNewEventModal={openNewEventModal} 
                openEditModal={openEditModal} 
                handleDelete={handleDelete} 
              />}
              {activeTab === 'docs' && <DocumentListView />}
              {activeTab === 'settings' && (<SettingsView
                settings={appSettings}
                onSave={handleSaveSettings}
                addToast={addToast}
                onUploadProof={handleUploadProof}
                users={users}
                updateUserRole={updateUserRole}
                updateUserProfile={updateUserProfile}
                deleteUser={deleteUser}
              />
              )}            </div>
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
          users={users}
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
          onPrintAddendum={handlePrintAddendum}
          onPrintFloorplan={handlePrintFloorplan}
          onPrint={triggerLocalPrint} /* 🌟 Generic catch-all handler */
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
        <AnalysisAssistant
          events={events}
          onClose={() => setIsDataAiOpen(false)}
        />
      )}

      {/* 5. Print Output */}
      {printData && (
        <div className="absolute -left-[10000px] -top-[10000px] -z-50 print:static print:left-auto print:top-auto print:z-auto">
          <DocumentRouter data={printData} printMode={printMode} appSettings={getScopedSettings(appSettings, printData.venueId)} />
        </div>
      )}
    </React.Suspense>
  );
}
