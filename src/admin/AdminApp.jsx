import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// Firebase
import { db, functions } from '../firebase';
import {
  doc,
  updateDoc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

// Context & Hooks
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAdminData, INITIAL_FORM_STATE } from '../hooks/useAdminData';
import { usePdfGenerator } from '../hooks/usePdfGenerator';
import { usePrinting } from '../hooks/usePrinting';
import { useFileUpload } from '../hooks/useFileUpload';
import { useConfirm } from '../hooks/useConfirm';
import { APP_ID } from '../env';

// Components
import { ConfirmationModal, Toast } from '../components/ui';

// Admin Views
import AdminSidebar from './AdminSidebar';
import AdminMobileHeader from './AdminMobileHeader';
import LoginView from './LoginView';

// Lazy Loaded Views
const DashboardView = React.lazy(() => import('./DashboardView'));
const EventsListView = React.lazy(() => import('./EventsListView'));
const SettingsView = React.lazy(() => import('./SettingsView'));
const DocsView = React.lazy(() => import('./DocsView'));
const EventFormModal = React.lazy(() => import('./EventFormModal'));
const DocumentRenderer = React.lazy(() => import('./DocumentRenderer'));
const AiAssistant = React.lazy(() => import('../components/AiAssistant'));
const DataAssistant = React.lazy(() => import('../components/DataAssistant'));

const appId = APP_ID;

