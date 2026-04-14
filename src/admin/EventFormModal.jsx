import React, { useState, useEffect, useMemo } from 'react';
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

  const updateFinanceState = (newData) => {
    return { ...newData, totalAmount: generateBillingSummary(newData).grandTotal };
  };

  // --- Handlers ---
  const handleInputChange = (e) => {
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
  };

  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    const cleanValue = value.toString().replace(/,/g, '');
    setFormData(prev => updateFinanceState({ ...prev, [name]: cleanValue }));
  };

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

  // Extract actual document name from Firebase Storage URL
  const getFileNameFromUrl = (url) => {
    try {
      const decoded = decodeURIComponent(url.split('/').pop().split('?')[0]);
      const parts = decoded.split('_');
      if (parts.length > 2) return parts.slice(2).join('_');
      if (parts.length > 1) return parts.slice(1).join('_');
      return decoded;
    } catch(e) { return "Receipt.jpg"; }
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
            { id: 'printConfig', label: '列印設定 (Print Opts)', icon: Printer },
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
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormInput label="訂單編號 (Order ID)" name="orderId" required value={formData.orderId} onChange={handleInputChange} />
                <FormSelect label="活動狀態 (Status)" name="status" options={[{ value: 'tentative', label: '暫定 (Tentative)' }, { value: 'confirmed', label: '已確認 (Confirmed)' }, { value: 'completed', label: '已完成 (Completed)' }, { value: 'cancelled', label: '已取消 (Cancelled)' }]} value={formData.status} onChange={handleInputChange} />
                <FormSelect label="活動類型" name="eventType" options={EVENT_TYPES} value={formData.eventType} onChange={handleInputChange} />
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <FileText size={18} className="text-blue-600" />
                  <h4 className="font-bold text-slate-800">活動詳情 (Event Details)</h4>
                </div>
                <FormInput label="活動名稱 (Event Name)" name="eventName" required value={formData.eventName} onChange={handleInputChange} placeholder="e.g. 陳李聯婚 / Annual Dinner" />
                <div className="grid grid-cols-4 gap-4">
                  <FormInput label="活動日期" name="date" type="date" required className="col-span-1" value={formData.date} onChange={handleInputChange} />
                  <FormInput label="開始時間 (Start)" name="startTime" type="time" required className="col-span-1" value={formData.startTime} onChange={handleInputChange} />
                  <div className="col-span-1">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 text-red-600">起菜時間 (Serving)</label>
                    <input type="time" name="servingTime" value={formData.servingTime || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all bg-red-50" />
                  </div>
                  <FormInput label="結束時間 (End)" name="endTime" type="time" required className="col-span-1" value={formData.endTime} onChange={handleInputChange} />
                </div>
                <div className="pt-4 border-t border-slate-100 mt-2">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 flex flex-col justify-between">
                      <div>
                        <LocationSelector formData={formData} setFormData={setFormData} />
                        {minSpendInfo && (
                          <div className="mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded-lg flex flex-col sm:flex-row justify-between items-center animate-in slide-in-from-top-2">
                            <div className="flex items-center text-indigo-900 mb-1 sm:mb-0"><div className="bg-white p-1 rounded-full shadow-sm mr-2 text-indigo-600"><DollarSign size={14} /></div><div><span className="text-[10px] font-bold text-indigo-600 block">最低消費 (Min Spend)</span><span className="text-base font-black font-mono tracking-tight">${minSpendInfo.amount.toLocaleString()}</span></div></div>
                            <div className="text-right"><span className="text-[10px] font-medium text-indigo-500 bg-white px-2 py-0.5 rounded border border-indigo-100 block">{minSpendInfo.ruleName}</span></div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="lg:col-span-4">
                      <div className="grid grid-cols-2 gap-3"><FormInput label="席數 (Tables)" name="tableCount" type="number" value={formData.tableCount} onChange={handleInputChange} placeholder="20" /><FormInput label="人數 (Guests)" name="guestCount" type="number" value={formData.guestCount} onChange={handleInputChange} placeholder="240" /></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Users size={18} className="text-blue-600" />
                  <h4 className="font-bold text-slate-800">聯絡人資訊 (Contact Info)</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormInput label="客戶姓名" name="clientName" required value={formData.clientName} onChange={handleInputChange} />
                  <FormInput label="電話" name="clientPhone" value={formData.clientPhone} onChange={handleInputChange} />
                  <FormInput label="公司" name="companyName" value={formData.companyName} onChange={handleInputChange} />
                  <FormInput label="銷售人員" name="salesRep" value={formData.salesRep} onChange={handleInputChange} />
                  <FormInput label="Email" name="clientEmail" value={formData.clientEmail} onChange={handleInputChange} />
                  <FormInput label="地址" name="address" value={formData.address} onChange={handleInputChange} />
                </div>
              </div>
            </div>
          )}

          {formTab === 'fnb' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-3 mb-4 gap-4">
                  <div>
                    <h4 className="font-bold text-slate-800 flex items-center gap-2"><Utensils size={18} className="text-blue-600"/> 餐單設定 (Menus)</h4>
                    <p className="text-xs text-slate-500 mt-1">Corporate Mode: Save versions before major edits.</p>
                  </div>
                  <div className="flex space-x-2">
                    <button type="button" onClick={() => saveMenuSnapshot()} className="text-sm bg-violet-50 text-violet-600 px-3 py-1.5 rounded-lg hover:bg-violet-100 font-bold flex items-center transition-colors border border-violet-200"><Save size={16} className="mr-1" /> 儲存版本</button>
                    <button type="button" onClick={addMenu} className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-bold flex items-center transition-colors border border-blue-200"><Plus size={16} className="mr-1" /> 新增菜單</button>
                  </div>
                </div>
                {formData.menuVersions && formData.menuVersions.length > 0 && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 animate-in fade-in">
                    <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-slate-500 uppercase flex items-center"><History size={14} className="mr-1" /> 版本紀錄 (Version History)</span><span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">{formData.menuVersions.length} Saved</span></div>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
                      {formData.menuVersions.map(v => (
                        <div key={v.id} className="flex-shrink-0 bg-white border border-slate-300 rounded-lg p-3 text-xs flex flex-col gap-2 shadow-sm min-w-[140px] group hover:border-blue-400 transition-colors">
                          <div><div className="font-bold text-slate-800 text-sm truncate" title={v.name}>{v.name}</div><div className="text-[10px] text-slate-400 mt-0.5">{new Date(v.id).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {v.data.length} Items</div></div>
                          <div className="flex gap-2 mt-auto pt-2 border-t border-slate-100"><button type="button" onClick={() => setPreviewVersion(v)} className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded py-1.5 font-bold border border-blue-100 transition-colors flex items-center justify-center"><Eye size={12} className="mr-1" /> 查看</button><button type="button" onClick={(e) => { e.stopPropagation(); if (confirm('確定刪除此版本?')) deleteMenuSnapshot(v.id); }} className="px-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={12} /></button></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  {formData.menus && formData.menus.map((menu, index) => {
                    const price = parseFloat(menu.price) || 0;
                    const allocSum = Object.values(menu.allocation || {}).reduce((a, b) => a + (parseFloat(b) || 0), 0);
                    const diff = price - allocSum;
                    let statusBadge = null;
                    if (price > 0) {
                      if (allocSum === 0) statusBadge = <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold border border-red-200 flex items-center animate-pulse"><AlertCircle size={10} className="mr-1" /> 未分拆 (Unallocated)</span>;
                      else if (Math.abs(diff) > 1) statusBadge = <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200 flex items-center"><AlertTriangle size={10} className="mr-1" /> 剩餘 ${formatMoney(diff)}</span>;
                      else statusBadge = <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200 flex items-center"><CheckCircle size={10} className="mr-1" /> OK</span>;
                    }
                    return (
                      <div key={menu.id || index} id={`menu-item-${menu.id}`} className="bg-slate-50 p-4 rounded-lg border border-slate-200 relative group transition-all hover:border-blue-200 hover:shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center flex-1 gap-2">
                            <div className="flex flex-col mr-2"><button type="button" onClick={() => moveMenu(index, 'up')} disabled={index === 0} className="text-slate-400 hover:text-blue-600 disabled:opacity-30"><ChevronLeft size={14} className="rotate-90" /></button><button type="button" onClick={() => moveMenu(index, 'down')} disabled={index === formData.menus.length - 1} className="text-slate-400 hover:text-blue-600 disabled:opacity-30"><ChevronRight size={14} className="rotate-90" /></button></div>
                            <input type="text" placeholder="菜單標題 (e.g. Main Menu)" value={menu.title} onChange={(e) => handleMenuChange(menu.id, 'title', e.target.value)} className="font-bold text-slate-700 bg-transparent border-b border-dashed border-slate-400 focus:border-blue-500 focus:outline-none flex-1" />
                            <select className="text-xs bg-white border border-slate-300 rounded px-2 py-1 text-slate-600 focus:ring-1 focus:ring-emerald-500 outline-none w-32" onChange={(e) => handleApplyMenuPreset(menu.id, e.target.value)} value=""><option value="" disabled>📂 載入預設...</option>{appSettings.defaultMenus && appSettings.defaultMenus.filter(m => m.type === 'food').map(m => (<option key={m.id} value={m.id}>{m.title}</option>))}</select>
                            {formData.menus.length > 1 && <button type="button" onClick={() => removeMenu(menu.id)} className="text-slate-400 hover:text-red-500 p-1 rounded ml-2"><Trash2 size={16} /></button>}
                          </div>
                        </div>
                        <div className="flex justify-between items-end mb-1"><label className="text-xs font-bold text-slate-500">菜單內容 (一行一項)</label><button type="button" onClick={() => handleTranslateMenu(menu.id, menu.content)} disabled={translatingMenuId === menu.id || !menu.content} className="flex items-center text-[10px] bg-violet-100 text-violet-700 px-2 py-1 rounded hover:bg-violet-200 disabled:opacity-50 transition-colors">{translatingMenuId === menu.id ? <><Loader2 size={12} className="animate-spin mr-1" /> 翻譯中...</> : <><Languages size={12} className="mr-1" /> AI 中英對照翻譯</>}</button></div>
                        <textarea rows={8} placeholder="輸入詳細菜色..." value={menu.content} onChange={(e) => handleMenuChange(menu.id, 'content', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white mb-3 font-mono leading-relaxed" />
                        <div className="border-t border-slate-200 pt-2 flex justify-between items-center"><button type="button" onClick={() => toggleMenuAllocation(menu.id)} className={`flex items-center text-xs font-bold px-3 py-1.5 rounded transition-colors ${menu.showAllocation ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50'}`}><PieChart size={14} className="mr-1.5" />{menu.showAllocation ? "隱藏拆帳 (Hide)" : "設定拆帳 (Allocation)"}{!menu.showAllocation && statusBadge}</button><div className="text-xs text-slate-400 flex items-center"><span className="mr-2">{menu.priceType === 'perTable' ? '每席' : menu.priceType === 'perPerson' ? '每位' : '固定'}價:</span><span className="font-mono text-slate-700 font-bold text-sm bg-slate-100 px-2 py-0.5 rounded border border-slate-200">${formatMoney(menu.price)}</span>{menu.showAllocation && statusBadge}</div></div>
                        {menu.showAllocation && (
                          <div className="mt-3 bg-white p-3 rounded border border-slate-200 animate-in slide-in-from-top-2 shadow-sm">
                            <div className="flex justify-between text-[10px] text-slate-400 mb-2 border-b border-slate-100 pb-1"><span>總金額 (Total): ${formatMoney(price)}</span><span className={Math.abs(diff) > 1 ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>{Math.abs(diff) < 1 ? "✅ 平衡 (Balanced)" : `⚠️ 剩餘未分: $${formatMoney(diff)}`}</span></div>
                            <div className="grid grid-cols-3 gap-3">{DEPARTMENTS.filter(d => FOOD_DEPTS.includes(d.key)).map(dept => (<div key={dept.key}><label className="block text-[9px] font-bold text-slate-500 mb-0.5">{dept.label}</label><div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]">$</span><input type="number" value={menu.allocation?.[dept.key] || ''} onChange={e => handleMenuAllocationChange(menu.id, dept.key, e.target.value)} className={`w-full border rounded pl-4 pr-1 py-1 text-xs outline-none focus:ring-1 transition-colors ${menu.allocation?.[dept.key] ? 'border-emerald-300 bg-emerald-50 font-bold text-emerald-700' : 'border-slate-200 text-slate-600'}`} placeholder="0" /></div></div>))}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-slate-100">
                  <div className="space-y-4">
                    <FormSelect label="上菜方式 (Serving Style)" name="servingStyle" options={SERVING_STYLES} value={formData.servingStyle} onChange={(e) => { const newStyle = e.target.value; setFormData(prev => updateFinanceState({ ...prev, servingStyle: newStyle, platingFee: newStyle === '位上' ? prev.platingFee : '' })); }} />
                    {formData.servingStyle === '位上' && (
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-2 shadow-sm"><MoneyInput label="位上服務費 (每席計算)" name="platingFee" value={formData.platingFee} onChange={handlePriceChange} required /><div className="text-right text-xs text-blue-600 font-mono mt-1 font-bold">= ${formatMoney((parseFloat(formData.platingFee) || 0) * (parseFloat(formData.tableCount) || 0))}</div></div>
                    )}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between transition-all hover:border-purple-200">
                      <label className="flex items-center space-x-3 cursor-pointer select-none group"><div className="relative flex items-center"><input type="checkbox" checked={formData.enableHandCarry || false} onChange={(e) => setFormData(prev => ({ ...prev, enableHandCarry: e.target.checked }))} className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded bg-white checked:bg-purple-600 checked:border-purple-600 transition-all cursor-pointer" /><svg className="absolute w-3.5 h-3.5 text-white left-[3px] top-[3px] opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div><span className={`text-sm font-bold transition-colors ${formData.enableHandCarry ? 'text-purple-700' : 'text-slate-500 group-hover:text-slate-700'}`}>酒會手捧 (Butler Style)</span></label>
                      {formData.enableHandCarry && (<div className="flex items-center animate-in fade-in slide-in-from-left-2 duration-300 bg-white px-3 py-1.5 rounded border border-purple-100 shadow-sm"><span className="text-xs text-purple-600 mr-2 font-medium">人手:</span><input type="number" placeholder="0" value={formData.handCarryStaffQty || ''} onChange={(e) => setFormData(prev => ({ ...prev, handCarryStaffQty: e.target.value }))} className="w-12 border-b-2 border-purple-200 text-center text-sm font-bold text-purple-800 focus:outline-none bg-transparent focus:border-purple-500 transition-colors" /><span className="text-xs text-purple-600 ml-1">Pax</span></div>)}
                    </div>
                  </div>
                  <div id="drinks-section">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">酒水安排 (Drinks)</label>
                    <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white mb-2" value={drinkPackageType} onChange={handleDrinkTypeChange}><option value="">請選擇套餐 (載入預設)</option>{DEFAULT_DRINK_PACKAGES.map(p => <option key={p} value={p}>{p}</option>)}{appSettings.defaultMenus && appSettings.defaultMenus.filter(m => m.type === 'drink').map(m => (<option key={m.id} value={m.title}>📂 {m.title}</option>))}<option value="Other">自訂 / 其他</option></select>
                    <div className="flex justify-end mb-1"><button type="button" onClick={handleTranslateDrinks} disabled={isTranslatingDrinks || !formData.drinksPackage} className="flex items-center text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 disabled:opacity-50 transition-colors">{isTranslatingDrinks ? <><Loader2 size={12} className="animate-spin mr-1" /> 翻譯中...</> : <><Languages size={12} className="mr-1" /> AI 中英翻譯</>}</button></div>
                    <textarea name="drinksPackage" rows={4} value={formData.drinksPackage || ''} onChange={handleInputChange} placeholder="酒水內容詳細描述..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                    <div className="mt-2">
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, showDrinkAllocation: !prev.showDrinkAllocation }))} className={`w-full flex justify-center items-center text-xs font-bold px-3 py-1.5 rounded transition-colors border ${formData.showDrinkAllocation ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}><PieChart size={14} className="mr-1.5" />{formData.showDrinkAllocation ? "隱藏酒水拆帳" : "設定酒水拆帳 (Allocation)"}</button>
                      {formData.showDrinkAllocation && (
                        <div className="mt-2 bg-blue-50/50 p-3 rounded border border-blue-100 animate-in slide-in-from-top-1">
                          {(() => {
                            const dPrice = parseFloat(formData.drinksPrice) || 0;
                            const dAllocSum = Object.values(formData.drinkAllocation || {}).reduce((a, b) => a + (parseFloat(b) || 0), 0);
                            const dDiff = dPrice - dAllocSum;
                            return (
                              <>
                                <div className="flex justify-between text-[10px] text-slate-500 mb-2 border-b border-blue-100 pb-1"><span>單價: ${formatMoney(dPrice)}</span><span className={Math.abs(dDiff) > 1 ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>{Math.abs(dDiff) < 1 ? "✅ 平衡" : `⚠️ 剩餘: $${formatMoney(dDiff)}`}</span></div>
                                <div className="grid grid-cols-3 gap-2">{DEPARTMENTS.filter(d => DRINK_DEPTS.includes(d.key)).map(dept => (<div key={dept.key}><label className="block text-[9px] font-bold text-slate-500 mb-0.5">{dept.label.split(' ')[0]}</label><div className="relative"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-[9px]">$</span><input type="number" value={formData.drinkAllocation?.[dept.key] || ''} onChange={e => setFormData(prev => ({ ...prev, drinkAllocation: { ...prev.drinkAllocation, [dept.key]: e.target.value } }))} className={`w-full border rounded pl-3 pr-1 py-1 text-[10px] outline-none focus:ring-1 transition-colors ${formData.drinkAllocation?.[dept.key] ? 'border-blue-400 bg-white font-bold text-blue-700' : 'border-slate-300 bg-slate-50 text-slate-600'}`} placeholder="0" /></div></div>))}</div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <FormTextArea 
                    label={
                      <span className="flex items-center gap-1.5">
                        特殊餐單需求 (Special Req)
                        <Info size={14} className="text-blue-400 cursor-help hover:text-blue-600 transition-colors" title="顯示於 (Displayed in):&#10;• 內部單據 (Internal EO, Briefing, Kitchen)&#10;• 客戶合約 (Contract) - 若勾選" />
                      </span>
                    } 
                    name="specialMenuReq" value={formData.specialMenuReq} onChange={handleInputChange} 
                  />
                  <DocumentVisibilityToggles field="specialMenuReq" defaultClient={false} defaultInternal={true} />
                </div>
                <div>
                  <FormTextArea 
                    label={
                      <span className="flex items-center gap-1.5">
                        食物過敏 (Allergies)
                        <Info size={14} className="text-blue-400 cursor-help hover:text-blue-600 transition-colors" title="顯示於 (Displayed in):&#10;• 內部單據 (Internal EO, Briefing, Kitchen)&#10;• 客戶合約 (Contract) - 若勾選" />
                      </span>
                    } 
                    name="allergies" rows={2} className="bg-red-50 p-2 rounded-lg" value={formData.allergies} onChange={handleInputChange} 
                  />
                  <DocumentVisibilityToggles field="allergies" defaultClient={false} defaultInternal={true} />
                </div>
              </div>
            </div>
          )}

          {formTab === 'billing' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-white p-0 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <CreditCard size={16} className="text-blue-600"/> 
                    收費明細 (Charges Detail)
                  </h3>
                  <div className="text-xs text-slate-500 font-mono">系統將自動計算總額及服務費</div>
                </div>
                <div className="divide-y divide-slate-100">
                  {(formData.menus || []).map((menu, idx) => {
                    const subtotal = safeFloat(menu.price) * safeFloat(menu.qty);
                    const price = safeFloat(menu.price);
                    const allocSum = Object.values(menu.allocation || {}).reduce((a, b) => a + safeFloat(b), 0);
                    const isAllocated = Math.abs(price - allocSum) < 1;
                    return (
                      <div key={menu.id || idx} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors">
                        <div className="col-span-5"><div className="flex items-center"><div className="p-1.5 bg-emerald-100 text-emerald-600 rounded mr-3 flex-shrink-0"><Utensils size={14} /></div><div><div className="flex items-center"><span className="font-bold text-slate-700 block text-sm mr-2">{menu.title || `Menu ${idx + 1}`}</span>{price > 0 && !isAllocated && (<div className="relative group z-10 cursor-pointer" onClick={() => jumpToAllocation({ type: 'menu', id: menu.id })}><div className="flex items-center justify-center w-4 h-4 bg-red-100 text-red-600 rounded-full border border-red-200 animate-pulse hover:bg-red-200 hover:scale-110 transition-transform"><span className="text-[10px] font-bold">!</span></div></div>)}</div><span className="text-xs text-slate-400">來源: 餐飲分頁</span></div></div></div>
                        <div className="col-span-2 flex items-center justify-end"><span className="text-slate-400 text-xs mr-1">$</span><input type="number" value={menu.price} onChange={e => { const newMenus = [...formData.menus]; newMenus[idx].price = e.target.value; setFormData(prev => updateFinanceState({ ...prev, menus: newMenus })); }} className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-sm font-mono" placeholder="0" /></div>
                        <div className="col-span-2"><div className="flex items-center border border-slate-300 rounded-md bg-white h-9 overflow-hidden shadow-sm"><select value={menu.priceType} onChange={e => { const type = e.target.value; let newQty = menu.qty || 1; if (type === 'perTable') newQty = formData.tableCount || 1; if (type === 'perPerson') newQty = formData.guestCount || 1; const newMenus = [...formData.menus]; newMenus[idx] = { ...menu, priceType: type, qty: newQty }; setFormData(prev => updateFinanceState({ ...prev, menus: newMenus })); }} className="bg-slate-50 border-r border-slate-300 h-full px-2 text-[10px] outline-none text-slate-600 cursor-pointer min-w-[60px]"><option value="perTable">席</option><option value="perPerson">位</option><option value="total">固定</option></select><input type="number" value={menu.qty || ''} onChange={e => { const newMenus = [...formData.menus]; newMenus[idx].qty = e.target.value; setFormData(prev => updateFinanceState({ ...prev, menus: newMenus })); }} className="w-full h-full text-center outline-none text-sm font-bold text-slate-700 focus:bg-blue-50 transition-colors" /></div></div>
                        <div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">${formatMoney(subtotal)}</div>
                        <div className="col-span-1 flex justify-center"><button type="button" onClick={() => { const newMenus = [...formData.menus]; newMenus[idx].applySC = !menu.applySC; setFormData(prev => updateFinanceState({ ...prev, menus: newMenus })); }} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${menu.applySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200 opacity-50'}`}>SC</button></div>
                      </div>
                    );
                  })}
                  {formData.servingStyle === '位上' && (
                    <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors"><div className="col-span-5"><div className="flex items-center"><div className="p-1.5 bg-blue-100 text-blue-600 rounded mr-3 flex-shrink-0"><Utensils size={14} /></div><div><span className="font-bold text-slate-700 block text-sm">位上服務費 (Plating Fee)</span><span className="text-xs text-slate-400">來源: 上菜方式設定</span></div></div></div><div className="col-span-2 flex items-center justify-end"><span className="text-slate-400 text-xs mr-1">$</span><input type="number" name="platingFee" value={formData.platingFee} onChange={handlePriceChange} className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-sm font-mono text-slate-700" placeholder="0" /></div><div className="col-span-2 text-center text-sm text-slate-500">{formData.tableCount} (每席)</div><div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">${formatMoney(safeFloat(formData.platingFee) * safeFloat(formData.tableCount))}</div><div className="col-span-1 flex justify-center"><button type="button" onClick={() => setFormData(prev => updateFinanceState({ ...prev, platingFeeApplySC: !prev.platingFeeApplySC }))} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${formData.platingFeeApplySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200'}`}>SC</button></div></div>
                  )}
                  <div id="drinks-section" className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors">
                    <div className="col-span-5"><div className="flex items-center"><div className="p-1.5 bg-blue-100 text-blue-600 rounded mr-3 flex-shrink-0"><Coffee size={14} /></div><div className="flex-1"><div className="flex items-center"><input type="text" name="drinksPackage" value={formData.drinksPackage || ''} onChange={handleInputChange} placeholder="酒水套餐" className="bg-transparent border-b border-transparent hover:border-blue-200 focus:border-blue-500 outline-none text-sm font-bold text-slate-700 w-full" />{(() => { const dPrice = safeFloat(formData.drinksPrice); const dAllocSum = Object.values(formData.drinkAllocation || {}).reduce((a, b) => a + safeFloat(b), 0); if (dPrice > 0 && Math.abs(dPrice - dAllocSum) >= 1) return (<div className="relative group ml-2 z-10 cursor-pointer" onClick={() => jumpToAllocation({ type: 'drinks' })}><div className="flex items-center justify-center w-4 h-4 bg-red-100 text-red-600 rounded-full border border-red-200 animate-pulse hover:bg-red-200 hover:scale-110 transition-transform"><span className="text-[10px] font-bold">!</span></div></div>); return null; })()}</div><span className="text-xs text-slate-400">來源: 餐飲分頁</span></div></div></div><div className="col-span-2 flex items-center justify-end"><span className="text-slate-400 text-xs mr-1">$</span><input type="number" name="drinksPrice" value={formData.drinksPrice} onChange={handlePriceChange} className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-sm font-mono text-blue-800" placeholder="0" /></div><div className="col-span-2"><div className="flex items-center border border-slate-300 rounded-md bg-white h-9 overflow-hidden shadow-sm"><select name="drinksPriceType" value={formData.drinksPriceType} onChange={e => { const type = e.target.value; let newQty = 1; if (type === 'perTable') newQty = formData.tableCount; if (type === 'perPerson') newQty = formData.guestCount; setFormData(prev => updateFinanceState({ ...prev, drinksPriceType: type, drinksQty: newQty })); }} className="bg-slate-50 border-r border-slate-300 h-full px-2 text-[10px] outline-none text-slate-600"><option value="perTable">席</option><option value="perPerson">位</option><option value="total">固定</option></select><input type="number" value={formData.drinksQty || ''} onChange={e => setFormData(prev => updateFinanceState({ ...prev, drinksQty: e.target.value }))} className="w-full h-full text-center outline-none text-sm font-bold text-slate-700 focus:bg-blue-50 transition-colors" /></div></div><div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">${formatMoney(safeFloat(formData.drinksPrice) * safeFloat(formData.drinksQty))}</div><div className="col-span-1 flex justify-center"><button type="button" onClick={() => setFormData(prev => updateFinanceState({ ...prev, drinksApplySC: !prev.drinksApplySC }))} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${formData.drinksApplySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200'}`}>SC</button></div>
                  </div>
                  {Object.entries(formData.equipment || {}).some(([k, v]) => v === true && equipmentMap[k]) && (
                    <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors"><div className="col-span-5"><div className="flex items-center"><div className="p-1.5 bg-blue-100 text-blue-600 rounded mr-3 flex-shrink-0"><Layout size={14} /></div><div><span className="font-bold block text-sm text-slate-700">舞台與接待設備 (Setup & Reception)</span><span className="text-[10px] text-slate-400 leading-tight block mt-0.5">{Object.entries(formData.equipment || {}).filter(([k, v]) => v === true && equipmentMap[k]).map(([k]) => equipmentMap[k].split(' (')[0]).join(', ')}{formData.equipment?.nameSign && formData.nameSignText && `, 字牌: ${formData.nameSignText}`}{formData.equipment?.hasCake && formData.cakePounds && `, 蛋糕: ${formData.cakePounds}磅`}</span></div></div></div><div className="col-span-2 flex items-center justify-end"><span className="text-slate-400 text-xs mr-1">$</span><input type="number" value={formData.setupPackagePrice || ''} onChange={e => setFormData(prev => updateFinanceState({ ...prev, setupPackagePrice: e.target.value }))} className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-sm font-mono text-slate-700" placeholder="0" /></div><div className="col-span-2 text-center text-[10px] text-slate-400 font-bold uppercase tracking-tight">固定套票</div><div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">${formatMoney(safeFloat(formData.setupPackagePrice))}</div><div className="col-span-1 flex justify-center"><button type="button" onClick={() => setFormData(prev => updateFinanceState({ ...prev, setupApplySC: !prev.setupApplySC }))} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${formData.setupApplySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200'}`}>SC</button></div></div>
                  )}
                  {Object.entries(formData.equipment || {}).some(([k, v]) => v === true && avMap[k]) && (
                    <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors"><div className="col-span-5"><div className="flex items-center"><div className="p-1.5 bg-indigo-100 text-indigo-600 rounded mr-3 flex-shrink-0"><Tv size={14} /></div><div><span className="font-bold block text-sm text-slate-700">影音設備套票 (AV Package)</span><span className="text-[10px] text-slate-400 leading-tight block mt-0.5">{Object.entries(formData.equipment || {}).filter(([k, v]) => v === true && avMap[k]).map(([k]) => avMap[k].split(' (')[0]).join(', ')}</span></div></div></div><div className="col-span-2 flex items-center justify-end"><span className="text-slate-400 text-xs mr-1">$</span><input type="number" value={formData.avPackagePrice || ''} onChange={e => setFormData(prev => updateFinanceState({ ...prev, avPackagePrice: e.target.value }))} className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-indigo-500 outline-none text-sm font-mono text-slate-700" placeholder="0" /></div><div className="col-span-2 text-center text-[10px] text-slate-400 font-bold uppercase tracking-tight">固定套票</div><div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">${formatMoney(safeFloat(formData.avPackagePrice))}</div><div className="col-span-1 flex justify-center"><button type="button" onClick={() => setFormData(prev => updateFinanceState({ ...prev, avApplySC: !prev.avApplySC }))} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${formData.avApplySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200'}`}>SC</button></div></div>
                  )}
                  {Object.values(formData.decoration || {}).some(v => v === true) && (
                    <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors"><div className="col-span-5"><div className="flex items-center"><div className="p-1.5 bg-rose-100 text-rose-600 rounded mr-3 flex-shrink-0"><Star size={14} /></div><div><span className="font-bold block text-sm text-slate-700">場地佈置套票 (Decoration)</span><span className="text-[10px] text-slate-400 leading-tight block mt-0.5">{Object.entries(formData.decoration || {}).filter(([k, v]) => v === true && decorationMap[k]).map(([k]) => decorationMap[k].split(' (')[0]).join(', ')}{formData.decoration?.hasFlowerPillar && formData.flowerPillarQty && `, 花柱: ${formData.flowerPillarQty}支`}{formData.decoration?.hasMahjong && formData.mahjongTableQty && `, 麻雀: ${formData.mahjongTableQty}張`}{formData.decoration?.hasInvitation && formData.invitationQty && `, 喜帖: ${formData.invitationQty}套`}{formData.decoration?.hasCeremonyChair && formData.ceremonyChairQty && `, 婚椅: ${formData.ceremonyChairQty}張`}</span></div></div></div><div className="col-span-2 flex items-center justify-end"><span className="text-slate-400 text-xs mr-1">$</span><input type="number" value={formData.decorPackagePrice || ''} onChange={e => setFormData(prev => updateFinanceState({ ...prev, decorPackagePrice: e.target.value }))} className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-rose-500 outline-none text-sm font-mono text-slate-700" placeholder="0" /></div><div className="col-span-2 text-center text-[10px] text-slate-400 font-bold uppercase tracking-tight">固定套票</div><div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">${formatMoney(safeFloat(formData.decorPackagePrice))}</div><div className="col-span-1 flex justify-center"><button type="button" onClick={() => setFormData(prev => updateFinanceState({ ...prev, decorApplySC: !prev.decorApplySC }))} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${formData.decorApplySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200'}`}>SC</button></div></div>
                  )}
                  {(formData.customItems || []).map((item, idx) => (
                    <div key={item.id || idx} className="grid grid-cols-12 gap-4 px-6 py-3 items-center hover:bg-slate-50 transition-colors border-t border-slate-50"><div className="col-span-5 flex items-center"><div className="p-1.5 bg-slate-100 text-slate-500 rounded mr-3 flex-shrink-0"><Plus size={14} /></div><input type="text" value={item.name} placeholder="額外項目名稱" onChange={e => setFormData(prev => { const newItems = [...prev.customItems]; newItems[idx].name = e.target.value; return { ...prev, customItems: newItems }; })} className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none text-sm text-slate-700" /></div><div className="col-span-2 flex items-center justify-end"><span className="text-slate-400 text-xs mr-1">$</span><input type="number" value={item.price} onChange={e => setFormData(prev => { const newItems = [...prev.customItems]; newItems[idx].price = e.target.value; return updateFinanceState({ ...prev, customItems: newItems }); })} className="w-20 text-right bg-transparent border-b border-slate-200 outline-none text-sm font-mono" /></div><div className="col-span-2"><div className="flex items-center border border-slate-300 rounded-md bg-white h-9 overflow-hidden"><select value={item.unitType || 'fixed'} onChange={e => setFormData(prev => { const newItems = [...prev.customItems]; newItems[idx].unitType = e.target.value; return updateFinanceState({ ...prev, customItems: newItems }); })} className="bg-slate-100 border-r border-slate-300 h-full px-2 text-[10px]"><option value="fixed">固定</option><option value="perTable">席</option></select><input type="number" value={item.qty || ''} onChange={e => setFormData(prev => { const newItems = [...prev.customItems]; newItems[idx].qty = e.target.value; return updateFinanceState({ ...prev, customItems: newItems }); })} className="w-full h-full text-center outline-none text-sm font-bold" /></div></div><div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">${formatMoney(safeFloat(item.price) * safeFloat(item.qty))}</div><div className="col-span-1 flex justify-center gap-1"><button type="button" onClick={() => setFormData(prev => { const newItems = [...prev.customItems]; newItems[idx].applySC = !item.applySC; return updateFinanceState({ ...prev, customItems: newItems }); })} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.applySC ? 'text-blue-600 bg-blue-50' : 'text-slate-300'}`}>SC</button><button type="button" onClick={() => setFormData(prev => updateFinanceState({ ...prev, customItems: prev.customItems.filter((_, i) => i !== idx) }))} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={14} /></button></div></div>
                  ))}
                  {formData.busInfo?.enabled && (
                    <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors border-b border-slate-100"><div className="col-span-5"><div className="flex items-center"><div className="p-1.5 bg-slate-100 text-slate-500 rounded mr-3 flex-shrink-0"><Truck size={14} /></div><div><span className="font-bold text-slate-700 block text-sm">旅遊巴安排 (Bus Fee)</span><span className="text-xs text-slate-400">來源: 物流分頁</span></div></div></div><div className="col-span-2 flex items-center justify-end"><span className="text-slate-400 text-xs mr-1">$</span><input type="number" value={formData.busCharge} onChange={e => setFormData(prev => updateFinanceState({ ...prev, busCharge: e.target.value }))} className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-sm font-mono text-slate-700" placeholder="0" /></div><div className="col-span-2 text-center text-sm text-slate-500">1</div><div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">${formatMoney(safeFloat(formData.busCharge))}</div><div className="col-span-1 flex justify-center"><button type="button" onClick={() => setFormData(prev => updateFinanceState({ ...prev, busApplySC: !prev.busApplySC }))} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${formData.busApplySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200 opacity-50'}`}>SC</button></div></div>
                  )}
                  <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100"><button type="button" onClick={() => setFormData(prev => ({ ...prev, customItems: [...(prev.customItems || []), { id: Date.now(), name: '', price: '', qty: 1, applySC: true }] }))} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center transition-colors"><Plus size={14} className="mr-1" /> 新增額外項目</button></div>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-6 mt-6">
                <div className="flex-1">
                  {minSpendInfo && (Number(formData.totalAmount) < minSpendInfo.amount) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm flex items-start shadow-sm"><AlertTriangle size={18} className="mr-2 mt-0.5 flex-shrink-0" /><div><p className="font-bold">未達最低消費</p><p className="mt-1">目標: <span className="font-mono font-bold">${minSpendInfo.amount.toLocaleString()}</span><span className="mx-2">|</span>差額: <span className="font-mono font-bold text-red-600">-${(minSpendInfo.amount - Number(formData.totalAmount)).toLocaleString()}</span></p></div></div>
                  )}
                </div>
                <div className="w-full md:w-80 space-y-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100"><label className="flex items-center cursor-pointer text-sm text-slate-600 select-none hover:text-blue-600 transition-colors"><input type="checkbox" checked={formData.enableServiceCharge !== false} onChange={e => setFormData(prev => updateFinanceState({ ...prev, enableServiceCharge: e.target.checked }))} className="mr-2 rounded text-blue-600 focus:ring-blue-500 w-4 h-4" /><span className="font-bold">服務費 (10%)</span></label><div className="text-right"><span className={`font-mono font-bold text-sm ${formData.enableServiceCharge !== false ? 'text-slate-700' : 'text-slate-300 line-through'}`}>+ ${formatMoney(billingSummary.serviceChargeVal)}</span></div></div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100"><span className="text-sm font-bold text-slate-600">折扣 (Discount)</span><div className="relative w-28"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-red-400 text-xs">- $</span><input type="text" value={formData.discount || ''} onChange={handlePriceChange} name="discount" className="w-full text-right text-sm border-b border-slate-300 hover:border-red-300 focus:border-red-500 outline-none text-red-600 font-mono font-bold pl-6 pb-1 bg-transparent" placeholder="0" /></div></div>
                  {billingSummary.ccSurcharge > 0 && (<div className="flex justify-between items-center pb-3 border-b border-slate-100 bg-amber-50/50 -mx-6 px-6 pt-3"><span className="text-sm font-bold text-amber-700">信用卡附加費 (3%)</span><span className="font-mono text-sm text-amber-700 font-bold">+ ${formatMoney(billingSummary.ccSurcharge)}</span></div>)}
                  <div className="flex justify-between items-center pt-2"><span className="text-base font-bold text-slate-800">總金額 (Total)</span><span className="text-2xl font-black text-blue-700 font-mono tracking-tight">${formatMoney(billingSummary.grandTotal)}</span></div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-6">
                <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-4">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <Clock size={18} className="text-blue-600" />
                      付款進度 
                      <span className="text-xs font-medium text-slate-400 ml-1.5 uppercase tracking-widest">(Payment Schedule)</span>
                    </h4>
                  <button 
                    type="button" 
                    title="點擊將根據後台設定的付款規則，自動計算並覆寫各期應付金額及日期。"
                    onClick={() => {
                      const currentTotal = generateBillingSummary(formData).grandTotal;
                      const terms = calculatePaymentTerms(currentTotal, formData.date);
                      if (terms) {
                setFormData(prev => ({ ...prev, ...terms, totalAmount: currentTotal }));
                        addToast("已自動計算付款排程", "success");
                      } else {
                        addToast("找不到符合的付款規則", "error");
                      }
                    }} 
                    className="flex items-center gap-1.5 text-xs font-bold bg-violet-50 text-violet-700 hover:bg-violet-100 px-3 py-1.5 rounded-lg border border-violet-200 transition-colors shadow-sm"
                  >
                    <RotateCw size={14} /> 自動計算排程
                    <Info size={14} className="text-violet-400 ml-0.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <DepositField label="第一期付款 (1st Deposit)" prefix="deposit1" formData={formData} setFormData={setFormData} onUpload={onUploadProof} addToast={addToast} onRemoveProof={onRemoveProof} clientPrefix="1st" />
                  <DepositField label="第二期付款 (2nd Deposit)" prefix="deposit2" formData={formData} setFormData={setFormData} onUpload={onUploadProof} addToast={addToast} onRemoveProof={onRemoveProof} clientPrefix="2nd" />
                  <DepositField label="第三期付款 (3rd Deposit)" prefix="deposit3" formData={formData} setFormData={setFormData} onUpload={onUploadProof} addToast={addToast} onRemoveProof={onRemoveProof} clientPrefix="3rd" />

                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm mt-4 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 bottom-0 w-2 ${formData.balanceReceived ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    <div className="flex flex-col md:flex-row gap-6 pl-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-lg font-bold text-slate-800 flex items-center">
                            {formData.balanceReceived ? '已收總額' : '尚欠尾數'}
                            <span className="text-sm font-medium text-slate-400 ml-1.5 uppercase tracking-widest">{formData.balanceReceived ? '(Total Settled)' : '(Outstanding Balance)'}</span>
                          </h4>
                          <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider ${formData.balanceReceived ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{formData.balanceReceived ? 'Fully Paid' : 'Pending'}</span>
                        </div>
                        {(() => {
                          const total = safeFloat(formData.totalAmount);
                          let amountAlreadyPaid = 0;
                          if (formData.deposit1Received) amountAlreadyPaid += safeFloat(formData.deposit1);
                          if (formData.deposit2Received) amountAlreadyPaid += safeFloat(formData.deposit2);
                          if (formData.deposit3Received) amountAlreadyPaid += safeFloat(formData.deposit3);
                          if (formData.balanceReceived) return <div className="text-3xl font-black text-emerald-600 font-mono mb-3">${formatMoney(total)}</div>;
                          const remainingOwed = total - amountAlreadyPaid;
                          return <div className="text-3xl font-black text-red-600 font-mono mb-3">${formatMoney(remainingOwed)}</div>;
                        })()}
                        <p className="text-[10px] text-slate-400">* 系統僅計算標記為「已收款」的項目</p>
                      </div>
                      <div className="flex flex-col gap-3 w-full md:w-auto min-w-[280px]">
                        <div className="grid grid-cols-2 gap-2">
                          <div><label className="block text-xs font-bold text-slate-400 mb-1">付款方式</label><FormSelect label="" name="paymentMethod" options={['現金', '信用卡', '支票', '轉數快']} value={formData.paymentMethod} onChange={handleInputChange} className="w-full text-sm" /></div>
                          <div><label className="block text-xs font-bold text-slate-400 mb-1">付款日期</label><input type="date" value={formData.balanceDate || ''} onChange={e => setFormData(prev => ({ ...prev, balanceDate: e.target.value }))} className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500" /></div>
                        </div>
                        <div className="flex flex-wrap items-stretch gap-2 mt-1">
                          <label className={`flex flex-1 items-center justify-center space-x-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${formData.balanceReceived ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-300 hover:bg-slate-50'}`}><input type="checkbox" checked={formData.balanceReceived || false} onChange={e => setFormData(prev => ({ ...prev, balanceReceived: e.target.checked }))} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" /><span className={`text-xs font-bold ${formData.balanceReceived ? 'text-emerald-700' : 'text-slate-600'}`}>{formData.balanceReceived ? "確認已收全數尾數" : "標記為已收款"}</span></label>
                          <label className="text-[10px] flex items-center justify-center text-slate-500 hover:text-blue-600 bg-white px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-200 transition-all cursor-pointer shadow-sm shrink-0">
                            <Upload size={14} className="mr-1.5" /> 上傳尾數收據
                            <input type="file" className="hidden" accept="image/*" onChange={async (e) => { const file = e.target.files[0]; if (!file) return; try { addToast("上傳中...", "info"); const url = await onUploadProof(file); setFormData(prev => { const ex = Array.isArray(prev.balanceProof) ? prev.balanceProof : (prev.balanceProof ? [prev.balanceProof] : []); return { ...prev, balanceProof: [...ex, url] }; }); addToast("尾數收據上傳成功", "success"); } catch (err) { addToast("上傳失敗", "error"); } }} />
                          </label>
                        </div>
                        
                        {(() => {
                          const proofs = Array.isArray(formData.balanceProof) ? formData.balanceProof : (formData.balanceProof ? [formData.balanceProof] : []);
                          if (proofs.length === 0) return null;
                          return (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {proofs.map((url, idx) => (
                                <div key={idx} className="flex items-center space-x-1 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
                                  <a href={url} target="_blank" rel="noreferrer" className="flex items-center text-xs text-blue-600 hover:underline truncate max-w-[150px]" title={getFileNameFromUrl(url)}>
                                    <ImageIcon size={14} className="mr-1 shrink-0" /> <span className="truncate">{getFileNameFromUrl(url)}</span>
                                  </a>
                                  <button type="button" onClick={() => onRemoveProof('balanceProof', url)} className="text-slate-400 hover:text-red-500 p-0.5"><X size={12} /></button>
                                </div>
                              ))}
                            </div>
                          );
                        })()}

                        {formData.clientUploadedProofs?.map((proof, globalIdx) => {
                          const proofs = Array.isArray(formData.balanceProof) ? formData.balanceProof : (formData.balanceProof ? [formData.balanceProof] : []);
                          if (!proof.fileName.startsWith('Final') || proofs.includes(proof.url)) return null;
                          return <PendingProofCard key={globalIdx} proof={proof} targetLabel="尾數" targetKey="balanceProof" receivedKey="balanceReceived" currentProofs={proofs} setFormData={setFormData} addToast={addToast} />;
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {formTab === 'venue' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Monitor size={18} className="text-blue-600" />
                  <h4 className="font-bold text-slate-800">場地佈置 (Main Setup)</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><FormSelect label="檯布顏色 (Table Cloth)" name="tableClothColor" options={DECOR_COLORS} value={formData.tableClothColor} onChange={handleInputChange} /><FormSelect label="椅套顏色 (Chair Cover)" name="chairCoverColor" options={DECOR_COLORS} value={formData.chairCoverColor} onChange={handleInputChange} /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 pt-4 border-t border-slate-100">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1.5">主家席顏色 (Head Table Color)</label><div className="flex gap-4 mb-2"><label className="flex items-center space-x-2 text-sm cursor-pointer"><input type="radio" name="headTableColorType" value="same" checked={formData.headTableColorType === 'same'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" /><span>同客席 (Same as Guest)</span></label><label className="flex items-center space-x-2 text-sm cursor-pointer"><input type="radio" name="headTableColorType" value="custom" checked={formData.headTableColorType === 'custom'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" /><span>自訂 (Custom)</span></label></div>{formData.headTableColorType === 'custom' && (<input type="text" name="headTableCustomColor" value={formData.headTableCustomColor} onChange={handleInputChange} placeholder="請輸入主家席顏色" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />)}</div>
                  <div className="bg-pink-50 p-4 rounded-lg border border-pink-100"><div className="flex justify-between items-center mb-2"><label className="font-bold text-slate-700 text-sm">新娘房 / 更衣室</label><label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="bridalRoom" checked={formData.bridalRoom} onChange={e => setFormData(prev => ({ ...prev, bridalRoom: e.target.checked }))} className="rounded text-pink-500" /><span className="text-xs text-slate-500">使用</span></label></div>{formData.bridalRoom && (<input type="text" name="bridalRoomHours" value={formData.bridalRoomHours} onChange={handleInputChange} placeholder="使用時間 e.g. 17:00 - 23:00" className="w-full px-3 py-2 border border-pink-200 rounded-lg text-sm bg-white" />)}</div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Layout size={18} className="text-blue-600" />
                  <h4 className="font-bold text-slate-800">設備與佈置清單 (Equipment & Packages)</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest border-b border-blue-200 pb-1 mb-2 flex items-center gap-1"><Users size={14} /> 舞台與接待設備</h4>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center gap-2"><div className="text-slate-400"><Monitor size={14} /></div><FormCheckbox label="禮堂舞台 (7.2x2.5m)" name="equipment.stage" checked={formData.equipment?.stage} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, stage: e.target.checked } }))} /></div>
                      <div className="flex items-center gap-2"><div className="text-slate-400"><Mic2 size={14} /></div><FormCheckbox label="講台" name="equipment.podium" checked={formData.equipment?.podium} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, podium: e.target.checked } }))} /></div>
                      <div className="flex items-center gap-2"><div className="text-slate-400"><Coffee size={14} /></div><FormCheckbox label="接待桌 (180x60cm)" name="equipment.receptionTable" checked={formData.equipment?.receptionTable} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, receptionTable: e.target.checked } }))} /></div>
                      <div className="flex items-center gap-2"><div className="text-slate-400"><Info size={14} /></div><FormCheckbox label="標示牌 (2個)" name="equipment.signage" checked={formData.equipment?.signage} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, signage: e.target.checked } }))} /></div>
                      <div className="flex items-center gap-2 mt-1"><div className="text-slate-400"><Type size={14} /></div><FormCheckbox label="禮堂字牌" name="equipment.nameSign" checked={formData.equipment?.nameSign} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, nameSign: e.target.checked } }))} />{formData.equipment?.nameSign && (<input className="flex-1 text-[10px] border rounded px-2 py-1 bg-white outline-none focus:border-blue-400 transition-all" placeholder="輸入字牌內容..." value={formData.nameSignText || ''} onChange={(e) => setFormData({ ...formData, nameSignText: e.target.value })} />)}</div>
                      <div className="flex items-center gap-2 mt-1"><div className="text-slate-400"><Cake size={14} /></div><FormCheckbox label="婚宴蛋糕" name="equipment.hasCake" checked={formData.equipment?.hasCake} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, hasCake: e.target.checked } }))} />{formData.equipment?.hasCake && (<div className="flex items-center bg-white px-2 py-0.5 rounded border border-slate-200"><input type="number" className="w-10 text-xs bg-transparent text-slate-700 font-bold outline-none text-center" placeholder="0" value={formData.cakePounds || ''} onChange={(e) => setFormData({ ...formData, cakePounds: e.target.value })} /><span className="text-[9px] text-slate-400 font-bold ml-1">Lbs</span></div>)}</div>
                    </div>
                  </div>
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-widest border-b border-indigo-200 pb-1 mb-2 flex items-center gap-1"><Tv size={14} /> 影音設備 (AV)</h4>
                    <div className="grid grid-cols-1 gap-1.5">
                      <div className="flex items-center gap-2"><div className="text-slate-400"><Video size={14} /></div><FormCheckbox label="大禮堂投影機" name="equipment.grandHallProjector" checked={formData.equipment?.grandHallProjector} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, grandHallProjector: e.target.checked } }))} /></div>
                      <div className="flex items-center gap-2"><div className="text-slate-400"><Monitor size={14} /></div><FormCheckbox label="小禮堂 LED Screen" name="equipment.smallHallLED" checked={formData.equipment?.smallHallLED} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, smallHallLED: e.target.checked } }))} /></div>
                      <div className="flex items-center gap-2"><div className="text-slate-400"><Maximize size={14} /></div><FormCheckbox label="LED 顯示屏 W6.4 x H4m" name="equipment.ledScreen" checked={formData.equipment?.ledScreen} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, ledScreen: e.target.checked } }))} /></div>
                      <div className="flex items-center gap-2"><div className="text-slate-400"><Smartphone size={14} className="rotate-90" /></div><FormCheckbox label="60寸電視 (直)" name="equipment.tvVertical" checked={formData.equipment?.tvVertical} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, tvVertical: e.target.checked } }))} /></div>
                      <div className="flex items-center gap-2"><div className="text-slate-400"><Smartphone size={14} /></div><FormCheckbox label="60寸電視 (橫)" name="equipment.tvHorizontal" checked={formData.equipment?.tvHorizontal} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, tvHorizontal: e.target.checked } }))} /></div>
                      <div className="flex items-center gap-2"><div className="text-slate-400"><Sun size={14} /></div><FormCheckbox label="聚光燈" name="equipment.spotlight" checked={formData.equipment?.spotlight} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, spotlight: e.target.checked } }))} /></div>
                      <div className="flex items-center gap-2"><div className="text-slate-400"><RotateCw size={14} /></div><FormCheckbox label="電腦燈" name="equipment.movingHead" checked={formData.equipment?.movingHead} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, movingHead: e.target.checked } }))} /></div>
                      <div className="flex items-center gap-2"><div className="text-slate-400"><Zap size={14} /></div><FormCheckbox label="進場燈" name="equipment.entranceLight" checked={formData.equipment?.entranceLight} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, entranceLight: e.target.checked } }))} /></div>
                      <div className="flex items-center gap-2"><div className="text-slate-400"><Mic size={14} /></div><FormCheckbox label="無線麥克風 (4支)" name="equipment.wirelessMic" checked={formData.equipment?.wirelessMic} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, wirelessMic: e.target.checked } }))} /></div>
                    </div>
                    <input type="text" placeholder="其他 AV 補充" className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs mt-2" value={formData.avOther || ''} onChange={e => setFormData(prev => ({ ...prev, avOther: e.target.value }))} />
                  </div>
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-rose-800 uppercase tracking-widest border-b border-rose-200 pb-1 mb-2 flex items-center gap-1"><Palette size={14} /> 場地佈置與細項</h4>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center gap-2"><div className="text-slate-400"><ImageIcon size={14} /></div><FormCheckbox label="舞台背景佈置" name="decoration.backdrop" checked={formData.decoration?.backdrop} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, backdrop: e.target.checked } }))} /></div>
                      <div className="flex items-center gap-2"><div className="text-slate-400"><Star size={14} /></div><FormCheckbox label="接待處佈置" name="decoration.receptionDecor" checked={formData.decoration?.receptionDecor} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, receptionDecor: e.target.checked } }))} /></div>
                      <div className="flex items-center gap-2"><div className="text-slate-400"><Flower2 size={14} /></div><FormCheckbox label="絲花擺設" name="decoration.silkFlower" checked={formData.decoration?.silkFlower} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, silkFlower: e.target.checked } }))} /></div>
                      <div className="flex items-center gap-2"><div className="text-slate-400"><FileText size={14} /></div><FormCheckbox label="證婚桌" name="decoration.ceremonyTable" checked={formData.decoration?.ceremonyTable} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, ceremonyTable: e.target.checked } }))} /></div>
                      <div className="flex items-center gap-2"><div className="text-slate-400"><PenTool size={14} /></div><FormCheckbox label="簽名冊" name="decoration.signingBook" checked={formData.decoration?.signingBook} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, signingBook: e.target.checked } }))} /></div>
                      <div className="flex items-center gap-2"><div className="text-slate-400"><Wind size={14} /></div><FormCheckbox label="花圈" name="decoration.flowerAisle" checked={formData.decoration?.flowerAisle} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, flowerAisle: e.target.checked } }))} /></div>
                      <div className="flex items-center gap-2"><div className="text-slate-400"><Frame size={14} /></div><FormCheckbox label="畫架" name="decoration.easel" checked={formData.decoration?.easel} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, easel: e.target.checked } }))} /></div>
                      <div className="flex items-center gap-2 mt-1"><div className="text-slate-400"><Columns size={14} /></div><FormCheckbox label="花柱佈置" name="decoration.hasFlowerPillar" checked={formData.decoration?.hasFlowerPillar} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, hasFlowerPillar: e.target.checked } }))} />{formData.decoration?.hasFlowerPillar && (<div className="flex items-center bg-white px-2 py-0.5 rounded border border-slate-200"><input type="number" className="w-8 text-xs bg-transparent text-slate-700 font-bold outline-none text-center" value={formData.flowerPillarQty || ''} onChange={(e) => setFormData({ ...formData, flowerPillarQty: e.target.value })} /><span className="text-[9px] text-slate-400 font-bold ml-1">支</span></div>)}</div>
                      <div className="flex items-center gap-2 mt-1"><div className="text-slate-400"><Grid size={14} /></div><FormCheckbox label="麻雀枱" name="decoration.hasMahjong" checked={formData.decoration?.hasMahjong} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, hasMahjong: e.target.checked } }))} />{formData.decoration?.hasMahjong && (<div className="flex items-center bg-white px-2 py-0.5 rounded border border-slate-200"><input type="number" className="w-8 text-xs bg-transparent text-slate-700 font-bold outline-none text-center" value={formData.mahjongTableQty || ''} onChange={(e) => setFormData({ ...formData, mahjongTableQty: e.target.value })} /><span className="text-[9px] text-slate-400 font-bold ml-1">張</span></div>)}</div>
                      <div className="flex items-center gap-2 mt-1"><div className="text-slate-400"><Mail size={14} /></div><FormCheckbox label="喜帖" name="decoration.hasInvitation" checked={formData.decoration?.hasInvitation} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, hasInvitation: e.target.checked } }))} />{formData.decoration?.hasInvitation && (<div className="flex items-center bg-white px-2 py-0.5 rounded border border-slate-200"><input type="number" className="w-8 text-xs bg-transparent text-slate-700 font-bold outline-none text-center" value={formData.invitationQty || ''} onChange={(e) => setFormData({ ...formData, invitationQty: e.target.value })} /><span className="text-[9px] text-slate-400 font-bold ml-1">套</span></div>)}</div>
                      <div className="flex items-center gap-2 mt-1"><div className="text-slate-400"><Armchair size={14} /></div><FormCheckbox label="證婚椅子" name="decoration.hasCeremonyChair" checked={formData.decoration?.hasCeremonyChair} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, hasCeremonyChair: e.target.checked } }))} />{formData.decoration?.hasCeremonyChair && (<div className="flex items-center bg-white px-2 py-0.5 rounded border border-slate-200"><input type="number" className="w-8 text-xs bg-transparent text-slate-700 font-bold outline-none text-center" value={formData.ceremonyChairQty || ''} onChange={(e) => setFormData({ ...formData, ceremonyChairQty: e.target.value })} /><span className="text-[9px] text-slate-400 font-bold ml-1">張</span></div>)}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <MapPin size={18} className="text-blue-600" />
                  <h4 className="font-bold text-slate-800">互動平面圖 (Interactive Floorplan)</h4>
                </div>
                <FloorplanEditor 
                  formData={formData} 
                  setFormData={setFormData} 
                  onUploadProof={onUploadProof} 
                  addToast={addToast} 
                  defaultBgImage={appSettings?.defaultFloorplan?.bgImage} 
                  defaultItemScale={appSettings?.defaultFloorplan?.itemScale} 
                  defaultZones={appSettings?.defaultFloorplan?.zones}
                  events={events}
                />
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <ImageIcon size={18} className="text-blue-600" />
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    佈置參考圖與備註 (Decor References & Notes)
                    <Info size={16} className="text-blue-400 cursor-help hover:text-blue-600 transition-colors" title="顯示於 (Displayed in):&#10;• 內部單據 (Internal EO, Briefing)&#10;• 客戶合約 (Contract) - 若勾選" />
                  </h4>
                </div>
                <textarea rows={2} placeholder="文字描述 (Description)..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-none mb-1" value={formData.venueDecor || ''} onChange={(e) => setFormData(prev => ({ ...prev, venueDecor: e.target.value }))} />
                <DocumentVisibilityToggles field="venueDecor" defaultClient={false} defaultInternal={true} />
                <div className="flex flex-wrap gap-3 mt-3">
                  {(formData.venueDecorPhotos || []).map((url, idx) => (<div key={idx} className="relative w-24 h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group"><a href={url} target="_blank" rel="noreferrer" className="block w-full h-full cursor-zoom-in" title="點擊放大"><img src={url} alt="Venue Decor" className="w-full h-full object-cover" /></a><button type="button" onClick={() => setFormData(prev => ({ ...prev, venueDecorPhotos: prev.venueDecorPhotos.filter((_, i) => i !== idx) }))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"><X size={12} /></button></div>))}
                  <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-colors"><ImageIcon size={20} className="mb-1" /><span className="text-[10px] font-bold">新增照片 (多選)</span><input type="file" multiple className="hidden" accept="image/*" onChange={(e) => onMultiImageUpload(e.target.files, 'venueDecorPhotos')} /></label>
                </div>
              </div>
            </div>
          )}

          {formTab === 'logistics' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock size={18} className="text-blue-600" />
                    <h4 className="font-bold text-slate-800">活動流程 (Event Rundown)</h4>
                  </div>
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, rundown: [...(prev.rundown || []), { id: Date.now(), time: '18:30', activity: '' }] }))} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-bold shadow-sm">+ 新增流程</button>
                </div>
                <div className="space-y-2">
                  {(!formData.rundown || formData.rundown.length === 0) && (<div className="text-center py-4 bg-slate-50 border border-slate-100 rounded-lg"><p className="text-sm text-slate-400 font-medium">暫無流程 (No Rundown)</p><p className="text-xs text-slate-400 mt-1">點擊上方按鈕新增活動流程</p></div>)}
                  {(formData.rundown || []).map((item, idx) => (
                    <div key={item.id} className="flex gap-3 items-center group">
                      <input type="text" value={item.time} placeholder="18:30" maxLength={5} onChange={e => { const newList = [...formData.rundown]; newList[idx].time = e.target.value; setFormData(prev => ({ ...prev, rundown: newList })); }} className="w-20 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500 text-center font-mono placeholder:text-slate-300" />
                      <input type="text" value={item.activity} placeholder="活動內容 (Activity)..." onChange={e => { const newList = [...formData.rundown]; newList[idx].activity = e.target.value; setFormData(prev => ({ ...prev, rundown: newList })); }} className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500" />
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, rundown: prev.rundown.filter((_, i) => i !== idx) }))} className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Truck size={18} className="text-blue-600" />
                    <h4 className="font-bold text-slate-800">旅遊巴安排 (Bus Arrangement)</h4>
                  </div>
                  <label className="flex items-center space-x-2 text-xs cursor-pointer select-none"><input type="checkbox" checked={formData.busInfo?.enabled || false} onChange={e => setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, enabled: e.target.checked, arrivals: prev.busInfo?.arrivals || [], departures: prev.busInfo?.departures || [] } }))} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" /><span className={formData.busInfo?.enabled ? "font-bold text-blue-600" : "text-slate-400"}>啟用 (Enable)</span></label>
                </div>
                {formData.busInfo?.enabled && (
                  <div className="space-y-6 animate-in slide-in-from-top-2">
                    <div>
                      <div className="flex justify-between items-center mb-2"><span className="text-sm font-bold text-slate-700">接載 (Arrival): 出發地 {'>'} 璟瓏軒</span><button type="button" onClick={() => setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, arrivals: [...(prev.busInfo.arrivals || []), { id: Date.now(), time: '18:00', location: '', plate: '', price: '' }] } }))} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-bold">+ 新增接載</button></div>
                      <div className="space-y-2">
                        {(!formData.busInfo.arrivals || formData.busInfo.arrivals.length === 0) && (<p className="text-sm text-slate-400 italic py-1">暫無接載安排</p>)}
                        {(formData.busInfo.arrivals || []).map((bus, idx) => (
                          <div key={bus.id} className="flex gap-3 items-center group">
                            <input type="text" value={bus.time} placeholder="18:00" maxLength={5} onChange={e => { const newList = [...formData.busInfo.arrivals]; newList[idx].time = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, arrivals: newList } })); }} className="w-20 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500 text-center font-mono placeholder:text-slate-300" />
                            <input type="text" value={bus.location} placeholder="接載地址 (Location)..." onChange={e => { const newList = [...formData.busInfo.arrivals]; newList[idx].location = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, arrivals: newList } })); }} className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500" />
                            <input type="text" value={bus.plate} placeholder="車牌 (Plate)" onChange={e => { const newList = [...formData.busInfo.arrivals]; newList[idx].plate = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, arrivals: newList } })); }} className="w-24 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500 placeholder:text-slate-300" />
                            <div className="flex items-center w-24 border border-slate-300 rounded px-2 py-1 bg-white focus-within:border-blue-500 overflow-hidden"><span className="text-slate-400 text-xs mr-1">$</span><input type="number" value={bus.price} placeholder="0" onChange={e => { const newList = [...formData.busInfo.arrivals]; newList[idx].price = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, arrivals: newList } })); }} className="w-full text-sm outline-none font-mono bg-transparent" /></div>
                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, arrivals: prev.busInfo.arrivals.filter((_, i) => i !== idx) } }))} className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-slate-100 pt-4">
                      <div className="flex justify-between items-center mb-2"><span className="text-sm font-bold text-slate-700">散席 (Departure): 璟瓏軒 {'>'} 目的地</span><button type="button" onClick={() => setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, departures: [...(prev.busInfo.departures || []), { id: Date.now(), time: '22:30', location: '', plate: '', price: '' }] } }))} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-bold">+ 新增散席</button></div>
                      <div className="space-y-2">
                        {(!formData.busInfo.departures || formData.busInfo.departures.length === 0) && (<p className="text-sm text-slate-400 italic py-1">暫無散席安排</p>)}
                        {(formData.busInfo.departures || []).map((bus, idx) => (
                          <div key={bus.id} className="flex gap-3 items-center group">
                            <input type="text" value={bus.time} placeholder="22:30" maxLength={5} onChange={e => { const newList = [...formData.busInfo.departures]; newList[idx].time = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, departures: newList } })); }} className="w-20 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500 text-center font-mono placeholder:text-slate-300" />
                            <input type="text" value={bus.location} placeholder="散席地址 (Location)..." onChange={e => { const newList = [...formData.busInfo.departures]; newList[idx].location = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, departures: newList } })); }} className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500" />
                            <input type="text" value={bus.plate} placeholder="車牌 (Plate)" onChange={e => { const newList = [...formData.busInfo.departures]; newList[idx].plate = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, departures: newList } })); }} className="w-24 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500 placeholder:text-slate-300" />
                            <div className="flex items-center w-24 border border-slate-300 rounded px-2 py-1 bg-white focus-within:border-blue-500 overflow-hidden"><span className="text-slate-400 text-xs mr-1">$</span><input type="number" value={bus.price} placeholder="0" onChange={e => { const newList = [...formData.busInfo.departures]; newList[idx].price = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, departures: newList } })); }} className="w-full text-sm outline-none font-mono bg-transparent" /></div>
                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, departures: prev.busInfo.departures.filter((_, i) => i !== idx) } }))} className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 flex items-start"><Info size={12} className="mr-1 flex-shrink-0 mt-0.5" /><span>提示：如需向客戶收費，請至「Tab 3: 收費明細 (Billing)」頁面的「旅遊巴安排」總收費欄位手動輸入總費用。</span></div>
                  </div>
                )}
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <MapPin size={18} className="text-blue-600" />
                  <h4 className="font-bold text-slate-800">其他物流 (Other Logistics)</h4>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center mb-3"><label className="text-sm font-bold text-slate-700 flex items-center"><Truck size={16} className="mr-2" /> 送貨/物資安排 (Deliveries)</label><button type="button" onClick={() => setFormData(prev => ({ ...prev, deliveries: [...(prev.deliveries || []), { id: Date.now(), unit: '', date: '', time: '18:30', items: '' }] }))} className="text-xs bg-white border border-slate-300 px-2 py-1 rounded hover:text-blue-600 flex items-center shadow-sm"><Plus size={12} className="mr-1" /> 新增單位</button></div>
                  <div className="space-y-3">
                    {(!formData.deliveries || formData.deliveries.length === 0) && <div className="text-center text-slate-400 text-xs py-2 italic">暫無送貨安排</div>}
                    {(formData.deliveries || []).map((delivery, idx) => (
                      <div key={delivery.id} className="bg-white p-3 rounded border border-slate-200 shadow-sm relative group">
                        <div className="grid grid-cols-12 gap-2 mb-2">
                          <div className="col-span-4"><input type="text" placeholder="單位 (Unit)" className="w-full text-sm font-bold border-b border-slate-200 outline-none" value={delivery.unit} onChange={e => { const d = [...formData.deliveries]; d[idx].unit = e.target.value; setFormData(prev => ({ ...prev, deliveries: d })); }} /></div>
                          <div className="col-span-4"><input type="date" className="w-full text-sm border-b border-slate-200 outline-none" value={delivery.date} onChange={e => { const d = [...formData.deliveries]; d[idx].date = e.target.value; setFormData(prev => ({ ...prev, deliveries: d })); }} /></div>
                          <div className="col-span-3"><input type="text" placeholder="18:30" className="w-full text-sm border-b border-slate-200 outline-none focus:border-blue-500 text-slate-600 text-center font-mono" value={delivery.time} onChange={e => { const d = [...formData.deliveries]; d[idx].time = e.target.value; setFormData(prev => ({ ...prev, deliveries: d })); }} /></div>
                          <div className="col-span-1 text-right"><button type="button" onClick={() => setFormData(prev => ({ ...prev, deliveries: prev.deliveries.filter((_, i) => i !== idx) }))} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button></div>
                        </div>
                        <textarea rows={2} placeholder="物資清單..." className="w-full text-sm bg-slate-50 border border-slate-100 rounded p-2 outline-none resize-none" value={delivery.items} onChange={e => { const d = [...formData.deliveries]; d[idx].items = e.target.value; setFormData(prev => ({ ...prev, deliveries: d })); }} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <label className="text-sm font-bold text-slate-700 flex items-center mb-3"><MapPin size={16} className="mr-2" /> 泊車安排 (Parking)</label>
                  <div className="bg-white p-3 rounded border border-slate-200 mb-3"><span className="text-xs font-bold text-blue-600 uppercase mb-2 block">免費泊車券</span><div className="grid grid-cols-2 gap-4"><div className="flex items-center border rounded px-2 py-1 bg-slate-50"><span className="text-xs text-slate-500 mr-2">數量:</span><input type="number" className="flex-1 bg-transparent outline-none text-sm font-bold" value={formData.parkingInfo?.ticketQty || ''} onChange={e => setFormData(prev => ({ ...prev, parkingInfo: { ...prev.parkingInfo, ticketQty: e.target.value } }))} /><span className="text-xs text-slate-400 ml-1">張</span></div><div className="flex items-center border rounded px-2 py-1 bg-slate-50"><span className="text-xs text-slate-500 mr-2">時數:</span><input type="number" className="flex-1 bg-transparent outline-none text-sm font-bold" value={formData.parkingInfo?.ticketHours || ''} onChange={e => setFormData(prev => ({ ...prev, parkingInfo: { ...prev.parkingInfo, ticketHours: e.target.value } }))} /><span className="text-xs text-slate-400 ml-1">小時</span></div></div></div>
                  <div className="mt-2"><label className="text-xs font-bold text-slate-500 mb-1 block">車牌登記</label><textarea rows={3} value={formData.parkingInfo?.plates || ''} onChange={e => setFormData(prev => ({ ...prev, parkingInfo: { ...prev.parkingInfo, plates: e.target.value } }))} placeholder="請輸入車牌..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-none" /></div>
                </div>
                <div>
                  <FormTextArea 
                    label={
                      <span className="flex items-center gap-1.5">
                        物流備註 (Logistics Notes)
                        <Info size={14} className="text-blue-400 cursor-help hover:text-blue-600 transition-colors" title="顯示於 (Displayed in):&#10;• 內部單據 (Internal EO, Briefing)&#10;• 報價單 / 合約 / 發票 / 收據 (Client Docs) - 若勾選" />
                      </span>
                    } 
                    name="otherNotes" rows={3} value={formData.otherNotes} onChange={handleInputChange} 
                  />
                  <DocumentVisibilityToggles field="otherNotes" defaultClient={true} defaultInternal={true} />
                </div>
              </div>
            </div>
          )}

          {formTab === 'printConfig' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Printer size={18} className="text-blue-600" />
                  <h4 className="font-bold text-slate-800">列印自訂 (Print Customization)</h4>
                </div>
                <div className="bg-violet-50 p-4 rounded-lg border border-violet-100">
                  <h5 className="font-bold text-violet-800 text-sm mb-3">菜譜確認書 (Menu Confirmation)</h5>
                  <div className="space-y-4">
                    <div><label className="block text-sm font-bold text-slate-700 mb-1">菜單字體大小 (Font Size): <span className="text-violet-600">{formData.printSettings?.menu?.fontSizeOverride || 18}px</span></label><div className="flex items-center gap-4"><input type="range" min="12" max="30" step="1" value={formData.printSettings?.menu?.fontSizeOverride || 18} onChange={(e) => setFormData(prev => ({ ...prev, printSettings: { ...prev.printSettings, menu: { ...prev.printSettings?.menu, fontSizeOverride: e.target.value } } }))} className="flex-1 h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600" /><input type="number" value={formData.printSettings?.menu?.fontSizeOverride || 18} onChange={(e) => setFormData(prev => ({ ...prev, printSettings: { ...prev.printSettings, menu: { ...prev.printSettings?.menu, fontSizeOverride: e.target.value } } }))} className="w-16 px-2 py-1 text-sm border border-violet-200 rounded text-center outline-none focus:border-violet-500" /></div><p className="text-[10px] text-slate-400 mt-1">Default: 18px. Adjust smaller for long menus to fit one page.</p></div>
                    <div className="border-t border-violet-200 my-2"></div>
                    <label className="flex items-center space-x-3 cursor-pointer"><div className="relative"><input type="checkbox" className="sr-only peer" checked={formData.printSettings?.menu?.showPlatingFeeDisclaimer !== false} onChange={(e) => setFormData(prev => ({ ...prev, printSettings: { ...prev.printSettings, menu: { ...prev.printSettings?.menu, showPlatingFeeDisclaimer: e.target.checked } } }))} /><div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div></div><span className="text-sm font-bold text-slate-700">顯示「分菜位上附加費」條款</span></label>
                    <div><label className="block text-sm font-bold text-slate-700 mb-1">有效期覆寫 (Validity Date Override)</label><input type="text" placeholder="預設: 今天+14日 (Default: Today+14)" value={formData.printSettings?.menu?.validityDateOverride || ''} onChange={(e) => setFormData(prev => ({ ...prev, printSettings: { ...prev.printSettings, menu: { ...prev.printSettings?.menu, validityDateOverride: e.target.value } } }))} className="w-full px-3 py-2 border border-violet-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none" /></div>
                  </div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100"><h5 className="font-bold text-emerald-800 text-sm mb-3">報價單 (Quotation)</h5><label className="flex items-center space-x-3 cursor-pointer"><div className="relative"><input type="checkbox" className="sr-only peer" checked={formData.printSettings?.quotation?.showClientInfo !== false} onChange={(e) => setFormData(prev => ({ ...prev, printSettings: { ...prev.printSettings, quotation: { ...prev.printSettings?.quotation, showClientInfo: e.target.checked } } }))} /><div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div></div><span className="text-sm font-bold text-slate-700">顯示客戶資料 (Show Client Info)</span></label></div>
              </div>
            </div>
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