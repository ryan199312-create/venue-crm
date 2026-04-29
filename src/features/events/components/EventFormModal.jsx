import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, CreditCard, Monitor, Truck, PenTool, Printer, Sparkles, ChevronUp, Send, MessageCircle, Mail, Utensils
} from 'lucide-react';

import { Modal, VersionPreviewModal } from '../../../components/ui';
import { DEFAULT_DRINK_PACKAGES } from '../../../services/billingService';
import DocumentManager from '../../../components/DocumentManager';
import BasicDetailsTab from './BasicDetailsTab';
import LogisticsTab from './LogisticsTab';
import FoodAndBeverageTab from './FoodAndBeverageTab';
import BillingTab from '../../billing/BillingTab';
import VenueTab from '../../settings/VenueTab';
import PrintConfigTab from '../../settings/PrintConfigTab';
import InternalNotesTab from './RemarksTab';
import { useEventForm } from '../hooks/useEventForm';
import { useAI } from '../../../hooks/useAI';
import { useAuth } from '../../../context/AuthContext';

export default function EventFormModal({
  isOpen, onClose, editingEvent, formData, setFormData, appSettings, users,
  onSubmit, onSaveSignature, onUploadProof, onMultiImageUpload, onRemoveProof, addToast,
  onOpenAi, onPrintEO, onPrintBriefing, onPrintQuotation, onPrintInvoice, onPrintReceipt, onPrintInternalNotes,
  onPrintContractEN, onPrintContractCN, onOpenMenuPrint, onPrint,
  onSendSleekFlow, onSendEmail, events
}) {
  const { hasPermission, userProfile } = useAuth();
  const { generate } = useAI();
  const {
    billingSummary,
    updateFinanceState,
    handleInputChange,
    handlePriceChange,
    updateCustomItem,
    removeCustomItem,
    handleMenuChange,
    handleMenuAllocationChange,
    toggleMenuAllocation,
    handleApplyMenuPreset,
    addMenu,
    removeMenu,
    translatingMenuId,
    isTranslatingDrinks,
    handleTranslateMenu,
    handleTranslateDrinks,
    minSpendInfo,
    calculatePaymentTerms
  } = useEventForm(formData, setFormData, appSettings, editingEvent, addToast);

  // Internal UI State
  const [formTab, setFormTab] = useState('basic');
  const [showSendMenu, setShowSendMenu] = useState(false);
  const [showDocManager, setShowDocManager] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(null);
  const [highlightTarget, setHighlightTarget] = useState(null);
  const [drinkPackageType, setDrinkPackageType] = useState('');
  const [verifyingProofIdx, setVerifyingProofIdx] = useState(null);

  // Reset tabs and specific states when modal opens
  useEffect(() => {
    if (isOpen) {
      const tabs = [
        { id: 'basic', permission: 'tab_basic' },
        { id: 'fnb', permission: 'tab_fnb' },
        { id: 'billing', permission: 'tab_billing' },
        { id: 'venue', permission: 'tab_venue' },
        { id: 'logistics', permission: 'tab_logistics' },
        { id: 'remarks', permission: 'tab_remarks' },
        { id: 'printConfig', permission: 'tab_print' },
      ];
      const firstAllowedTab = tabs.find(t => hasPermission(t.permission));
      if (firstAllowedTab) {
        setFormTab(firstAllowedTab.id);
      } else {
        setFormTab('basic'); // Fallback
      }
      
      setShowSendMenu(false);
      setShowDocManager(false);
      if (editingEvent) {
        if (DEFAULT_DRINK_PACKAGES.includes(editingEvent.drinksPackage)) {
          setDrinkPackageType(editingEvent.drinksPackage);
        } else if (editingEvent.drinksPackage) {
          setDrinkPackageType('Other');
        } else {
          setDrinkPackageType('');
        }
      } else {
        setDrinkPackageType('');
      }
    }
  }, [isOpen, editingEvent, hasPermission]);

  // Allocation Jump Logic
  const jumpToAllocation = (target) => {
    setHighlightTarget(target);
    setFormTab('fnb');
  };

  useEffect(() => {
    if (formTab === 'fnb' && highlightTarget) {
      setTimeout(() => {
        if (highlightTarget.type === 'menu') {
          setFormData(prev => ({
            ...prev,
            menus: prev.menus.map(m => m.id === highlightTarget.id ? { ...m, showAllocation: true } : m)
          }));
          const el = document.getElementById(`menu-item-${highlightTarget.id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (highlightTarget.type === 'drinks') {
          setFormData(prev => ({ ...prev, showDrinkAllocation: true }));
          const el = document.getElementById('drinks-section');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setHighlightTarget(null);
      }, 100);
    }
  }, [formTab, highlightTarget, setFormData]);

  const restoreMenuSnapshot = (menuId, snapshot) => {
    setFormData(prev => ({
      ...prev,
      menus: prev.menus.map(m => {
        if (m.id === menuId) {
          return {
            ...m,
            content: snapshot.content,
            title: snapshot.title
          };
        }
        return m;
      })
    }));
      addToast(`已還原至版本: ${snapshot.name}`, "success");
    setPreviewVersion(null);
  };

  const deleteMenuSnapshot = (menuId, versionId) => {
    setFormData(prev => ({
      ...prev,
      menus: prev.menus.map(m => {
        if (m.id === menuId) {
          return {
            ...m,
            versions: (m.versions || []).filter(v => v.id !== versionId)
          };
        }
        return m;
      })
    }));
  };

  const saveMenuSnapshot = (menuId) => {
    const menuToSave = formData.menus?.find(m => m.id === menuId);
    if (!menuToSave) return addToast("沒有菜單可儲存", "error");

    const defaultName = `Ver ${(menuToSave.versions?.length || 0) + 1}`;
    let snapshotName = prompt("請輸入版本名稱 (Enter Version Name):", defaultName);
    if (snapshotName === null) return;
    if (snapshotName.trim() === "") snapshotName = defaultName;

    setFormData(prev => ({
      ...prev,
      menus: prev.menus.map(m => {
        if (m.id === menuId) {
          const newVersion = {
            id: Date.now(),
            name: snapshotName,
            content: m.content,
            title: m.title,
            timestamp: new Date().toISOString()
          };
          return {
            ...m,
            versions: [newVersion, ...(m.versions || [])]
          };
        }
        return m;
      })
    }));
    addToast(`已儲存: ${snapshotName}`, "success");
  };

  const moveMenu = (index, direction) => {
    setFormData(prev => {
      const newMenus = [...prev.menus];
      if (direction === 'up' && index > 0) [newMenus[index], newMenus[index - 1]] = [newMenus[index - 1], newMenus[index]];
      else if (direction === 'down' && index < newMenus.length - 1) [newMenus[index], newMenus[index + 1]] = [newMenus[index + 1], newMenus[index]];
      return { ...prev, menus: newMenus };
    });
  };

  const handleDrinkTypeChange = (e) => {
    const val = e.target.value;
    setDrinkPackageType(val);
    const preset = appSettings.defaultMenus.find(m => m.type === 'drink' && m.title === val);
    setFormData(prev => {
      let newData = { ...prev };
      if (preset) {
        newData = { ...newData, drinksPackage: preset.content, drinksPrice: preset.priceWeekday || preset.price || prev.drinksPrice, drinksPriceType: 'perPerson', drinksQty: prev.guestCount || 1, drinkAllocation: preset.allocation || {} };
      } else if (val === 'Other') {
        newData = { ...newData, drinksPackage: '' };
      } else {
        newData = { ...newData, drinksPackage: '', drinksPrice: '', drinkAllocation: {} };
      }
      return updateFinanceState(newData);
    });
  };

  const DocumentVisibilityToggles = ({ field, defaultClient, defaultInternal }) => {
    const clientKey = `${field}ShowClient`;
    const internalKey = `${field}ShowInternal`;
    const showClient = formData[clientKey] !== undefined ? formData[clientKey] : defaultClient;
    const showInternal = formData[internalKey] !== undefined ? formData[internalKey] : defaultInternal;

    return (
      <div className="flex items-center gap-4 mt-2 mb-3 ml-1">
        <label className="flex items-center text-xs text-slate-500 cursor-pointer hover:text-slate-700 transition-colors select-none">
          <input type="checkbox" checked={showClient} onChange={e => setFormData(prev => ({ ...prev, [clientKey]: e.target.checked }))} className="mr-1.5 rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5" />
          顯示於客戶文件 (Client Docs)
        </label>
        <label className="flex items-center text-xs text-slate-500 cursor-pointer hover:text-slate-700 transition-colors select-none">
          <input type="checkbox" checked={showInternal} onChange={e => setFormData(prev => ({ ...prev, [internalKey]: e.target.checked }))} className="mr-1.5 rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5" />
          顯示於內部文件 (Internal Docs)
        </label>
      </div>
    );
  };

  useEffect(() => {
    if (!isOpen || !formData.clientUploadedProofs) return;
    const unverifiedIdx = formData.clientUploadedProofs.findIndex(p => !p.ocrResult);
    if (unverifiedIdx !== -1 && verifyingProofIdx === null) {
      handleVerifyProofWithAI(unverifiedIdx, formData.clientUploadedProofs[unverifiedIdx]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, formData.clientUploadedProofs, verifyingProofIdx]);

  const handleVerifyProofWithAI = async (proofIdx, proof) => {
    let expectedAmt = 0;
    if (proof.fileName.startsWith('1st')) expectedAmt = formData.deposit1;
    else if (proof.fileName.startsWith('2nd')) expectedAmt = formData.deposit2;
    else if (proof.fileName.startsWith('3rd')) expectedAmt = formData.deposit3;
    else if (proof.fileName.startsWith('Final')) expectedAmt = billingSummary.balanceDue;

    if (!expectedAmt) {
       setFormData(prev => {
          const updatedProofs = [...prev.clientUploadedProofs];
          updatedProofs[proofIdx] = { ...updatedProofs[proofIdx], ocrResult: 'UNKNOWN_AMT' };
          return { ...prev, clientUploadedProofs: updatedProofs };
       });
       return;
    }

    setVerifyingProofIdx(proofIdx);
    try {
       const prompt = `Please extract the transfer/payment amount from the provided receipt image URL: ${proof.url}\nCheck if the paid amount exactly matches the expected amount: ${expectedAmt} HKD.\nIf it matches exactly, reply ONLY with "MATCH". If it does not, reply ONLY with "MISMATCH".`;
       const res = await generate(prompt, "You are a financial OCR assistant. You read payment receipts and verify amounts.");
       const isMatch = res && res.includes('MATCH') && !res.includes('MISMATCH');
       setFormData(prev => {
          const updatedProofs = [...prev.clientUploadedProofs];
          updatedProofs[proofIdx] = { ...updatedProofs[proofIdx], ocrResult: isMatch ? 'MATCH' : 'MISMATCH' };
          return { ...prev, clientUploadedProofs: updatedProofs };
       });
       if (isMatch) addToast("AI 驗證成功 (Amount Matches)", "success");
       else addToast("AI 驗證發現金額不符", "error");
    } catch(e) {
       setFormData(prev => {
          const updatedProofs = [...prev.clientUploadedProofs];
          updatedProofs[proofIdx] = { ...updatedProofs[proofIdx], ocrResult: 'ERROR' };
          return { ...prev, clientUploadedProofs: updatedProofs };
       });
       addToast("AI 讀取失敗", "error");
    } finally {
       setVerifyingProofIdx(null);
    }
  };

  const handleAdminSign = async (docType, base64) => {
    try {
      const isoDate = new Date().toISOString();
      const newSigs = {
        ...formData.signatures,
        [docType]: {
          ...(formData.signatures?.[docType] || {}),
          admin: base64,
          adminDate: isoDate
        }
      };
      setFormData(prev => ({ ...prev, signatures: newSigs }));
      if (editingEvent) {
        await onSaveSignature(docType, base64, 'admin');
      }
      addToast("已簽署文件 (Document Signed)", "success");
    } catch (e) {
      addToast("簽署失敗 (Signature Failed)", "error");
      throw e;
    }
  };

  const isOwner = (formData?.salesRep?.split(', ').includes(userProfile?.displayName)) || (formData?.clientEmail === userProfile?.email);
  const isAdmin = userProfile?.role === 'admin';
  const canManageEvent = isAdmin || !hasPermission('manage_own_only') || isOwner;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingEvent ? (canManageEvent ? "編輯訂單" : "檢視訂單 (唯讀)") : "新增訂單"}>
      <form
        onSubmit={onSubmit}
        className="flex flex-col h-full min-h-[60vh]"
        onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault(); }}
      >
        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white sticky top-0 z-[60] overflow-x-auto no-scrollbar shadow-sm">
          {[
            { id: 'basic', label: '基本資料', icon: FileText, permission: 'tab_basic' },
            { id: 'fnb', label: '餐飲詳情', icon: Utensils, permission: 'tab_fnb' },
            { id: 'billing', label: '費用付款', icon: CreditCard, permission: 'tab_billing' },
            { id: 'venue', label: '場地佈置', icon: Monitor, permission: 'tab_venue' },
            { id: 'logistics', label: '物流細節', icon: Truck, permission: 'tab_logistics' },
            { id: 'remarks', label: '內部備註', icon: PenTool, permission: 'tab_remarks' },
            { id: 'printConfig', label: '列印設定', icon: Printer, permission: 'tab_print' },
          ].filter(t => hasPermission(t.permission)).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFormTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${formTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <tab.icon size={16} /><span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 space-y-6 bg-slate-50/50 flex-1 overflow-y-auto">
          {formTab === 'basic' && (
            <BasicDetailsTab
              formData={formData}
              setFormData={setFormData}
              handleInputChange={handleInputChange}
              minSpendInfo={minSpendInfo}
              users={users}
              appSettings={appSettings}
            />
          )}

          {formTab === 'fnb' && (
            <FoodAndBeverageTab
              formData={formData}
              setFormData={setFormData}
              appSettings={appSettings}
              saveMenuSnapshot={saveMenuSnapshot}
              addMenu={addMenu}
              setPreviewVersion={setPreviewVersion}
              deleteMenuSnapshot={deleteMenuSnapshot}
              moveMenu={moveMenu}
              handleMenuChange={handleMenuChange}
              handleApplyMenuPreset={handleApplyMenuPreset}
              removeMenu={removeMenu}
              translatingMenuId={translatingMenuId}
              handleTranslateMenu={handleTranslateMenu}
              toggleMenuAllocation={toggleMenuAllocation}
              handleMenuAllocationChange={handleMenuAllocationChange}
              updateFinanceState={updateFinanceState}
              handlePriceChange={handlePriceChange}
              drinkPackageType={drinkPackageType}
              handleDrinkTypeChange={handleDrinkTypeChange}
              isTranslatingDrinks={isTranslatingDrinks}
              handleTranslateDrinks={handleTranslateDrinks}
              handleInputChange={handleInputChange}
              DocumentVisibilityToggles={DocumentVisibilityToggles}
            />
          )}

          {formTab === 'billing' && (
            <BillingTab
              formData={formData}
              setFormData={setFormData}
              updateFinanceState={updateFinanceState}
              handlePriceChange={handlePriceChange}
              handleInputChange={handleInputChange}
              updateCustomItem={updateCustomItem}
              removeCustomItem={removeCustomItem}
              jumpToAllocation={jumpToAllocation}
              minSpendInfo={minSpendInfo}
              billingSummary={billingSummary}
              calculatePaymentTerms={calculatePaymentTerms}
              addToast={addToast}
              onUploadProof={onUploadProof}
              onRemoveProof={onRemoveProof}
            />
          )}

          {formTab === 'venue' && (
            <VenueTab
              formData={formData}
              setFormData={setFormData}
              handleInputChange={handleInputChange}
              onUploadProof={onUploadProof}
              addToast={addToast}
              appSettings={appSettings}
              events={events}
              onMultiImageUpload={onMultiImageUpload}
              DocumentVisibilityToggles={DocumentVisibilityToggles}
            />
          )}

          {formTab === 'logistics' && (
            <LogisticsTab
              formData={formData}
              setFormData={setFormData}
              handleInputChange={handleInputChange}
              DocumentVisibilityToggles={DocumentVisibilityToggles}
            />
          )}

          {formTab === 'remarks' && (
            <InternalNotesTab
              formData={formData}
              setFormData={setFormData}
              handleInputChange={handleInputChange}
            />
          )}

          {formTab === 'printConfig' && (
            <PrintConfigTab
              formData={formData}
              setFormData={setFormData}
            />
          )}
        </div>

        {/* Footer inside Modal */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center sticky bottom-0 z-[70] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] rounded-b-xl">
          <div className="flex items-center space-x-3 relative">
            {hasPermission('ai_assistant') && (
              <button type="button" onClick={onOpenAi} className="group relative px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg font-bold shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2 text-sm"><Sparkles size={16} className="text-yellow-200" /><span>AI 智能助手</span></button>
            )}

            {/* Document Manager Launch Button */}
            {editingEvent && hasPermission('send_messages') && (
              <div className="relative">
                {showDocManager && <div className="fixed inset-0 z-40" onClick={() => setShowDocManager(false)}></div>}
                <button type="button" onClick={() => { setShowDocManager(!showDocManager); setShowSendMenu(false); }} className={`px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 text-sm transition-all border ${showDocManager ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}>
                  <FileText size={16} />
                  <span>管理文件</span>
                  <ChevronUp size={14} className={`transition-transform duration-200 ${showDocManager ? 'rotate-180' : ''}`} />
                </button>
                {showDocManager && (
                  <div className="absolute bottom-full left-0 mb-2 w-[24rem] bg-white border border-slate-200 shadow-2xl rounded-xl py-0 z-50 animate-in fade-in slide-in-from-bottom-2 overflow-hidden">
                    <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">文件列表 (Documents)</span>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                      <DocumentManager
                        eventData={formData}
                        appSettings={appSettings}
                        isClientPortal={false}
                    onPrint={onPrint}
                        onSign={handleAdminSign}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Send Menu */}
            {editingEvent && (
              <div className="relative">
                {showSendMenu && <div className="fixed inset-0 z-40" onClick={() => setShowSendMenu(false)}></div>}
                <button type="button" onClick={() => { setShowSendMenu(!showSendMenu); setShowDocManager(false); }} className={`px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 text-sm transition-all border ${showSendMenu ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'}`}><Send size={16} /><span>傳送給客戶 (Send)</span><ChevronUp size={14} className={`transition-transform duration-200 ${showSendMenu ? 'rotate-180' : ''}`} /></button>
                {showSendMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-72 bg-white border border-slate-200 shadow-2xl rounded-xl py-2 z-50 animate-in fade-in slide-in-from-bottom-2">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-1">WhatsApp (SleekFlow API)</div>
                    <button type="button" onClick={() => onSendSleekFlow(false, 'INVOICE')} className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors flex items-start group"><MessageCircle size={16} className="mr-3 text-emerald-600 mt-0.5 shrink-0" /><div><span className="block text-sm font-bold text-slate-700 group-hover:text-emerald-700">發送 Invoice (標準訊息)</span><span className="block text-[10px] text-slate-500 leading-tight mt-0.5">附帶 AI 草稿與發票連結。<br />⚠️ 僅限客戶 24 小時內曾回覆</span></div></button>
                    <button type="button" onClick={() => onSendSleekFlow(true, 'CONTRACT')} className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start group border-t border-slate-100 mb-1"><MessageCircle size={16} className="mr-3 text-slate-400 mt-0.5 shrink-0" /><div><span className="block text-sm font-bold text-slate-700">發送 Contract (HSM 模板)</span><span className="block text-[10px] text-slate-500 leading-tight mt-0.5">發送預先批核的通知模板。<br />✅ 適合超過 24 小時未聯絡的客戶</span></div></button>
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-t border-slate-100 mb-1 mt-1 bg-slate-50">電郵 (Email)</div>
                    <button type="button" onClick={() => onSendEmail('QUOTATION')} className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-start group"><Mail size={16} className="mr-3 text-blue-500 mt-0.5 shrink-0" /><div><span className="block text-sm font-bold text-slate-700 group-hover:text-blue-700">發送 Quotation (電郵)</span><span className="block text-[10px] text-slate-500 leading-tight mt-0.5">開啟電郵系統並自動附上報價單下載連結</span></div></button>
                    <button type="button" onClick={() => onSendEmail('INVOICE')} className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-start group border-t border-slate-100"><Mail size={16} className="mr-3 text-blue-500 mt-0.5 shrink-0" /><div><span className="block text-sm font-bold text-slate-700 group-hover:text-blue-700">發送 Invoice (電郵)</span><span className="block text-[10px] text-slate-500 leading-tight mt-0.5">開啟電郵系統並自動附上發票下載連結</span></div></button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors">取消</button>
            {hasPermission('tab_save') && canManageEvent && (
              <button type="submit" className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg transition-colors">儲存訂單</button>
            )}
          </div>
        </div>
      </form>

      <VersionPreviewModal
        isOpen={!!previewVersion}
        onClose={() => setPreviewVersion(null)}
        version={previewVersion}
        onRestore={restoreMenuSnapshot}
      />
    </Modal>
  );
}
