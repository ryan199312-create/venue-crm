import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Loader2, Rocket, ShieldAlert } from 'lucide-react';

// Firebase & Core
import { db, storage, functions } from '../core/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLang } from '../i18n/language';
import { useAdminData, INITIAL_FORM_STATE } from '../hooks/useAdminData';
import { getScopedSettings } from '../services/helpers';

// Components
import { ConfirmationModal, Toast, Card } from '../components/ui';

// Admin Views
import AdminSidebar from './AdminSidebar';
import AdminMobileHeader from './AdminMobileHeader';
import AdminLogin from './AdminLogin';
import SetPasswordScreen from './SetPasswordScreen';
import VerifyEmailScreen from './VerifyEmailScreen';

// Lazy Components
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
    refreshUserClaims, tenantMeta
  } = useAuth();
  
  const {
    events, users, pendingUsers, loading: dataLoading, saveEvent, deleteEvent,
    updateUserProfile, updateUserRole, createUser, provisionUser, revokePending
  } = useAdminData(appId);

  const { toasts, addToast, removeToast } = useToast();
  const { generatePdf } = usePdfGenerator();
  const { L } = useLang();

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
  const savingRef = useRef(false);   // re-entrancy guard: blocks double-submit creating duplicates
  const [isClaiming, setIsClaiming] = useState(false);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [printMode, setPrintMode] = useState('EO');
  const [printLang, setPrintLang] = useState('en');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isDataAiOpen, setIsDataAiOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // --- CALCULATED STATES ---
  // 🌟 Senior Strategy: A system is headless if there are no admins in the users collection 
  // AND the current user isn't an admin either (covers the transition period).
  const isHeadless = hasInitialized && 
    (users.length === 0 || !users.some(u => u.role === 'admin' || u.role === 'super_admin')) &&
    userProfile?.role !== 'admin' && userProfile?.role !== 'super_admin';

  const hasNoAccess = hasInitialized && !hasPermission('dashboard') && !hasPermission('events');

  // --- Handlers ---
  const handleClaimAdmin = useCallback(async () => {
    if (!user || isClaiming) return;
    // Guard: never downgrade an already-privileged user. The platform owner
    // (super_admin) — or an existing tenant admin — visiting /admin must NOT be
    // reset to 'admin'. Check the LIVE token (userProfile can lag a token refresh).
    try {
      const token = await user.getIdTokenResult(true);
      if (token.claims.role === 'super_admin' || token.claims.role === 'admin') return;
    } catch (e) { /* if the token can't be read, fall through to the normal flow */ }
    setIsClaiming(true);
    try {
      console.log("[AdminLayout] Executing Auto-Claim for Admin role...");
      const updateUserRoleSecure = httpsCallable(functions, 'updateUserRoleSecure');
      await updateUserRoleSecure({ appId, uid: user.uid, newRole: 'admin' });
      
      await refreshUserClaims();
      addToast(L("歡迎！管理員權限已就緒 (Admin Access Granted)"), "success");
    } catch (err) {
      console.error("[AdminLayout] Auto-claim error:", err);
      addToast(L("權限獲取失敗，請重新整理 (Failed to obtain permissions — please refresh)"), "error");
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
      addToast(L("設定已儲存 (Settings saved)"), "success");
      // 🌟 Senior Strategy: Avoid window.location.reload() for settings updates.
      // The AuthContext onSnapshot will naturally update appSettings and trigger a re-render.
    } catch (err) {
      console.error("[AdminLayout] Save error:", err);
      addToast(L("儲存失敗 (Save failed)"), "error");
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
    if (savingRef.current) return;                  // block rapid double-click
    savingRef.current = true;
    try {
      const savedId = await saveEvent(formData, editingEvent?.id);
      // Promote a new event to edit mode so the next save UPDATES it, not duplicates it.
      if (!editingEvent?.id && savedId) setEditingEvent({ id: savedId, ...formData });
      addToast(L("訂單已儲存 (Order saved)"), "success");
    } catch (err) { addToast(L("儲存失敗 (Save failed)"), "error"); }
    finally { savingRef.current = false; }
  };

  const handleDeleteEvent = async (id) => {
    setConfirmConfig({
      isOpen: true, title: L("刪除訂單 (Delete Order)"), message: L("確定要刪除嗎？ (Are you sure you want to delete this?)"),
      onConfirm: async () => {
        try {
          await deleteEvent(id);
          addToast(L("訂單已刪除 (Order deleted)"), "success");
        } catch (error) { addToast(L("刪除失敗 (Delete failed)"), "error"); }
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
    addToast(`${L('正在產生 (Generating)')} ${docType} PDF...`, "info");
    try {
      const scopedAppSettings = getScopedSettings(appSettings, formData.venueId);
      await generatePdf({ docType, data: formData, appSettings: scopedAppSettings, download: true });
      addToast(L("產生完成 (Done)"), "success");
    } catch (error) { addToast(`${L('產生失敗 (Generation failed)')}: ${error.message}`, "error"); }
  };

  const triggerPrint = async (m, lang = 'en') => {
    addToast(L("正在優化列印性能 (Optimizing Performance)") + "...", "info");
    setIsPreparingPrint(true);
    setPrintData(formData);
    setPrintMode(m);
    setPrintLang(lang);
    
    try {
      // 1. Wait for React to render the hidden .print-container (a document renders in
      //    well under this; kept small for speed).
      await new Promise(resolve => setTimeout(resolve, 150));

      // 2. Setup Iframe
      let iframe = document.getElementById('print-iframe');
      if (iframe) iframe.remove();
      
      iframe = document.createElement('iframe');
      iframe.id = 'print-iframe';
      iframe.style.cssText = 'position:fixed; opacity:0; pointer-events:none; width:1px; height:1px; left:-100px; top:-100px;';
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow.document;
      const printContainer = document.querySelector('.print-container');
      
      if (!printContainer) {
        throw new Error("Print container not found");
      }

      const printContent = printContainer.innerHTML;
      
      // OPTIMIZATION: Extract Theme Variables to restore brand colors
      const rootStyle = getComputedStyle(document.documentElement);
      const themeVars = `
        :root {
          --brand-primary: ${rootStyle.getPropertyValue('--brand-primary') || '#4F46E5'};
          --brand-secondary: ${rootStyle.getPropertyValue('--brand-secondary') || '#1e293b'};
          --brand-accent: ${rootStyle.getPropertyValue('--brand-accent') || '#8b5cf6'};
        }
      `;

      // MORE AGGRESSIVE CSS PRUNING: Only grab styles that are likely needed
      const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
      const appStyles = styleElements
        .map(s => {
          const html = s.outerHTML;
          // Skip obviously irrelevant or massive third-party styles that don't affect layout
          if (html.includes('google-analytics') || html.includes('hot-update') || html.includes('vite/client')) return '';
          if (s.tagName === 'LINK' && (html.includes('fontawesome') || html.includes('inter-font'))) return '';
          return html;
        })
        .join('\n');

      // 3. Inject content with optimized Paged.js and counters
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print - ${formData.orderId}</title>
            <meta charset="UTF-8">
            ${appStyles}
            <style>
              ${themeVars}
              
              /* NATIVE FONT LOADING */
              @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap');
              
              /* RESET & BASE */
              body { 
                font-family: 'Noto Sans TC', sans-serif !important; 
                margin: 0 !important; 
                padding: 0 !important; 
                background: white !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              .print-container { 
                display: block !important; 
                position: static !important; 
                width: 100% !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              /* PAGED.JS ENGINE CONFIGURATION */
              @page {
                size: A4;
                margin: 15mm 15mm 15mm 15mm;

                @bottom-left {
                  content: element(footerLeft);
                  font-size: 8px;
                  color: #64748b;
                  font-family: sans-serif;
                  text-transform: uppercase;
                  border-top: 0.5pt solid #cbd5e1;
                  padding-top: 1.5mm;
                  white-space: nowrap;
                }

                @bottom-right {
                  content: "Page " counter(page) " of " counter(pages);
                  font-size: 8px;
                  color: #0f172a;
                  font-family: sans-serif;
                  font-weight: bold;
                  border-top: 0.5pt solid #cbd5e1;
                  padding-top: 1.5mm;
                  text-align: right;
                }
              }

              /* MAP DATA TO PAGED.JS ELEMENTS */
              .running-footer-left { position: running(footerLeft); }
              
              /* HIDE SOURCE ELEMENTS ONLY AFTER RUNNING */
              .pagedjs-footer-source { 
                position: absolute;
                top: 0;
                left: 0;
                visibility: hidden;
                height: 0;
                width: 0;
                overflow: hidden;
              }

              .page-break { page-break-after: always !important; break-after: page !important; }
              .break-inside-avoid { break-inside: avoid !important; }
              .print-page { box-shadow: none !important; margin: 0 !important; }

              /* PREVENT TRAILING BLANK PAGES */
              @page:blank { display: none !important; }
            </style>
          </head>
          <body>
            <div class="print-container">
              ${printContent}
            </div>
            
            <script src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"></script>
            <script>
              window.PagedConfig = {
                auto: true,
                after: (flow) => {
                  // Ensure all images are loaded before printing
                  const images = document.querySelectorAll('img');
                  const imagePromises = Array.from(images).map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise(resolve => {
                      img.onload = resolve;
                      img.onerror = resolve; // Continue even on error
                    });
                  });

                  Promise.all(imagePromises).then(() => {
                    // Wait for fonts (so Chinese renders) then print — no fixed buffer.
                    const go = () => requestAnimationFrame(() => {
                      window.print();
                      window.parent.postMessage('print_done', '*');
                    });
                    (document.fonts && document.fonts.ready ? document.fonts.ready.then(go) : go());
                  });
                }
              };
              
              // Fallback: if Paged.js never fires its after() hook, print anyway.
              setTimeout(() => {
                window.print();
                window.parent.postMessage('print_done', '*');
              }, 3500);
            </script>
          </body>
        </html>
      `);
      doc.close();

      // 4. Cleanup Listener
      const handleMessage = (event) => {
        if (event.data === 'print_done') {
          setIsPreparingPrint(false);
          setPrintData(null);
          window.removeEventListener('message', handleMessage);
          
          // Cleanup iframe after a delay
          setTimeout(() => {
            const frame = document.getElementById('print-iframe');
            if (frame) frame.remove();
          }, 1000);
        }
      };
      window.addEventListener('message', handleMessage);

    } catch (err) {
      console.error("Print Error:", err);
      addToast(L("列印啟動失敗，請再試一次 (Printing failed — please try again)"), "error");
      setIsPreparingPrint(false);
    }
  };

  // ==========================================
  // RENDER LOGIC
  // ==========================================

  // 1. Initial Load
  if (!hasInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 text-slate-500">
        <Loader2 className="animate-spin mb-4 text-indigo-600" size={48} />
        <p className="font-bold text-xs uppercase tracking-widest text-slate-400">{L('正在啟動 VowsOS (Loading)')}...</p>
      </div>
    );
  }

  // 2. Auth Check
  if (!user) {
    return <AdminLogin onLogin={login} error={authError} appSettings={appSettings} />;
  }

  // 2a. Profile still resolving right after login (user set, profile not loaded yet).
  // Show a spinner rather than briefly flashing a false "Access Denied / Guest".
  if (!userProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 text-slate-500">
        <Loader2 className="animate-spin mb-4 text-indigo-600" size={48} />
        <p className="font-bold text-xs uppercase tracking-widest text-slate-400">{L('載入中 (Loading)')}...</p>
      </div>
    );
  }

  // 2b. First login for an invited account: force setting a real password before anything else.
  if (userProfile?.mustChangePassword) {
    return <SetPasswordScreen email={user?.email} onSignOut={handleSignOut} />;
  }

  // 2c. Suspended tenant: freeze everyone except the platform super_admin.
  if (tenantMeta?.status === 'suspended' && userProfile?.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <Card className="p-8 max-w-md w-full text-center">
          <ShieldAlert className="mx-auto text-amber-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-slate-800 mb-2">{L('帳戶已暫停 (Account Suspended)')}</h2>
          <p className="text-slate-500 mb-6 font-medium">{L('此場地帳戶目前已被暫停使用。如有疑問，請聯絡平台管理員。 (This venue account is currently suspended. Please contact the platform administrator.)')}</p>
          <button onClick={handleSignOut} className="w-full bg-slate-800 text-white px-6 py-3 rounded-xl font-bold transition-all hover:bg-slate-700 active:scale-95">{L('登出 (Sign Out)')}</button>
        </Card>
      </div>
    );
  }

  // 2d. Owner accounts must verify their email before full access.
  if (userProfile?.requiresEmailVerification && !user?.emailVerified) {
    return <VerifyEmailScreen email={user?.email} onSignOut={handleSignOut} />;
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
  if (hasNoAccess) {
    console.log("[AdminLayout] Access DENIED for user:", user?.email, "Role:", userProfile?.role);
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <Card className="p-8 max-w-md w-full text-center">
          <ShieldAlert className="mx-auto text-rose-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-slate-800 mb-2">{L('存取被拒 (Access Denied)')}</h2>
          <div className="text-slate-500 mb-6 space-y-2">
            <p className="font-medium">{L('您目前沒有權限存取管理介面。 (You do not currently have permission to access the admin console.)')}</p>
            <p className="text-xs bg-slate-50 p-2 rounded border">
              {L('帳號 (Account)')}: {user?.email}<br/>
              {L('身分 (Role)')}: {userProfile?.role || 'Guest'}
            </p>
            <p className="text-[10px] text-slate-400">{L('請聯絡系統管理員為您分配權限。 (Please contact your system administrator to be assigned permissions.)')}</p>
          </div>
          <button onClick={handleSignOut} className="w-full bg-slate-800 text-white px-6 py-3 rounded-xl font-bold transition-all hover:bg-slate-700 active:scale-95">{L('安全登出 (Sign Out)')}</button>
        </Card>
      </div>
    );
  }

  // 5. FINAL PRODUCTION DASHBOARD
  // 🌟 NO FLICKER: If we reached here, user has access and setup is complete (or onboarding is shown as overlay).
  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 font-sans flex overflow-hidden">
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
              {activeTab === 'settings' && (<SettingsView settings={appSettings} onSave={(s) => setDoc(doc(db, 'artifacts', appId, 'private', 'data', 'settings', 'config'), s, { merge: true })} addToast={addToast} users={users} pendingUsers={pendingUsers} updateUserProfile={updateUserProfile} updateUserRole={updateUserRole} createUser={createUser} provisionUser={provisionUser} revokePending={revokePending} deleteUser={(id) => updateDoc(doc(db, 'artifacts', appId, 'private', 'data', 'users', id), { role: 'deleted' })} />)}
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
          onUploadProof={async (f) => { const sRef = ref(storage, `receipts/${appId}/${Date.now()}_${f.name}`); await uploadBytes(sRef, f); return await getDownloadURL(sRef); }}
          onMultiImageUpload={async (files, fieldName) => {
            const newUrls = [];
            for (let i = 0; i < files.length; i++) {
              const storageRef = ref(storage, `images/${appId}/${Date.now()}_${files[i].name}`);
              await uploadBytes(storageRef, files[i]);
              const url = await getDownloadURL(storageRef);
              newUrls.push(url);
            }
            if (newUrls.length > 0) setFormData(prev => ({ ...prev, [fieldName]: [...(prev[fieldName] || []), ...newUrls] }));
          }}
          onRemoveProof={(key, url) => setConfirmConfig({ isOpen: true, title: L('移除收據 (Remove Receipt)'), message: L('確定嗎？ (Are you sure?)'), onConfirm: () => setFormData(p => ({ ...p, [key]: p[key].filter(u => u !== url) })) })}
          addToast={addToast} onOpenAi={() => setIsAiOpen(true)} 
          onPrint={triggerPrint}
        />
        {isAiOpen && <AiAssistant formData={formData} setFormData={setFormData} onClose={() => setIsAiOpen(false)} />}
        {isDataAiOpen && <AnalysisAssistant events={events} onClose={() => setIsDataAiOpen(false)} />}
        {printData && (
          <div className="print-container absolute -left-[10000px] -top-[10000px] -z-50 print:static print:left-auto print:top-auto print:z-auto">
            <DocumentRouter data={printData} printMode={printMode} lang={printLang} appSettings={getScopedSettings(appSettings, printData.venueId)} />
          </div>
        )}
      </React.Suspense>
    </div>
  );
}