export default function AdminApp() {
  const { user, userProfile, loading: authLoading, error: authError, login, loginGuest, signOut } = useAuth();
  const { toasts, addToast, removeToast } = useToast();
  const { events, saveEvent, deleteEvent } = useAdminData(appId);
  const { generatePdf } = usePdfGenerator();
  const { printData, printMode, isPreparingPrint, triggerLocalPrint } = usePrinting();
  const { uploadFile, uploadMultipleImages } = useFileUpload();
  const { confirmConfig, confirm, closeConfirm } = useConfirm();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isDataAiOpen, setIsDataAiOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // Settings State
  const [appSettings, setAppSettings] = useState({
    minSpendRules: [],
    defaultMenus: [],
    paymentRules: []
  });

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
        console.error(\"Fetch settings error\", e);
      }
    };
    fetchSettings();
  }, [user]);

  // Auto-complete past events
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
        } catch (err) {
          console.error(\"Auto-complete failed:\", err);
        }
      }
    });
  }, [events]);

  const openNewEventModal = () => {
    setEditingEvent(null);
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-CA').replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);

    setFormData({
      ...INITIAL_FORM_STATE,
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
    const safeData = {
      ...INITIAL_FORM_STATE,
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

  const handleSaveSettings = async (newSettings) => {
    try {
      const docRef = doc(db, 'artifacts', appId, 'private', 'data', 'settings', 'config');
      await setDoc(docRef, newSettings);
      setAppSettings(newSettings);
      addToast(\"Settings Saved Successfully!\", \"success\");
    } catch (err) {
      console.error(err);
      addToast(\"Failed to save settings\", \"error\");
    }
  };

  const handleRemoveProof = (key, urlToRemove) => {
    confirm(\"移除收據\", \"確定要移除此收據嗎？此操作無法還原。\", () => {
      setFormData(prev => {
        const existing = Array.isArray(prev[key]) ? prev[key] : (prev[key] ? [prev[key]] : []);
        return { ...prev, [key]: existing.filter(u => u !== urlToRemove) };
      });
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      const docId = await saveEvent(formData, editingEvent?.id);
      if (!editingEvent) {
        setEditingEvent({ id: docId, ...formData });
      }
      addToast(\"Saved & Calendar Synced\", \"success\");
    } catch (err) {
      console.error(err);
      addToast(\"Save failed\", \"error\");
    }
  };

  const handleDelete = async (id) => {
    if (!user) return;
    confirm(\"刪除訂單\", \"確定要刪除此訂單嗎？此操作無法還原。\", async () => {
      try {
        await deleteEvent(id);
        addToast(\"訂單已刪除\", \"success\");
      } catch (error) {
        addToast(\"刪除失敗\", \"error\");
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
    } catch (err) {
      console.error(\"Signature Save Error:\", err);
      addToast(\"自動儲存簽名失敗\", \"error\");
    }
  };

  const generateAndUploadPDF = async (docType) => {
    try {
      addToast(`正在雲端產生並儲存 ${docType} PDF...`, \"info\");
      const pdfData = await generatePdf({ docType, data: formData, appSettings });
      if (!pdfData || !pdfData.url) return null;
      addToast(\"文件產生並上傳成功！\", \"success\");
      return pdfData.url;
    } catch (error) {
      addToast(`文件上傳失敗: ${error.message}`, \"error\");
      return null;
    }
  };

  const handleSendEmail = async (docType = 'INVOICE') => {
    if (!formData.clientEmail) return addToast(\"客戶未提供 Email\", \"error\");
    const pdfUrl = await generateAndUploadPDF(docType);
    if (!pdfUrl) return;
    const subject = formData.emailSubject || `[璟瓏軒] ${formData.eventName} - ${docType}`;
    const baseBody = formData.emailBody || `你好 ${formData.clientName},\n\n感謝您選擇璟瓏軒。請查看以下連結以獲取您的最新文件。`;
    const finalBody = `${baseBody}\n\n📄 點擊下載文件 (Click to download document):\n${pdfUrl}\n\nKing Lung Heen`;
    const mailtoLink = `mailto:${formData.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(finalBody)}`;
    window.open(mailtoLink, '_blank');
    addToast(\"已開啟電郵草稿 (Email client opened)\", \"success\");
  };

  const handleSendSleekFlow = async (isTemplate = false, docType = 'INVOICE') => {
    let phone = formData.clientPhone?.replace(/[^0-9]/g, '');
    if (phone && phone.length === 8) phone = '852' + phone;
    if (!phone) return addToast(\"客戶未提供有效電話\", \"error\");
    try {
      addToast(\"正在處理文件...\", \"info\");
      addToast(`正在雲端產生 ${docType} 向量 PDF...`, \"info\");
      const pdfData = await generatePdf({ docType, data: formData, appSettings });
      if (!pdfData) return;
      const messageContent = formData.whatsappDraft || `你好 ${formData.clientName}，請查看您的文件。`;
      addToast(\"正在透過後端直接發送檔案...\", \"info\");
      const sendSleekFlow = httpsCallable(functions, 'sendSleekFlow');
      await sendSleekFlow({
        to: phone,
        messageContent: messageContent,
        pdfUrl: pdfData.url,
        fileName: pdfData.fileName,
        isTemplate: isTemplate
      });
      addToast(\"WhatsApp 檔案發送成功！\", \"success\");
    } catch (error) {
      console.error(\"SleekFlow 發送錯誤:\", error);
      addToast(`發送失敗: ${error.message}`, \"error\");
    }
  };

  const handleDownloadPDF = async (docType) => {
    addToast(`正在雲端產生 ${docType} 向量 PDF...`, \"info\");
    try {
      await generatePdf({ docType, data: formData, appSettings, download: true });
      addToast(`${docType} PDF 產生完成！`, \"success\");
    } catch (error) {
      console.error(\"PDF Download Error:\", error);
      addToast(`PDF 下載失敗: ${error.message}`, \"error\");
    }
  };

  if (authLoading) return <div className=\"min-h-screen flex items-center justify-center bg-slate-100 text-slate-500\"><Loader2 className=\"animate-spin mr-2\" /> 載入中 (Loading)...</div>;

  if (!user) {
    return <LoginView onLogin={login} onGuestLogin={loginGuest} error={authError} />;
  }

  return (
    <React.Suspense fallback={<div className=\"min-h-screen flex items-center justify-center bg-slate-100 text-slate-500\"><Loader2 className=\"animate-spin mr-2\" /> 載入組件 (Loading Components)...</div>}>
      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={closeConfirm}
      />

      {isPreparingPrint && (
        <div className=\"fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center text-slate-700 font-bold animate-in fade-in print:hidden\">
          <Loader2 className=\"animate-spin mb-4 text-blue-600\" size={48} />
          正在準備列印... (Preparing Print...)
        </div>
      )}

      <div className=\"fixed bottom-4 right-4 z-[100] flex flex-col space-y-2 print:hidden no-print\">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        ))}
      </div>

      <div className=\"min-h-screen bg-slate-50 text-slate-900 font-sans flex no-print\">
        <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} userProfile={userProfile} user={user} handleSignOut={signOut} />
        <main className=\"flex-1 flex flex-col min-w-0 overflow-hidden h-screen bg-slate-50\">
          <AdminMobileHeader activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className=\"flex-1 overflow-auto p-4 md:p-8\">
            <div className=\"max-w-7xl mx-auto space-y-6 pb-20\">
              {activeTab === 'dashboard' && <DashboardView events={events} openEditModal={openEditModal} setIsDataAiOpen={setIsDataAiOpen} />}
              {activeTab === 'events' && <EventsListView
                events={events}
                openNewEventModal={openNewEventModal}
                openEditModal={openEditModal}
                handleDelete={handleDelete}
              />}
              {activeTab === 'docs' && <DocsView />}
              {activeTab === 'settings' && (<SettingsView
                settings={appSettings}
                onSave={handleSaveSettings}
                addToast={addToast}
                onUploadProof={uploadFile}
              />
              )}
            </div>
          </div>
        </main>

        <EventFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editingEvent={editingEvent}
          formData={formData}
          setFormData={setFormData}
          appSettings={appSettings}
          onSubmit={handleSubmit}
          onSaveSignature={handleSaveSignature}
          onUploadProof={uploadFile}
          onMultiImageUpload={(files, fieldName) => uploadMultipleImages(files, fieldName, setFormData)}
          onRemoveProof={handleRemoveProof}
          addToast={addToast}
          onOpenAi={() => setIsAiOpen(true)}
          onPrintEO={() => triggerLocalPrint(formData, 'EO')}
          onPrintBriefing={() => triggerLocalPrint(formData, 'BRIEFING')}
          onPrintQuotation={() => triggerLocalPrint(formData, 'QUOTATION')}
          onPrintInvoice={() => triggerLocalPrint(formData, 'INVOICE')}
          onPrintReceipt={() => triggerLocalPrint(formData, 'RECEIPT')}
          onPrintContractEN={() => triggerLocalPrint(formData, 'CONTRACT')}
          onPrintContractCN={() => triggerLocalPrint(formData, 'CONTRACT_CN')}
          onOpenMenuPrint={(docType) => triggerLocalPrint(formData, docType || 'MENU_CONFIRM')}
          onPrintInternalNotes={() => triggerLocalPrint(formData, 'INTERNAL_NOTES')}
          onDownloadPDF={handleDownloadPDF}
          onSendSleekFlow={handleSendSleekFlow}
          onSendEmail={handleSendEmail}
          events={events}
        />
      </div>

      {isAiOpen && <AiAssistant formData={formData} setFormData={setFormData} onClose={() => setIsAiOpen(false)} />}
      {isDataAiOpen && <DataAssistant events={events} onClose={() => setIsDataAiOpen(false)} />}
      {printData && (
        <div className=\"hidden print:block print-only\">
          <DocumentRenderer data={printData} printMode={printMode} appSettings={appSettings} />
        </div>
      )}
    </React.Suspense>
  );
}
