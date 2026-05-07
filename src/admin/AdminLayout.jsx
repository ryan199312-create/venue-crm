import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Rocket, ShieldAlert } from 'lucide-react';

// Firebase & Core
import { db, storage, functions } from '../core/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAdminData, INITIAL_FORM_STATE } from '../hooks/useAdminData';
import { getScopedSettings } from '../services/helpers';

// Components
import { ConfirmationModal, Toast, Card } from '../components/ui';

// Admin Views
import AdminSidebar from './AdminSidebar';
import AdminMobileHeader from './AdminMobileHeader';
import AdminLogin from './AdminLogin';

// Lazy Components
const OnboardingWizard = React.lazy(() => import('../features/onboarding/OnboardingWizard'));
const AdminDashboard = React.lazy(() => import('./AdminDashboard'));
const EventsListView = React.lazy(() => import('../features/events/components/EventsListView'));
const SettingsView = React.lazy(() => import('../features/settings/SettingsView'));
const DocumentationHub = React.lazy(() => import('../features/documents/components/DocumentationHub'));
const EventFormModal = React.lazy(() => import('../features/events/components/EventFormModal'));
const DocumentRouter = React.lazy(() => import('../features/documents/components/DocumentRouter'));
const AiAssistant = React.lazy(() => import('../components/AiAssistant'));
const AnalysisAssistant = React.lazy(() => import('../components/AnalysisAssistant'));

import { usePdfGenerator } from '../features/documents/hooks/usePdfGenerator';

/**
 * AdminLayout
 * The primary container for the tenant administration experience.
 * 🌟 Senior Strategy: Strict Conditional Rendering to prevent UI flashes.
 */
