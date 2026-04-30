import React, { useState, useEffect } from 'react';
import { Edit2, Plus, Trash2, Utensils, Coffee, PieChart, Map, Maximize, Minimize, Image as ImageIcon, Shield, Building2, Phone, MapPin, Globe, Grid, CreditCard } from 'lucide-react';
import {
  formatMoney, isZoneSelected, getPreferredZoneLabel, DAYS_OF_WEEK, DEPARTMENTS
} from '../../services/billingService';
import { Card, FormInput, MoneyInput, FormTextArea, FormSelect, ConfirmationModal, Modal } from '../../components/ui';
import RolePermissionsTab from './RolePermissionsTab';
import UsersTab from './UsersTab';
import FloorplanEditor from '../../components/FloorplanEditor';
import { ContractRenderer } from '../documents/components/renderers/ContractRenderer';
import { useAuth } from '../../context/AuthContext';
import { getScopedSettings } from '../../services/helpers';
import { useConfirm } from '../../hooks/useConfirm';

const SettingsView = ({ settings, onSave, addToast, onUploadProof, users, updateUserRole, updateUserProfile, deleteUser, events }) => {
  const { selectedVenueId, outlets } = useAuth();
  const { confirmConfig, confirm, closeConfirm } = useConfirm();
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationData, setCalibrationData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLang, setPreviewLang] = useState('en');
  
  // Mock data for preview
  const previewMockData = {
    orderId: 'PREVIEW-001',
    date: new Date().toISOString().split('T')[0],
    startTime: '18:00',
    endTime: '22:00',
    clientName: previewLang === 'zh' ? '張小明 (Sample Client)' : 'Mr. John Doe (Sample Client)',
    venueId: selectedVenueId,
    venueLocation: previewLang === 'zh' ? '全場' : 'Whole Venue',
    eventType: '婚宴 (Wedding Banquet)',
    items: [],
    signatures: {}
  };

  // Scoped Data Logic
  const getInitialSettings = () => {
    return getScopedSettings(settings, selectedVenueId);
  };

  const [localSettings, setLocalSettings] = useState(getInitialSettings());

  // Sync state when venue context or master settings change
  useEffect(() => {
    setLocalSettings(getInitialSettings());
    // Auto-switch tab if incompatible with new view
    if (selectedVenueId === 'all' && ['minSpend', 'menus', 'payment', 'floorplan', 'venueProfile'].includes(activeSubTab)) {
        setActiveSubTab('outlets');
    } else if (selectedVenueId !== 'all' && ['outlets', 'companyInfo', 'users', 'roles'].includes(activeSubTab)) {
        setActiveSubTab('venueProfile');
    }
  }, [selectedVenueId, settings]);

  const [activeSubTab, setActiveSubTab] = useState(selectedVenueId === 'all' ? 'outlets' : 'venueProfile');

  // Handle saving based on scope
  const handleSaveScoped = (updatedData) => {
    let finalSettings;
    if (selectedVenueId === 'all') {
      finalSettings = { ...settings, ...updatedData };
    } else {
      const venues = { ...(settings.venues || {}) };
      venues[selectedVenueId] = {
        ...(venues[selectedVenueId] || {}),
        ...updatedData
      };
      finalSettings = { ...settings, venues };
    }
    onSave(finalSettings);
  };

  const handleStartCalibration = () => {
    if (!localSettings.defaultFloorplan?.bgImage) {
      addToast("請先上傳背景圖再進行校準 (Please upload a map first).", "error");
      return;
    }
    setCalibrationData({
      floorplan: {
        bgImage: localSettings.defaultFloorplan?.bgImage || '',
        itemScale: localSettings.defaultFloorplan?.itemScale || 40,
        zones: localSettings.zonesConfig || [],
        elements: []
      }
    });
    setIsCalibrating(true);
  };

  const handleFinishCalibration = () => {
    if (!calibrationData) return;
    const newScale = calibrationData.floorplan?.itemScale || 40;
    const newZones = calibrationData.floorplan?.zones || localSettings.zonesConfig;
    
    handleSaveScoped({
      defaultFloorplan: { ...localSettings.defaultFloorplan, itemScale: newScale, zones: newZones },
      zonesConfig: newZones // Also update the master zones list for this venue
    });
    setIsCalibrating(false);
    setCalibrationData(null);
    addToast("校準數據已儲存 (Calibration data saved successfully)!", "success");
  };

  // Editing States
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState({ id: null, name: '', color: 'blue' });
  const [editingZone, setEditingZone] = useState({ id: null, nameZh: '', nameEn: '', color: 'rgba(96, 165, 250, 0.3)' });
  const [editingRule, setEditingRule] = useState({ id: null, locations: [], prices: { Mon: { lunch: '', dinner: '' }, Tue: { lunch: '', dinner: '' }, Wed: { lunch: '', dinner: '' }, Thu: { lunch: '', dinner: '' }, Fri: { lunch: '', dinner: '' }, Sat: { lunch: '', dinner: '' }, Sun: { lunch: '', dinner: '' } } });
  const [editingMenu, setEditingMenu] = useState({ id: null, title: '', content: '', type: 'food', priceWeekday: '', priceWeekend: '', allocation: {} });

  // --- Handlers ---
  const handleSaveOutlet = () => {
    if (!editingOutlet.name) return addToast("請輸入分店名稱", "error");
    const newOutlets = [...(settings.outlets || [])];
    if (editingOutlet.id) {
      const idx = newOutlets.findIndex(o => o.id === editingOutlet.id);
      if (idx !== -1) newOutlets[idx] = editingOutlet;
    } else {
      newOutlets.push({ ...editingOutlet, id: `outlet_${Date.now()}` });
    }
    onSave({ ...settings, outlets: newOutlets });
    setEditingOutlet({ id: null, name: '', color: 'blue' });
    addToast("分店清單已更新", "success");
  };

  const handleDeleteOutlet = (id) => {
    if (!window.confirm("確定要刪除此分店嗎？這不會刪除該店的訂單數據。")) return;
    onSave({ ...settings, outlets: (settings.outlets || []).filter(o => o.id !== id) });
    addToast("分店已移除", "info");
  };

  const handleSaveZone = () => {
    if (!editingZone.nameZh) return addToast("請輸入區域中文名稱", "error");
    const newZones = [...(localSettings.zonesConfig || [])];
    const zoneToSave = { 
      ...editingZone, 
      id: editingZone.id || Date.now().toString(),
      venueId: selectedVenueId // Link to current venue
    };

    if (editingZone.id) {
      const idx = newZones.findIndex(z => z.id === editingZone.id);
      if (idx !== -1) newZones[idx] = zoneToSave;
    } else {
      newZones.push(zoneToSave);
    }
    handleSaveScoped({ zonesConfig: newZones });
    setEditingZone({ id: null, nameZh: '', nameEn: '', color: 'rgba(96, 165, 250, 0.3)' });
    addToast("區域設定已儲存", "success");
  };

  const handleDeleteZone = (id) => {
    handleSaveScoped({ zonesConfig: localSettings.zonesConfig.filter(z => z.id !== id) });
  };

  const handleSaveRule = () => {
    if (editingRule.locations.length === 0) return addToast("請至少選擇一個區域", "error");
    const newRules = [...(localSettings.minSpendRules || [])];
    if (editingRule.id) {
      const idx = newRules.findIndex(r => r.id === editingRule.id);
      if (idx !== -1) newRules[idx] = editingRule;
    } else {
      newRules.push({ ...editingRule, id: Date.now() });
    }
    handleSaveScoped({ minSpendRules: newRules });
    setEditingRule({ id: null, locations: [], prices: { Mon: { lunch: '', dinner: '' }, Tue: { lunch: '', dinner: '' }, Wed: { lunch: '', dinner: '' }, Thu: { lunch: '', dinner: '' }, Fri: { lunch: '', dinner: '' }, Sat: { lunch: '', dinner: '' }, Sun: { lunch: '', dinner: '' } } });
    addToast("規則已儲存", "success");
  };

  const handleDeleteRule = (id) => {
    handleSaveScoped({ minSpendRules: localSettings.minSpendRules.filter(r => r.id !== id) });
  };

  const handleSaveMenu = () => {
    if (!editingMenu.title) return addToast("請輸入標題", "error");
    const newMenus = [...(localSettings.defaultMenus || [])];
    if (editingMenu.id) {
      const idx = newMenus.findIndex(m => m.id === editingMenu.id);
      if (idx !== -1) newMenus[idx] = editingMenu;
    } else {
      newMenus.push({ ...editingMenu, id: Date.now() });
    }
    handleSaveScoped({ defaultMenus: newMenus });
    setEditingMenu({ id: null, title: '', content: '', type: 'food', priceWeekday: '', priceWeekend: '', allocation: {} });
    addToast("菜單已儲存", "success");
  };

  const handleDeleteMenu = (id) => {
    handleSaveScoped({ defaultMenus: localSettings.defaultMenus.filter(m => m.id !== id) });
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingBg(true);
    try {
      const url = await onUploadProof(file);
      handleSaveScoped({ defaultFloorplan: { ...(localSettings.defaultFloorplan || {}), bgImage: url } });
      addToast("預設平面圖上傳成功", "success");
    } catch (err) {
      addToast("上傳失敗", "error");
    } finally {
      setIsUploadingBg(false);
    }
  };

  const handleSaveVenueProfile = () => {
    const venueProfiles = { ...(settings.venueProfiles || {}) };
    venueProfiles[selectedVenueId] = localSettings.venueProfile;
    onSave({ ...settings, venueProfiles });
    addToast("分店資料已更新", "success");
  };

  // Helper for static Tailwind classes to ensure JIT compiler includes them
  const getOutletColorClasses = (color) => {
    const map = {
      blue: { bg: 'bg-blue-500', bgLight: 'bg-blue-100', text: 'text-blue-600' },
      emerald: { bg: 'bg-emerald-500', bgLight: 'bg-emerald-100', text: 'text-emerald-600' },
      purple: { bg: 'bg-purple-500', bgLight: 'bg-purple-100', text: 'text-purple-600' },
      indigo: { bg: 'bg-indigo-500', bgLight: 'bg-indigo-100', text: 'text-indigo-600' },
      rose: { bg: 'bg-rose-500', bgLight: 'bg-rose-100', text: 'text-rose-600' },
      amber: { bg: 'bg-amber-500', bgLight: 'bg-amber-100', text: 'text-amber-600' },
      slate: { bg: 'bg-slate-500', bgLight: 'bg-slate-100', text: 'text-slate-600' },
    };
    return map[color] || map.blue;
  };

  // Helper for rendering
  const getPriceVal = (rule, day, type) => {
    if (typeof rule.prices[day] === 'object') return rule.prices[day][type];
    return type === 'dinner' ? rule.prices[day] : '';
  };

  const ZONES = localSettings.zonesConfig || [];
  const LOCATION_LABELS = [...ZONES.map(z => getPreferredZoneLabel(z)), '全場'];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in pb-20">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            {selectedVenueId === 'all' ? <Globe className="text-blue-600" /> : <Building2 className="text-emerald-600" />}
            {selectedVenueId === 'all' ? '集團全域設定 (Global)' : `分店專屬設定: ${outlets.find(o => o.id === selectedVenueId)?.name || '---'}`}
          </h2>
          <p className="text-slate-500">
            {selectedVenueId === 'all' ? '管理分店列表、品牌、角色與全域權限' : '設定該分店的專屬低消、菜單與場地圖'}
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex space-x-1 border-b border-slate-200 overflow-x-auto scrollbar-hide">
        {selectedVenueId === 'all' ? (
          <>
            <button onClick={() => setActiveSubTab('outlets')} className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap ${activeSubTab === 'outlets' ? 'bg-white border-x border-t border-slate-200 text-blue-600 shadow-[0_-2px_10px_-3px_rgba(0,0,0,0.05)]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>分店管理</button>
            <button onClick={() => setActiveSubTab('companyInfo')} className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap ${activeSubTab === 'companyInfo' ? 'bg-white border-x border-t border-slate-200 text-blue-600 shadow-[0_-2px_10px_-3px_rgba(0,0,0,0.05)]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>品牌與標誌</button>
            <button onClick={() => setActiveSubTab('users')} className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap ${activeSubTab === 'users' ? 'bg-white border-x border-t border-slate-200 text-blue-600 shadow-[0_-2px_10px_-3px_rgba(0,0,0,0.05)]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>用戶管理</button>
            <button onClick={() => setActiveSubTab('roles')} className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap ${activeSubTab === 'roles' ? 'bg-white border-x border-t border-slate-200 text-blue-600 shadow-[0_-2px_10px_-3px_rgba(0,0,0,0.05)]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>角色權限</button>
          </>
        ) : (
          <>
            <button onClick={() => setActiveSubTab('venueProfile')} className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap ${activeSubTab === 'venueProfile' ? 'bg-white border-x border-t border-slate-200 text-blue-600 shadow-[0_-2px_10px_-3px_rgba(0,0,0,0.05)]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>分店資料</button>
            <button onClick={() => setActiveSubTab('minSpend')} className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap ${activeSubTab === 'minSpend' ? 'bg-white border-x border-t border-slate-200 text-blue-600 shadow-[0_-2px_10px_-3px_rgba(0,0,0,0.05)]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>低消規則</button>
            <button onClick={() => setActiveSubTab('menus')} className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap ${activeSubTab === 'menus' ? 'bg-white border-x border-t border-slate-200 text-blue-600 shadow-[0_-2px_10px_-3px_rgba(0,0,0,0.05)]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>菜單預設</button>
            <button onClick={() => setActiveSubTab('floorplan')} className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap ${activeSubTab === 'floorplan' ? 'bg-white border-x border-t border-slate-200 text-blue-600 shadow-[0_-2px_10px_-3px_rgba(0,0,0,0.05)]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>平面圖預設</button>
          </>
        )}
      </div>

      {/* --- Tab Content --- */}

      {activeSubTab === 'outlets' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in">
          <div className="md:col-span-5">
            <Card className="p-6 border-l-4 border-l-blue-600">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Building2 size={20} className="text-blue-600" /> {editingOutlet.id ? '編輯分店' : '新增分店'}</h3>
              <div className="space-y-4">
                <FormInput label="分店名稱" placeholder="例如: 璟瓏軒 (故宮)" value={editingOutlet.name} onChange={e => setEditingOutlet(p => ({ ...p, name: e.target.value }))} />
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">主題顏色</label>
                  <div className="flex flex-wrap gap-2">
                    {['blue', 'emerald', 'purple', 'indigo', 'rose', 'amber', 'slate'].map(color => {
                      const colors = getOutletColorClasses(color);
                      return (
                        <button key={color} onClick={() => setEditingOutlet(p => ({ ...p, color }))} className={`w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center ${editingOutlet.color === color ? 'border-slate-900 scale-110 shadow-lg' : 'border-transparent hover:scale-105 opacity-60'}`}>
                          <div className={`w-6 h-6 rounded-lg ${colors.bg} shadow-inner`}></div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="pt-4 flex gap-2">
                  <button onClick={handleSaveOutlet} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-100 active:scale-95">儲存分店</button>
                  {editingOutlet.id && <button onClick={() => setEditingOutlet({ id: null, name: '', color: 'blue' })} className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">取消</button>}
                </div>
              </div>
            </Card>
          </div>
          <div className="md:col-span-7">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700">現有分店 ({outlets.length})</div>
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {outlets.map(o => {
                  const colors = getOutletColorClasses(o.color);
                  return (
                    <div key={o.id} className="p-4 flex items-center justify-between hover:bg-slate-50 group">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl ${colors.bgLight} flex items-center justify-center ${colors.text}`}><Building2 size={20} /></div>
                        <div><p className="font-bold text-slate-800">{o.name}</p><p className="text-[10px] text-slate-400 font-mono">ID: {o.id}</p></div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => setEditingOutlet(o)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteOutlet(o.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'companyInfo' && (
        <Card className="p-6 border-l-4 border-l-blue-500 animate-in fade-in">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><ImageIcon size={20} /> 集團標誌 (Organization Logo)</h3>
          <div className="flex gap-8 items-center">
            <div className="w-40 h-32 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center bg-slate-50 relative overflow-hidden group">
              {localSettings.companyLogoUrl ? (
                <>
                  <img src={localSettings.companyLogoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                  <button 
                    onClick={() => confirm("刪除標誌", "確定要刪除集團標誌嗎？", () => handleSaveScoped({ companyLogoUrl: '' }))} 
                    className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center backdrop-blur-sm active:scale-95"
                  >
                    <Trash2 size={16} />
                  </button>
                  </>
                  ) : <span className="text-xs text-slate-400 font-bold">No Logo</span>}            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-500 mb-4 leading-relaxed font-medium">此標誌將作為集團品牌，預設顯示於所有分店的文件中。</p>
              <label className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl cursor-pointer hover:bg-blue-700 transition-all font-bold text-sm shadow-lg">
                <Plus size={18} /> {isUploadingBg ? '上傳中...' : '更換標誌'}
                <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                  const file = e.target.files[0]; if (!file) return;
                  setIsUploadingBg(true);
                  try { const url = await onUploadProof(file); handleSaveScoped({ companyLogoUrl: url }); addToast("上傳成功", "success"); }
                  catch(err) { addToast("失敗", "error"); }
                  setIsUploadingBg(false);
                }} />
              </label>
            </div>
          </div>
        </Card>
      )}

      {activeSubTab === 'venueProfile' && (
        <Card className="p-6 border-l-4 border-l-emerald-500 animate-in fade-in">
          <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2"><Building2 className="text-emerald-500" /> 分店基本資料</h3>
          <div className="space-y-5">
            <FormInput label="分店名稱 (中文)" value={localSettings.venueProfile?.nameZh || ''} onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), nameZh: e.target.value } }))} />
            <FormInput label="Venue Name (English)" value={localSettings.venueProfile?.nameEn || ''} onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), nameEn: e.target.value } }))} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormInput label="聯絡電話" icon={Phone} value={localSettings.venueProfile?.phone || ''} onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), phone: e.target.value } }))} />
              <FormInput label="官方網站" icon={Globe} value={localSettings.venueProfile?.website || ''} onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), website: e.target.value } }))} />
            </div>
            <FormTextArea label="詳細地址" icon={MapPin} value={localSettings.venueProfile?.address || ''} onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), address: e.target.value } }))} />
            
            <div className="border-t border-slate-100 pt-6 mt-6">
              <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">單據條款設定 (Document Terms)</h4>
              <div className="space-y-6">
                <FormTextArea 
                  label="報價單付款條款 (Quotation Payment Terms) - 使用 **文字** 來粗體" 
                  placeholder="例如: **50% deposit** required to confirm..."
                  value={localSettings.venueProfile?.paymentTermsQuotation || ''} 
                  onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), paymentTermsQuotation: e.target.value } }))} 
                />
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6 mt-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <CreditCard size={18} className="text-blue-600" /> 付款方式設定 (Payment Methods Configuration)
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200">
                      <input type="checkbox" id="showInQuotation" checked={localSettings.venueProfile?.paymentConfig?.showInQuotation} onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), paymentConfig: { ...(p.venueProfile?.paymentConfig || {}), showInQuotation: e.target.checked } } }))} className="rounded text-blue-600" />
                      <label htmlFor="showInQuotation" className="text-xs font-bold text-slate-700">顯示於報價單 (Quotation)</label>
                    </div>
                    <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200">
                      <input type="checkbox" id="showInInvoice" checked={localSettings.venueProfile?.paymentConfig?.showInInvoice} onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), paymentConfig: { ...(p.venueProfile?.paymentConfig || {}), showInInvoice: e.target.checked } } }))} className="rounded text-blue-600" />
                      <label htmlFor="showInInvoice" className="text-xs font-bold text-slate-700">顯示於發票 (Invoice)</label>
                    </div>
                    <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200">
                      <input type="checkbox" id="showInContract" checked={localSettings.venueProfile?.paymentConfig?.showInContract} onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), paymentConfig: { ...(p.venueProfile?.paymentConfig || {}), showInContract: e.target.checked } } }))} className="rounded text-blue-600" />
                      <label htmlFor="showInContract" className="text-xs font-bold text-slate-700">顯示於合約 (Contract)</label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Bank Transfer */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <input type="checkbox" checked={localSettings.venueProfile?.paymentConfig?.bankTransfer?.enabled} onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), paymentConfig: { ...(p.venueProfile?.paymentConfig || {}), bankTransfer: { ...(p.venueProfile?.paymentConfig?.bankTransfer || {}), enabled: e.target.checked } } } }))} className="rounded" />
                        <span className="font-bold text-sm text-slate-800">銀行轉帳 (Bank Transfer)</span>
                      </div>
                      {localSettings.venueProfile?.paymentConfig?.bankTransfer?.enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input type="text" placeholder="銀行名稱 (Bank Name)" className="text-xs border rounded p-2" value={localSettings.venueProfile?.paymentConfig?.bankTransfer?.bank || ''} onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), paymentConfig: { ...(p.venueProfile?.paymentConfig || {}), bankTransfer: { ...(p.venueProfile?.paymentConfig?.bankTransfer || {}), bank: e.target.value } } } }))} />
                          <input type="text" placeholder="賬戶名稱 (A/C Name)" className="text-xs border rounded p-2" value={localSettings.venueProfile?.paymentConfig?.bankTransfer?.name || ''} onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), paymentConfig: { ...(p.venueProfile?.paymentConfig || {}), bankTransfer: { ...(p.venueProfile?.paymentConfig?.bankTransfer || {}), name: e.target.value } } } }))} />
                          <input type="text" placeholder="賬戶號碼 (A/C No.)" className="text-xs border rounded p-2" value={localSettings.venueProfile?.paymentConfig?.bankTransfer?.account || ''} onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), paymentConfig: { ...(p.venueProfile?.paymentConfig || {}), bankTransfer: { ...(p.venueProfile?.paymentConfig?.bankTransfer || {}), account: e.target.value } } } }))} />
                        </div>
                      )}
                    </div>

                    {/* FPS & Cheque */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-2">
                          <input type="checkbox" checked={localSettings.venueProfile?.paymentConfig?.fps?.enabled} onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), paymentConfig: { ...(p.venueProfile?.paymentConfig || {}), fps: { ...(p.venueProfile?.paymentConfig?.fps || {}), enabled: e.target.checked } } } }))} className="rounded" />
                          <span className="font-bold text-sm text-slate-800">FPS (轉數快)</span>
                        </div>
                        {localSettings.venueProfile?.paymentConfig?.fps?.enabled && (
                          <input type="text" placeholder="FPS ID / Phone / Email" className="w-full text-xs border rounded p-2" value={localSettings.venueProfile?.paymentConfig?.fps?.id || ''} onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), paymentConfig: { ...(p.venueProfile?.paymentConfig || {}), fps: { ...(p.venueProfile?.paymentConfig?.fps || {}), id: e.target.value } } } }))} />
                        )}
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-2">
                          <input type="checkbox" checked={localSettings.venueProfile?.paymentConfig?.cheque?.enabled} onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), paymentConfig: { ...(p.venueProfile?.paymentConfig || {}), cheque: { ...(p.venueProfile?.paymentConfig?.cheque || {}), enabled: e.target.checked } } } }))} className="rounded" />
                          <span className="font-bold text-sm text-slate-800">支票 (Cheque)</span>
                        </div>
                        {localSettings.venueProfile?.paymentConfig?.cheque?.enabled && (
                          <input type="text" placeholder="抬頭人 (Payable To)" className="w-full text-xs border rounded p-2" value={localSettings.venueProfile?.paymentConfig?.cheque?.payableTo || ''} onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), paymentConfig: { ...(p.venueProfile?.paymentConfig || {}), cheque: { ...(p.venueProfile?.paymentConfig?.cheque || {}), payableTo: e.target.value } } } }))} />
                        )}
                      </div>
                    </div>

                    {/* e-Wallet */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-2">
                          <input type="checkbox" checked={localSettings.venueProfile?.paymentConfig?.wechat?.enabled} onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), paymentConfig: { ...(p.venueProfile?.paymentConfig || {}), wechat: { ...(p.venueProfile?.paymentConfig?.wechat || {}), enabled: e.target.checked } } } }))} className="rounded" />
                          <span className="font-bold text-sm text-slate-800">WeChat Pay (微信支付)</span>
                        </div>
                        {localSettings.venueProfile?.paymentConfig?.wechat?.enabled && (
                          <input type="text" placeholder="備註 (Remarks)" className="w-full text-xs border rounded p-2" value={localSettings.venueProfile?.paymentConfig?.wechat?.remarks || ''} onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), paymentConfig: { ...(p.venueProfile?.paymentConfig || {}), wechat: { ...(p.venueProfile?.paymentConfig?.wechat || {}), remarks: e.target.value } } } }))} />
                        )}
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-2">
                          <input type="checkbox" checked={localSettings.venueProfile?.paymentConfig?.alipay?.enabled} onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), paymentConfig: { ...(p.venueProfile?.paymentConfig || {}), alipay: { ...(p.venueProfile?.paymentConfig?.alipay || {}), enabled: e.target.checked } } } }))} className="rounded" />
                          <span className="font-bold text-sm text-slate-800">Alipay (支付寶)</span>
                        </div>
                        {localSettings.venueProfile?.paymentConfig?.alipay?.enabled && (
                          <input type="text" placeholder="備註 (Remarks)" className="w-full text-xs border rounded p-2" value={localSettings.venueProfile?.paymentConfig?.alipay?.remarks || ''} onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), paymentConfig: { ...(p.venueProfile?.paymentConfig || {}), alipay: { ...(p.venueProfile?.paymentConfig?.alipay || {}), remarks: e.target.value } } } }))} />
                        )}
                      </div>
                    </div>

                    {/* Credit Card */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <input type="checkbox" checked={localSettings.venueProfile?.paymentConfig?.creditCard?.enabled} onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), paymentConfig: { ...(p.venueProfile?.paymentConfig || {}), creditCard: { ...(p.venueProfile?.paymentConfig?.creditCard || {}), enabled: e.target.checked } } } }))} className="rounded" />
                        <span className="font-bold text-sm text-slate-800">信用卡 (Credit Card)</span>
                      </div>
                      {localSettings.venueProfile?.paymentConfig?.creditCard?.enabled && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">附加費 (Surcharge %):</span>
                          <input type="number" step="0.1" className="w-20 text-xs border rounded p-2" value={localSettings.venueProfile?.paymentConfig?.creditCard?.surcharge || 3} onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), paymentConfig: { ...(p.venueProfile?.paymentConfig || {}), creditCard: { ...(p.venueProfile?.paymentConfig?.creditCard || {}), surcharge: parseFloat(e.target.value) } } } }))} />
                          <span className="text-xs text-slate-500">%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <FormTextArea 
                  label="合約完整條款 - 英文 (Contract Full Terms & Conditions - EN)" 
                  placeholder="Enter full terms in English..."
                  rows={8}
                  value={localSettings.venueProfile?.contractTerms || ''} 
                  onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), contractTerms: e.target.value } }))} 
                />
                <FormTextArea 
                  label="合約完整條款 - 中文 (Contract Full Terms & Conditions - ZH)" 
                  placeholder="請輸入中文完整條款及細則..."
                  rows={8}
                  value={localSettings.venueProfile?.contractTermsZh || ''} 
                  onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), contractTermsZh: e.target.value } }))} 
                />

                <div className="border-t border-slate-100 pt-6 mt-2">
                  <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">合約開首文字範本 (Contract Intro Templates)</h4>
                  <p className="text-[10px] text-slate-400 mb-4">可用變數: {"{{venue}}"}, {"{{event}}"}, {"{{date}}"}, {"{{start}}"}, {"{{end}}"}</p>
                  <div className="space-y-4">
                    <FormTextArea 
                      label="開首文字 - 英文 (Intro - EN)" 
                      placeholder="Leave empty for default template..."
                      rows={4}
                      value={localSettings.venueProfile?.contractIntroEn || ''} 
                      onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), contractIntroEn: e.target.value } }))} 
                    />
                    <FormTextArea 
                      label="開首文字 - 中文 (Intro - ZH)" 
                      placeholder="留空將使用預設範本..."
                      rows={4}
                      value={localSettings.venueProfile?.contractIntroZh || ''} 
                      onChange={e => setLocalSettings(p => ({ ...p, venueProfile: { ...(p.venueProfile || {}), contractIntroZh: e.target.value } }))} 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button 
                onClick={() => { setPreviewLang('en'); setShowPreview(true); }} 
                className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95 flex items-center gap-2"
              >
                <ImageIcon size={18} /> Preview (EN)
              </button>
              <button 
                onClick={() => { setPreviewLang('zh'); setShowPreview(true); }} 
                className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95 flex items-center gap-2"
              >
                <ImageIcon size={18} /> 預覽效果 (ZH)
              </button>
              <button onClick={handleSaveVenueProfile} className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-bold hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all active:scale-95">儲存分店資料</button>
            </div>

            {showPreview && (
              <Modal
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                title={previewLang === 'en' ? "Contract Preview (English)" : "合約預覽 (中文)"}
              >
                <div className="bg-slate-500 p-8 min-h-screen">
                  <ContractRenderer 
                    data={previewMockData} 
                    isCn={previewLang === 'zh'}
                    appSettings={{
                      ...settings,
                      venueProfiles: {
                        ...settings.venueProfiles,
                        [selectedVenueId]: localSettings.venueProfile
                      }
                    }} 
                  />
                </div>
              </Modal>
            )}
          </div>
        </Card>
      )}

      {activeSubTab === 'minSpend' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in">
          <div className="md:col-span-5"><Card className="p-5 border-l-4 border-l-blue-500">
            <h3 className="font-bold text-lg text-slate-800 mb-4">{editingRule.id ? "編輯" : "新增"}低消規則</h3>
            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-700">選擇區域</label>
              <div className="flex flex-wrap gap-2">{LOCATION_LABELS.map(loc => (
                <button key={loc} onClick={() => setEditingRule(p => ({...p, locations: p.locations.includes(loc) ? p.locations.filter(l=>l!==loc) : [...p.locations, loc]}))} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${editingRule.locations.includes(loc) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>{loc}</button>
              ))}</div>
              <div className="grid grid-cols-7 gap-1 pt-2">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day} className="flex flex-col gap-1 items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase mb-1">{day}</span>
                    <input 
                      type="number" 
                      placeholder="L" 
                      value={editingRule.prices[day]?.lunch || ''} 
                      onChange={e=>setEditingRule(p=>({...p, prices: {...p.prices, [day]: {...p.prices[day], lunch: e.target.value}}}))} 
                      className="w-full px-1 py-1 text-[10px] border rounded text-center focus:border-blue-500 outline-none transition-colors" 
                    />
                    <input 
                      type="number" 
                      placeholder="D" 
                      value={editingRule.prices[day]?.dinner || ''} 
                      onChange={e=>setEditingRule(p=>({...p, prices: {...p.prices, [day]: {...p.prices[day], dinner: e.target.value}}}))} 
                      className="w-full px-1 py-1 text-[10px] border rounded bg-blue-50/30 text-center focus:border-blue-500 outline-none transition-colors" 
                    />
                  </div>
                ))}
              </div>
              <button onClick={handleSaveRule} className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold shadow-lg shadow-blue-100">儲存規則</button>
            </div>
          </Card></div>
          <div className="md:col-span-7"><div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b font-bold text-slate-700">當前分店規則</div>
            <div className="divide-y max-h-[500px] overflow-y-auto">{localSettings.minSpendRules.map(rule=>(
              <div key={rule.id} className="p-4 hover:bg-slate-50 transition-all group">
                <div className="flex justify-between items-start mb-2"><div className="flex flex-wrap gap-1">{rule.locations.map(l=><span key={l} className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold">{l}</span>)}</div>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-all"><button onClick={()=>setEditingRule(rule)} className="p-1 text-blue-600"><Edit2 size={14}/></button><button onClick={()=>handleDeleteRule(rule.id)} className="p-1 text-red-500"><Trash2 size={14}/></button></div></div>
                <div className="grid grid-cols-7 gap-1">{DAYS_OF_WEEK.map(day=><div key={day} className="text-[8px] border p-1 rounded text-center"><p className="font-bold">{day}</p><p className="text-blue-600">${parseInt(getPriceVal(rule, day, 'dinner')/1000)}k</p></div>)}</div>
              </div>
            ))}</div>
          </div></div>
        </div>
      )}

      {activeSubTab === 'menus' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in">
          <div className="md:col-span-5"><Card className="p-5 border-l-4 border-l-emerald-500">
            <h3 className="font-bold text-lg text-slate-800 mb-4">{editingMenu.id ? "編輯" : "新增"}預設套餐</h3>
            <div className="space-y-4">
              <FormSelect 
                label="類別" 
                value={editingMenu.type || 'food'} 
                options={[
                  { label: '食物套餐 (Food Package)', value: 'food' },
                  { label: '酒水套餐 (Beverage Package)', value: 'drink' }
                ]}
                onChange={e=>setEditingMenu(p=>({...p, type:e.target.value}))} 
              />
              <FormInput label="標題" value={editingMenu.title} onChange={e=>setEditingMenu(p=>({...p, title:e.target.value}))} />
              <div className="grid grid-cols-2 gap-3">
                <MoneyInput label="平日價" value={editingMenu.priceWeekday} onChange={e=>setEditingMenu(p=>({...p, priceWeekday:e.target.value}))} />
                <MoneyInput label="週末價" value={editingMenu.priceWeekend} onChange={e=>setEditingMenu(p=>({...p, priceWeekend:e.target.value}))} />
              </div>
              <FormTextArea label="套餐內容" rows={8} value={editingMenu.content} onChange={e=>setEditingMenu(p=>({...p, content:e.target.value}))} />
              <button onClick={handleSaveMenu} className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-100 transition-all active:scale-95">儲存套餐設定</button>
            </div>
          </Card></div>
          <div className="md:col-span-7 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                <span className="font-bold text-emerald-800">食物套餐 (Food Packages)</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                  {localSettings.defaultMenus.filter(m => m.type === 'food' || !m.type).length} Items
                </span>
              </div>
              <div className="divide-y max-h-[400px] overflow-y-auto">
                {localSettings.defaultMenus.filter(m => m.type === 'food' || !m.type).map(m=>(
                  <div key={m.id} className="p-4 hover:bg-slate-50 group">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{m.title}</span>
                      <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-all">
                        <button onClick={()=>setEditingMenu(m)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit2 size={14}/></button>
                        <button onClick={()=>handleDeleteMenu(m.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14}/></button>
                      </div>
                    </div>
                    <div className="flex gap-2 text-[10px] mt-1 text-slate-400 font-bold uppercase">
                      <span>平日: ${formatMoney(m.priceWeekday)}</span>
                      <span>週末: ${formatMoney(m.priceWeekend)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 italic">{m.content || '(No content)'}</p>
                  </div>
                ))}
                {localSettings.defaultMenus.filter(m => m.type === 'food' || !m.type).length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-sm italic">尚未設定食物套餐</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                <span className="font-bold text-blue-800">酒水套餐 (Beverage Packages)</span>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                  {localSettings.defaultMenus.filter(m => m.type === 'drink').length} Items
                </span>
              </div>
              <div className="divide-y max-h-[400px] overflow-y-auto">
                {localSettings.defaultMenus.filter(m => m.type === 'drink').map(m=>(
                  <div key={m.id} className="p-4 hover:bg-slate-50 group">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{m.title}</span>
                      <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-all">
                        <button onClick={()=>setEditingMenu(m)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit2 size={14}/></button>
                        <button onClick={()=>handleDeleteMenu(m.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14}/></button>
                      </div>
                    </div>
                    <div className="flex gap-2 text-[10px] mt-1 text-slate-400 font-bold uppercase">
                      <span>平日: ${formatMoney(m.priceWeekday)}</span>
                      <span>週末: ${formatMoney(m.priceWeekend)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 italic">{m.content || '(No content)'}</p>
                  </div>
                ))}
                {localSettings.defaultMenus.filter(m => m.type === 'drink').length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-sm italic">尚未設定酒水套餐</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'roles' && (
        <RolePermissionsTab settings={localSettings} onSave={onSave} setLocalSettings={setLocalSettings} addToast={addToast} />
      )}
      
      {activeSubTab === 'users' && (
        <UsersTab users={users} appSettings={localSettings} updateUserRole={updateUserRole} updateUserProfile={updateUserProfile} deleteUser={deleteUser} addToast={addToast} />
      )}

      {activeSubTab === 'floorplan' && (
        <div className="space-y-6 animate-in fade-in">
          <Card className="p-6 border-l-4 border-l-amber-500">
            <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
              <Map className="text-amber-500" /> 預設平面圖背景 (Default Map Background)
            </h3>
            <div className="space-y-6">
              <div className="w-full h-80 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center bg-slate-50 relative overflow-hidden group shadow-inner">
                {localSettings.defaultFloorplan?.bgImage ? (
                  <>
                    <img src={localSettings.defaultFloorplan.bgImage} className="w-full h-full object-contain p-4" alt="Default Floorplan" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                      <button 
                        onClick={() => confirm(
                          "刪除預設地圖", 
                          "確定要刪除預設平面圖嗎？刪除後，新訂單將預設為無背景圖的空白網格。", 
                          () => {
                            handleSaveScoped({ defaultFloorplan: { ...localSettings.defaultFloorplan, bgImage: '' } });
                            addToast("預設地圖已清除", "info");
                          }
                        )} 
                        className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-xl transition-all flex items-center gap-2 font-bold active:scale-95"
                      >
                        <Trash2 size={20} /> 刪除地圖 (Delete Map)
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-8">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ImageIcon size={32} className="text-slate-300" />
                    </div>
                    <span className="text-slate-400 font-bold block">尚未設定預設背景圖</span>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">No Default Map Uploaded</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-4">
                <label className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-slate-200 py-3.5 rounded-2xl font-black text-slate-700 hover:border-amber-400 hover:text-amber-600 transition-all cursor-pointer shadow-sm active:scale-95">
                  <ImageIcon size={20} /> {isUploadingBg ? '正在上傳...' : '上傳預設地圖 (Upload Default)'}
                  <input type="file" className="hidden" accept="image/*" onChange={handleBgUpload} />
                </label>
                <button 
                  onClick={handleStartCalibration}
                  className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
                >
                  <Maximize size={20} /> 全螢幕校準 (Fullscreen Calibrate)
                </button>
              </div>
            </div>
          </Card>

          {isCalibrating && calibrationData && (
            <FloorplanEditor
              formData={calibrationData}
              setFormData={setCalibrationData}
              onClose={handleFinishCalibration}
              initialFullscreen={true}
              defaultZones={localSettings.zonesConfig}
              events={events}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Zone Management */}
            <Card className="p-6 border-l-4 border-l-indigo-500">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <Grid className="text-indigo-500" /> 已設定區域 (Defined Zones)
                </h3>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label="中文名稱" placeholder="紅區" value={editingZone.nameZh} onChange={e => setEditingZone(p => ({ ...p, nameZh: e.target.value }))} />
                  <FormInput label="English Name" placeholder="Red Zone" value={editingZone.nameEn} onChange={e => setEditingZone(p => ({ ...p, nameEn: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">區域標籤顏色 (Color)</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'rgba(248, 113, 113, 0.3)', // Red
                      'rgba(250, 204, 21, 0.3)',  // Yellow
                      'rgba(52, 211, 153, 0.3)',  // Green
                      'rgba(96, 165, 250, 0.3)',  // Blue
                      'rgba(167, 139, 250, 0.3)', // Purple
                      'rgba(251, 146, 60, 0.3)',  // Orange
                      'rgba(148, 163, 184, 0.3)'  // Slate
                    ].map(color => (
                      <button 
                        key={color} 
                        onClick={() => setEditingZone(p => ({ ...p, color }))} 
                        className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${editingZone.color === color ? 'border-slate-900 scale-110' : 'border-transparent hover:scale-105'}`}
                      >
                        <div className="w-6 h-6 rounded-full shadow-inner" style={{ backgroundColor: color.replace('0.3', '1') }}></div>
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={handleSaveZone} className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                  {editingZone.id ? '更新區域' : '新增區域'}
                </button>
              </div>

              <div className="divide-y divide-slate-100 border-t border-slate-100 mt-6 pt-4">
                {(localSettings.zonesConfig || []).map(zone => (
                  <div key={zone.id} className="py-3 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: zone.color }}></div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{zone.nameZh}</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{zone.nameEn}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => setEditingZone(zone)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                      <button onClick={() => handleDeleteZone(zone.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
                {(!localSettings.zonesConfig || localSettings.zonesConfig.length === 0) && (
                   <p className="text-center py-6 text-sm text-slate-400 italic">尚未設定自訂區域 (No zones defined)</p>
                )}
              </div>
            </Card>

            {/* Object Scale Settings */}
            <Card className="p-6 border-l-4 border-l-blue-500 flex flex-col">
              <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                <Maximize size={20} className="text-blue-500" /> 預設物件比例 (Default Scale)
              </h3>
              
              <div className="flex-1 flex flex-col justify-center space-y-8">
                <div className="text-center">
                  <div className="inline-flex items-end gap-1 mb-2">
                    <span className="text-6xl font-black text-slate-900 font-mono tracking-tighter">
                      {localSettings.defaultFloorplan?.itemScale || 40}
                    </span>
                    <span className="text-slate-400 font-bold mb-2">px/m</span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
                    此數值決定新訂單載入時，1x1m 的網格基準為多少像素。可使用全螢幕校準對齊。
                  </p>
                </div>

                <div className="space-y-4">
                  <input 
                    type="range" 
                    min="10" 
                    max="150" 
                    step="1"
                    value={localSettings.defaultFloorplan?.itemScale || 40} 
                    onChange={e => {
                      const newScale = Number(e.target.value);
                      setLocalSettings(p => ({
                        ...p,
                        defaultFloorplan: { ...(p.defaultFloorplan || {}), itemScale: newScale }
                      }));
                    }} 
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                  />
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>10px (Small)</span>
                    <span>150px (Large)</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <button 
                  onClick={() => {
                    handleSaveScoped({ 
                      defaultFloorplan: { 
                        ...(localSettings.defaultFloorplan || {}), 
                        itemScale: localSettings.defaultFloorplan?.itemScale || 40 
                      } 
                    });
                    addToast("物件比例已儲存", "success");
                  }}
                  className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-black shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
                >
                  儲存平面圖比例設定
                </button>
              </div>
            </Card>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
};

export default SettingsView;