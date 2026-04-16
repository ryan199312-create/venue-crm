import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertCircle, AlertTriangle, Armchair, Cake, CheckCircle, ChevronLeft, ChevronRight,
  Clock, Coffee, Columns, CreditCard, DollarSign, Edit2, Eye, FileText, Flower2, Frame,
  Grid, History, Image as ImageIcon, Info, Languages, Layout, Loader2, Mail, MapPin, Maximize,
  MessageCircle, Mic, Mic2, Monitor, Palette, PenTool, PieChart, Plus, Printer,
  RotateCw, Save, Send, Smartphone, Sparkles, Star, Sun, Trash2, Truck, Tv, Type,
  Users, Utensils, Video, Wind, X, Zap, Receipt, ChevronUp, Download, Upload
} from 'lucide-react';

import { useAI } from '../hooks/useAI';
import { FormInput, MoneyInput, FormSelect, FormTextArea, FormCheckbox, LocationSelector, DepositField, Modal, VersionPreviewModal, PendingProofCard } from '../components/ui';
import {
  EVENT_TYPES, DEFAULT_DRINK_PACKAGES, DEPARTMENTS, FOOD_DEPTS, DRINK_DEPTS,
  equipmentMap, avMap, decorationMap, generateBillingSummary, formatMoney,
  safeFloat, DECOR_COLORS, SERVING_STYLES
} from '../utils/vmsUtils';
import FloorplanEditor from '../components/FloorplanEditor';
import DocumentManager from '../components/DocumentManager';
import BasicDetailsTab from './BasicDetailsTab';
import LogisticsTab from './LogisticsTab';
import FnBTab from './FnBTab';
import BillingTab from './BillingTab';
import VenueTab from './VenueTab';
import PrintConfigTab from './PrintConfigTab';
import RemarksTab from './RemarksTab';