export default function AdminLayout() {
  const { 
    appId, user, userProfile, appSettings, loading: authLoading, error: authError, 
    hasPermission, login, signOut: handleSignOut, outlets, selectedVenueId,
    refreshUserClaims
  } = useAuth();
  
  const { 
    events, users, loading: dataLoading, saveEvent, deleteEvent, 
    updateUserProfile, createUser 
  } = useAdminData(appId);

  const { toasts, addToast, removeToast } = useToast();
  const { generatePdf } = usePdfGenerator();

  // --- Persistent Initialization Tracker ---
  const [hasInitialized, setHasInitialized] = useState(false);
  useEffect(() => {
    // Wait for core foundation
    if (!authLoading && appSettings !== null) {
      // Small delay to ensure users list (for headless check) is also ready
      if (!dataLoading) {
        setHasInitialized(true);
      }
    }
  }, [authLoading, appSettings, dataLoading]);

  // UI States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [printMode, setPrintMode] = useState('EO');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isDataAiOpen, setIsDataAiOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // --- CALCULATED STATES ---
  // 🌟 Senior Strategy: A system is headless if there are no admins in the users collection 
  // AND the current user isn't an admin either (covers the transition period).
  const isHeadless = hasInitialized && 
    (users.length === 0 || !users.some(u => u.role === 'admin' || u.role === 'super_admin')) &&
    userProfile?.role !== 'admin' && userProfile?.role !== 'super_admin';

  const needsOnboarding = hasInitialized && appSettings?.isSetupComplete === false;
  const hasNoAccess = hasInitialized && !hasPermission('dashboard') && !hasPermission('events');

  // --- Handlers ---
  const handleClaimAdmin = useCallback(async () => {
    if (!user || isClaiming) return;
    setIsClaiming(true);
    try {
      console.log("[AdminLayout] Executing Auto-Claim for Admin role...");
      const updateUserRoleSecure = httpsCallable(functions, 'updateUserRoleSecure');
      await updateUserRoleSecure({ appId, uid: user.uid, newRole: 'admin' });
      
      await refreshUserClaims();
      addToast("歡迎！管理員權限已就緒 (Admin Access Granted)", "success");
    } catch (err) {
      console.error("[AdminLayout] Auto-claim error:", err);
      addToast("權限獲取失敗，請重新整理", "error");
    } finally {
      setIsClaiming(false);
    }
  }, [appId, user, isClaiming, refreshUserClaims]);

  // --- Silent Auto-Promotion Logic ---
  useEffect(() => {
    if (isHeadless && user && !isClaiming) {
      handleClaimAdmin();
    }
  }, [isHeadless, user, isClaiming, handleClaimAdmin]);

  const handleSaveSettings = async (newSettings) => {
    try {
      console.log("[AdminLayout] Saving settings...", newSettings);
      const docRef = doc(db, 'artifacts', appId, 'private', 'data', 'settings', 'config');
      await setDoc(docRef, newSettings, { merge: true });
      addToast("設定已儲存！", "success");
      // 🌟 Senior Strategy: Avoid window.location.reload() for settings updates.
      // The AuthContext onSnapshot will naturally update appSettings and trigger a re-render.
    } catch (err) { 
      console.error("[AdminLayout] Save error:", err);
      addToast("儲存失敗", "error"); 
    }
  };

  const openNewEventModal = () => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-CA').replace(/-/g, '');
    const defaultVenueId = selectedVenueId !== 'all' ? selectedVenueId : (outlets.length === 1 ? outlets[0].id : '');
    const defaultVenue = outlets.find(o => o.id === defaultVenueId);
    const scopedAppSettings = getScopedSettings(appSettings, defaultVenueId);

    setFormData({
      ...INITIAL_FORM_STATE,
      venueId: defaultVenueId,
      venueLocation: defaultVenue?.name || '',
      orderId: `EO-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`,
      salesRep: userProfile?.displayName || user?.email || '',
      date: today.toLocaleDateString('en-CA'),
      floorplan: {
        bgImage: scopedAppSettings?.defaultFloorplan?.bgImage,
        zones: scopedAppSettings?.zonesConfig || [],
        elements: []
      }
    });
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
    setFormData({ ...INITIAL_FORM_STATE, ...event });
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e) => {
    if (e) e.preventDefault();
    try {
      await saveEvent(formData, editingEvent?.id);
      addToast("訂單已儲存", "success");
    } catch (err) { addToast("儲存失敗", "error"); }
  };

  const handleDeleteEvent = async (id) => {
    setConfirmConfig({
      isOpen: true, title: "刪除訂單", message: "確定要刪除嗎？",
      onConfirm: async () => {
        try {
          await deleteEvent(id);
          addToast("訂單已刪除", "success");
        } catch (error) { addToast("刪除失敗", "error"); } 
        finally { setConfirmConfig({ ...confirmConfig, isOpen: false }); }
      }
    });
  };

  const handleSaveSignature = async (docType, base64, role) => {
    if (!editingEvent) return;
    try {
      const updateData = {
        [`signatures.${docType}.${role}`]: base64,
        [`signatures.${docType}.${role}Date`]: new Date().toISOString()
      };
      await updateDoc(doc(db, 'artifacts', appId, 'private', 'data', 'events', editingEvent.id), updateData);
    } catch (err) { console.error("Signature Save Error:", err); }
  };

  const handleDownloadPDF = async (docType) => {
    addToast(`正在產生 ${docType} PDF...`, "info");
    try {
      const scopedAppSettings = getScopedSettings(appSettings, formData.venueId);
      await generatePdf({ docType, data: formData, appSettings: scopedAppSettings, download: true });
      addToast("產生完成！", "success");
    } catch (error) { addToast(`產生失敗: ${error.message}`, "error"); }
  };

  const triggerPrint = (m) => {
    setIsPreparingPrint(true);
    setPrintData(formData);
    setPrintMode(m);
    setTimeout(() => { setIsPreparingPrint(false); window.print(); }, 800);
  };

  // ==========================================
  // RENDER LOGIC
  // ==========================================

  // 1. Initial Load
  if (!hasInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 text-slate-500">
        <Loader2 className="animate-spin mb-4 text-indigo-600" size={48} />
        <p className="font-bold text-xs uppercase tracking-widest text-slate-400">正在啟動 VowsOS (Loading)...</p>
      </div>
    );
  }

  // 2. Auth Check
  if (!user) {
    return <AdminLogin onLogin={login} error={authError} appSettings={appSettings} />;
  }

  // 3. BOOTSTRAP OVERLAY (Strict Early Return)
  // 🌟 Senior Strategy: If no admins exist, show a passive initialization screen.
  // The useEffect will handle the promotion automatically.
  if (isHeadless) {
    console.log("[AdminLayout] System is HEADLESS. Initializing...");
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-6 text-white text-center z-[4900]">
         <div className="max-w-md w-full space-y-8 animate-in zoom-in-95">
            <Rocket size={80} className="text-indigo-500 mx-auto animate-bounce" />
            <h1 className="text-3xl font-black">正在初始化工作區</h1>
            <p className="text-slate-400 font-medium">請稍候，我們正在為您配置管理權限...</p>
            <div className="flex justify-center">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
         </div>
      </div>
    );
  }

  // 4. NO ACCESS (Authenticated but no permission to any main view)
  // 🌟 Senior Fix: Only show "No Access" if onboarding isn't also required.
  if (hasNoAccess && !needsOnboarding) {
    console.log("[AdminLayout] Access DENIED for user:", user?.email, "Role:", userProfile?.role);
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <Card className="p-8 max-w-md w-full text-center">
          <ShieldAlert className="mx-auto text-rose-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-slate-800 mb-2">存取被拒 (Access Denied)</h2>
          <div className="text-slate-500 mb-6 space-y-2">
            <p className="font-medium">您目前沒有權限存取管理介面。</p>
            <p className="text-xs bg-slate-50 p-2 rounded border">
              帳號: {user?.email}<br/>
              身分: {userProfile?.role || 'Guest'}
            </p>
            <p className="text-[10px] text-slate-400">請聯絡系統管理員為您分配權限。</p>
          </div>
          <button onClick={handleSignOut} className="w-full bg-slate-800 text-white px-6 py-3 rounded-xl font-bold transition-all hover:bg-slate-700 active:scale-95">安全登出</button>
        </Card>
      </div>
    );
  }

  // 5. FINAL PRODUCTION DASHBOARD
  // 🌟 NO FLICKER: If we reached here, user has access and setup is complete (or onboarding is shown as overlay).
  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 font-sans flex overflow-hidden">
      {/* ONBOARDING OVERLAY */}
      {/* 🌟 Senior Strategy: Render inside the main tree to maintain component identity and state. */}
      {needsOnboarding && (
        <div className="fixed inset-0 bg-slate-50 overflow-hidden z-[5000]">
          <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>}>
            <OnboardingWizard 
              appSettings={appSettings} 
              onSave={handleSaveSettings} 
              onUploadProof={async (f) => {
                  const sRef = ref(storage, `receipts/${Date.now()}_${f.name}`);
                  await uploadBytes(sRef, f);
                  return await getDownloadURL(sRef);
              }} 
              addToast={addToast} 
            />
          </React.Suspense>
        </div>
      )}

      <ConfirmationModal isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message} onConfirm={confirmConfig.onConfirm} onCancel={() => setConfirmConfig({ ...confirmConfig, isOpen: false })} />
      
      <div className="fixed bottom-4 right-4 z-[6000] flex flex-col space-y-2">
        {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />)}
      </div>

      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} userProfile={userProfile} user={user} handleSignOut={handleSignOut} />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen bg-slate-50 print:hidden">
        <AdminMobileHeader activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <React.Suspense fallback={<div className="p-12 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> 正在載入頁面組件...</div>}>
            <div className="max-w-7xl mx-auto space-y-6 pb-20">
              {activeTab === 'dashboard' && <AdminDashboard events={events} openEditModal={openEditModal} setIsDataAiOpen={setIsDataAiOpen} />}
              {activeTab === 'events' && <EventsListView events={events} openNewEventModal={openNewEventModal} openEditModal={openEditModal} handleDelete={handleDeleteEvent} />}
              {activeTab === 'docs' && <DocumentationHub />}
              {activeTab === 'settings' && (<SettingsView settings={appSettings} onSave={(s) => setDoc(doc(db, 'artifacts', appId, 'private', 'data', 'settings', 'config'), s, { merge: true })} addToast={addToast} users={users} updateUserProfile={updateUserProfile} deleteUser={(id) => updateDoc(doc(db, 'artifacts', appId, 'private', 'data', 'users', id), { role: 'deleted' })} />)}
            </div>
          </React.Suspense>
        </div>
      </main>

      <React.Suspense fallback={null}>
        <EventFormModal 
          isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} 
          editingEvent={editingEvent} formData={formData} setFormData={setFormData} 
          appSettings={appSettings} users={users} events={events}
          onSubmit={handleSaveEvent} onSaveSignature={handleSaveSignature}
          onUploadProof={async (f) => { const sRef = ref(storage, `receipts/${Date.now()}_${f.name}`); await uploadBytes(sRef, f); return await getDownloadURL(sRef); }}
          onMultiImageUpload={async (files, fieldName) => {
            const newUrls = [];
            for (let i = 0; i < files.length; i++) {
              const storageRef = ref(storage, `images/${Date.now()}_${files[i].name}`);
              await uploadBytes(storageRef, files[i]);
              const url = await getDownloadURL(storageRef);
              newUrls.push(url);
            }
            if (newUrls.length > 0) setFormData(prev => ({ ...prev, [fieldName]: [...(prev[fieldName] || []), ...newUrls] }));
          }}
          onRemoveProof={(key, url) => setConfirmConfig({ isOpen: true, title: '移除收據', message: '確定嗎？', onConfirm: () => setFormData(p => ({ ...p, [key]: p[key].filter(u => u !== url) })) })}
          addToast={addToast} onOpenAi={() => setIsAiOpen(true)} 
          onPrint={triggerPrint} onDownloadPDF={handleDownloadPDF} 
          onSendSleekFlow={async (isT, docT) => {
            let ph = formData.clientPhone?.replace(/[^0-9]/g, ''); if (ph?.length === 8) ph = '852' + ph;
            const pdfD = await generatePdf({ docType: docT, data: formData, appSettings: getScopedSettings(appSettings, formData.venueId) });
            const api = httpsCallable(functions, 'sendSleekFlow');
            await api({ to: ph, messageContent: `Hi ${formData.clientName}`, pdfUrl: pdfD.url, fileName: pdfD.fileName, isTemplate: isT });
            addToast("WhatsApp Sent", "success");
          }}
          onSendEmail={async (docT) => {
            const pdfD = await generatePdf({ docType: docT, data: formData, appSettings: getScopedSettings(appSettings, formData.venueId) });
            window.open(`mailto:${formData.clientEmail}?subject=File&body=${pdfD.url}`, '_blank');
          }}
        />
        {isAiOpen && <AiAssistant formData={formData} setFormData={setFormData} onClose={() => setIsAiOpen(false)} />}
        {isDataAiOpen && <AnalysisAssistant events={events} onClose={() => setIsDataAiOpen(false)} />}
        {printData && (
          <div className="absolute -left-[10000px] -top-[10000px] -z-50 print:static print:left-auto print:top-auto print:z-auto">
            <DocumentRouter data={printData} printMode={printMode} appSettings={getScopedSettings(appSettings, printData.venueId)} />
          </div>
        )}
      </React.Suspense>
    </div>
  );
}