export default function EventFormModal({
  isOpen, onClose, editingEvent, formData, setFormData, appSettings,
  onSubmit, onSaveSignature, onUploadProof, onMultiImageUpload, onRemoveProof, addToast,
  onOpenAi, onPrintEO, onPrintBriefing, onPrintQuotation, onPrintInvoice, onPrintReceipt,
  onPrintContractEN, onPrintContractCN, onOpenMenuPrint, onDownloadPDF,
  onSendSleekFlow, onSendEmail, events
}) {
  const { generate } = useAI();

  // Internal UI State
  const [formTab, setFormTab] = useState('basic');
  const [showSendMenu, setShowSendMenu] = useState(false);
  const [showDocManager, setShowDocManager] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(null);
  const [highlightTarget, setHighlightTarget] = useState(null);
  const [translatingMenuId, setTranslatingMenuId] = useState(null);
  const [isTranslatingDrinks, setIsTranslatingDrinks] = useState(false);
  const [drinkPackageType, setDrinkPackageType] = useState('');
  const [verifyingProofIdx, setVerifyingProofIdx] = useState(null);

  const billingSummary = useMemo(() => generateBillingSummary(formData), [formData]);

  // Reset tabs and specific states when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormTab('basic');
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
  }, [isOpen, editingEvent]);

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

  // --- Min Spend Logic ---
  const minSpendInfo = useMemo(() => {
    if (!formData.date || formData.selectedLocations.length === 0 || !appSettings.minSpendRules) return null;
    const date = new Date(formData.date);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayStr = days[date.getDay()];

    let timeOfDay = 'dinner';
    if (formData.startTime) {
      const hour = parseInt(formData.startTime.split(':')[0], 10);
      if (hour < 16) timeOfDay = 'lunch';
    }

    const selectedSorted = [...formData.selectedLocations].sort();
    const getPrice = (rule) => {
      const priceEntry = rule.prices?.[dayStr];
      if (!priceEntry) return 0;
      if (typeof priceEntry === 'object') return parseInt(priceEntry[timeOfDay] || 0);
      return parseInt(priceEntry || 0);
    };

    const exactRule = appSettings.minSpendRules.find(r => {
      const ruleSorted = [...r.locations].sort();
      return JSON.stringify(ruleSorted) === JSON.stringify(selectedSorted);
    });

    if (exactRule) {
      const amount = getPrice(exactRule);
      if (amount > 0) return { amount, ruleName: `精確符合: ${selectedSorted.join('+')} (${timeOfDay === 'lunch' ? '午市' : '晚市'})` };
    }

    let sum = 0;
    let applicableRules = [];
    formData.selectedLocations.forEach(loc => {
      const rule = appSettings.minSpendRules.find(r => r.locations.length === 1 && r.locations[0] === loc);
      if (rule) {
        const price = getPrice(rule);
        if (price > 0) { sum += price; applicableRules.push(`${loc} ($${price.toLocaleString()})`); }
      }
    });

    if (applicableRules.length > 0) {
      return { amount: sum, ruleName: `組合加總: ${applicableRules.join(' + ')} (${timeOfDay === 'lunch' ? '午市' : '晚市'})` };
    }
    return null;
  }, [formData.date, formData.startTime, formData.selectedLocations, appSettings.minSpendRules]);

  // --- Payment Terms Logic ---
  const calculatePaymentTerms = (currentTotal, currentDate) => {
    if (!currentTotal || !currentDate) return null;
    const eventDate = new Date(currentDate);
    const orderDate = editingEvent?.createdAt ? new Date(editingEvent.createdAt.seconds * 1000) : new Date();
    const monthsDiff = (eventDate.getFullYear() - orderDate.getFullYear()) * 12 + (eventDate.getMonth() - orderDate.getMonth());

    const formatDate = (date) => new Date(date).toLocaleDateString('en-CA');
    const addMonths = (date, months) => { const d = new Date(date); d.setMonth(d.getMonth() + months); return formatDate(d); };

    const rules = appSettings.paymentRules || [];
    const matchingRule = rules.find(r => monthsDiff >= r.minMonthsInAdvance);
    if (!matchingRule) return null;

    const p1 = matchingRule.deposit1 || 0;
    const p2 = matchingRule.deposit2 || 0;
    const p3 = matchingRule.deposit3 || 0;

    let dep1 = p1 > 0 ? Math.round(currentTotal * (p1 / 100)) : '';
    let dep2 = p2 > 0 ? Math.round(currentTotal * (p2 / 100)) : '';
    let dep3 = p3 > 0 ? Math.round(currentTotal * (p3 / 100)) : '';

    if (p1 + p2 + p3 === 100) {
      if (p3 > 0) { dep3 = currentTotal - (Number(dep1) || 0) - (Number(dep2) || 0); } 
      else if (p2 > 0) { dep2 = currentTotal - (Number(dep1) || 0); } 
      else if (p1 > 0) { dep1 = currentTotal; }
    }

    return {
      deposit1: dep1, deposit1Date: p1 > 0 ? addMonths(orderDate, matchingRule.deposit1Offset || 0) : '',
      deposit2: dep2, deposit2Date: p2 > 0 ? addMonths(orderDate, matchingRule.deposit2Offset || 0) : '',
      deposit3: dep3, deposit3Date: p3 > 0 ? addMonths(orderDate, matchingRule.deposit3Offset || 0) : '',
      ruleName: matchingRule.name
    };
  };

  const updateFinanceState = useCallback((newData) => {
    return { ...newData, totalAmount: generateBillingSummary(newData).grandTotal };
  }, []);

  // --- Handlers ---
  const handleInputChange = useCallback((e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => {
      let newData = { ...prev };
      if (name.startsWith('av_')) {
        const field = name.replace('av_', ''); newData.avRequirements = { ...prev.avRequirements, [field]: checked };
      } else if (name.startsWith('eq_')) {
        const field = name.replace('eq_', ''); newData.equipment = { ...prev.equipment, [field]: checked };
      } else if (name.startsWith('dec_')) {
        const field = name.replace('dec_', ''); newData.decoration = { ...prev.decoration, [field]: checked };
      } else {
        newData[name] = value;
      }

      if (name === 'tableCount' || name === 'guestCount') {
        const val = parseFloat(value) || 0;
        if (newData.menus) newData.menus = newData.menus.map(m => {
          if (name === 'tableCount' && m.priceType === 'perTable') return { ...m, qty: val };
          if (name === 'guestCount' && m.priceType === 'perPerson') return { ...m, qty: val };
          return m;
        });
        if (name === 'tableCount' && newData.drinksPriceType === 'perTable') newData.drinksQty = val;
        if (name === 'guestCount' && newData.drinksPriceType === 'perPerson') newData.drinksQty = val;
        if (newData.customItems) newData.customItems = newData.customItems.map(item => {
          if (name === 'tableCount' && item.unitType === 'perTable') return { ...item, qty: val };
          if (name === 'guestCount' && item.unitType === 'perPerson') return { ...item, qty: val };
          return item;
        });
      }
      return updateFinanceState(newData);
    });
  }, [updateFinanceState, setFormData]);

  const handlePriceChange = useCallback((e) => {
    const { name, value } = e.target;
    const cleanValue = value.toString().replace(/,/g, '');
    setFormData(prev => updateFinanceState({ ...prev, [name]: cleanValue }));
  }, [updateFinanceState, setFormData]);

  const updateCustomItem = useCallback((idx, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.customItems];
      // Create a new object for the updated item to ensure React.memo re-renders
      newItems[idx] = { ...newItems[idx], [field]: value };
      return updateFinanceState({ ...prev, customItems: newItems });
    });
  }, [updateFinanceState, setFormData]);

  const removeCustomItem = useCallback((idx) => {
    setFormData(prev => updateFinanceState({ ...prev, customItems: prev.customItems.filter((_, i) => i !== idx) }));
  }, [updateFinanceState, setFormData]);

  const handleMenuChange = (id, field, value) => {
    setFormData(prev => ({ ...prev, menus: prev.menus.map(m => m.id === id ? { ...m, [field]: value } : m) }));
  };

  const handleMenuAllocationChange = (menuId, deptKey, value) => {
    setFormData(prev => ({ ...prev, menus: prev.menus.map(m => { if (m.id !== menuId) return m; return { ...m, allocation: { ...m.allocation, [deptKey]: value } }; }) }));
  };

  const toggleMenuAllocation = (menuId) => {
    setFormData(prev => ({ ...prev, menus: prev.menus.map(m => m.id === menuId ? { ...m, showAllocation: !m.showAllocation } : m) }));
  };

  const handleApplyMenuPreset = (menuId, presetId) => {
    const preset = appSettings.defaultMenus.find(m => m.id.toString() === presetId.toString());
    if (preset) {
      setFormData(prev => {
        const dateObj = new Date(prev.date);
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() >= 5;
        const finalPrice = isWeekend ? (preset.priceWeekend || preset.priceWeekday) : (preset.priceWeekday || preset.priceWeekend);
        const newMenus = prev.menus.map(m => m.id === menuId ? { ...m, title: preset.title, content: preset.content, price: finalPrice || 0, priceType: m.priceType || 'perTable', qty: m.qty || prev.tableCount || 1, allocation: preset.allocation || {} } : m);
        return updateFinanceState({ ...prev, menus: newMenus });
      });
      addToast(`已載入: ${preset.title}`, "success");
    }
  };

  const addMenu = () => {
    setFormData(prev => updateFinanceState({ ...prev, menus: [...(prev.menus || []), { id: Date.now(), title: '', content: '', price: '', priceType: 'perTable', qty: prev.tableCount || 1, applySC: true }] }));
  };

  const removeMenu = (id) => {
    setFormData(prev => updateFinanceState({ ...prev, menus: prev.menus.filter(m => m.id !== id) }));
  };

  const saveMenuSnapshot = () => {
    if (!formData.menus || formData.menus.length === 0) return addToast("沒有菜單可儲存", "error");
    const defaultName = `Ver ${(formData.menuVersions?.length || 0) + 1}`;
    let snapshotName = prompt("請輸入版本名稱 (Enter Version Name):", defaultName);
    if (snapshotName === null) return;
    if (snapshotName.trim() === "") snapshotName = defaultName;

    setFormData(prev => ({
      ...prev,
      menuVersions: [{ id: Date.now(), name: snapshotName, data: JSON.parse(JSON.stringify(formData.menus)), totalAmount: formData.totalAmount, timestamp: new Date().toISOString() }, ...(prev.menuVersions || [])]
    }));
    addToast(`已儲存: ${snapshotName}`, "success");
  };

  const restoreMenuSnapshot = (snapshot) => {
    setFormData(prev => ({ ...prev, menus: snapshot.data, totalAmount: generateBillingSummary({ ...prev, menus: snapshot.data }) }));
    addToast(`已還原至版本: ${snapshot.name}`, "success");
    setPreviewVersion(null);
  };

  const deleteMenuSnapshot = (id) => {
    setFormData(prev => ({ ...prev, menuVersions: prev.menuVersions.filter(v => v.id !== id) }));
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

  const handleTranslateMenu = async (menuId, content) => {
    if (!content) return addToast("請先輸入菜單內容", "error");
    setTranslatingMenuId(menuId);
    try {
      const systemPrompt = `You are a professional banquet menu translator. Task: Translate from Chinese to English line by line. STRICT RULES: 1. Brand Names: ALWAYS translate '璟瓏軒' as 'King Lung Heen' and '璟瓏' as 'King Lung'. 2. Format: Output the original Chinese line, followed immediately by the English translation on the next line. 3. Spacing: Remove ALL empty lines between items. 4. Punctuation: Do NOT add full stops. 5. Cleanliness: Do not add bullet points.`;
      let translatedText = await generate(content, systemPrompt);
      if (!translatedText) throw new Error("Translation API Failed");
      handleMenuChange(menuId, 'content', translatedText.replace(/\n\s*\n/g, '\n').trim());
      addToast("菜單翻譯完成！", "success");
    } catch (error) {
      addToast("翻譯失敗，請稍後再試", "error");
    } finally {
      setTranslatingMenuId(null);
    }
  };

  const handleTranslateDrinks = async () => {
    if (!formData.drinksPackage) return addToast("請先輸入酒水內容", "error");
    setIsTranslatingDrinks(true);
    try {
      const systemPrompt = `You are a professional banquet translator. Task: Translate the beverage list from Chinese to English line by line. STRICT RULES: 1. Format: Output original Chinese line, followed immediately by English translation on the next line. 2. Spacing: Remove ALL empty lines. 3. Punctuation: Do NOT add full stops.`;
      let translatedText = await generate(formData.drinksPackage, systemPrompt);
      if (!translatedText) throw new Error("Translation API Failed");
      setFormData(prev => ({ ...prev, drinksPackage: translatedText.replace(/\n\s*\n/g, '\n').trim() }));
      addToast("酒水翻譯完成！", "success");
    } catch (error) {
      addToast("翻譯失敗，請稍後再試", "error");
    } finally {
      setIsTranslatingDrinks(false);
    }
  };

  // Reusable component to render visibility toggles under fuzzy fields
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

  // --- Admin Signing Handler ---
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingEvent ? "編輯訂單" : "新增訂單"}>
      <form
        onSubmit={onSubmit}
        className="flex flex-col h-full min-h-[60vh]"
        onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault(); }}
      >
        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white sticky top-0 z-[60] overflow-x-auto no-scrollbar shadow-sm">
          {[
            { id: 'basic', label: '基本資料', icon: FileText },
            { id: 'fnb', label: '餐飲詳情', icon: Utensils },
            { id: 'billing', label: '費用付款', icon: CreditCard },
            { id: 'venue', label: '場地佈置', icon: Monitor },
            { id: 'logistics', label: '物流細節', icon: Truck },
            { id: 'remarks', label: '備註', icon: PenTool },
            { id: 'printConfig', label: '列印設定', icon: Printer },
          ].map(tab => (
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
            />
          )}

          {formTab === 'fnb' && (
            <FnBTab
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
            <RemarksTab
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
            <button type="button" onClick={onOpenAi} className="group relative px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg font-bold shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2 text-sm"><Sparkles size={16} className="text-yellow-200" /><span>AI 智能助手</span></button>
            
            {/* Document Manager Launch Button */}
            {editingEvent && (
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
                        onPrint={(docType) => {
                          if (docType === 'EO') onPrintEO();
                          else if (docType === 'BRIEFING') onPrintBriefing();
                          else if (docType === 'QUOTATION') onPrintQuotation();
                          else if (docType === 'CONTRACT') onPrintContractEN();
                          else if (docType === 'CONTRACT_CN') onPrintContractCN();
                          else if (docType === 'INVOICE') onPrintInvoice();
                          else if (docType === 'RECEIPT') onPrintReceipt();
                          else if (docType === 'MENU_CONFIRM') onOpenMenuPrint();
                        }}
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
            <button type="submit" className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg transition-colors">儲存訂單</button>
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