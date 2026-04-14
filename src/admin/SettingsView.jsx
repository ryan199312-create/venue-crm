import React, { useState } from 'react';
import { Edit2, Plus, Trash2, Utensils, Coffee, PieChart, Map, Maximize, Minimize } from 'lucide-react';
import {
  LOCATION_CHECKBOXES, DAYS_OF_WEEK, DEPARTMENTS,
  formatMoney
} from '../utils/vmsUtils';
import { Card, FormInput, MoneyInput, FormTextArea } from '../components/ui';

const SettingsView = ({ settings, onSave, addToast, onUploadProof }) => {
  const [localSettings, setLocalSettings] = useState({ minSpendRules: [], defaultMenus: [], paymentRules: [], defaultFloorplan: settings.defaultFloorplan || { bgImage: '', itemScale: 40 }, ...settings });
  const [activeSubTab, setActiveSubTab] = useState('minSpend');
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [currentZonePoints, setCurrentZonePoints] = useState([]);
  const [drawingColor, setDrawingColor] = useState('rgba(250, 204, 21, 0.3)');

  // UPDATED: Min Spend now holds objects { lunch: '', dinner: '' }
  const [editingRule, setEditingRule] = useState({
    id: null,
    locations: [],
    prices: {
      Mon: { lunch: '', dinner: '' }, Tue: { lunch: '', dinner: '' }, Wed: { lunch: '', dinner: '' },
      Thu: { lunch: '', dinner: '' }, Fri: { lunch: '', dinner: '' }, Sat: { lunch: '', dinner: '' }, Sun: { lunch: '', dinner: '' }
    }
  });

  // UPDATED: Menu now has priceWeekday and priceWeekend
  const [editingMenu, setEditingMenu] = useState({ id: null, title: '', content: '', type: 'food', priceWeekday: '', priceWeekend: '', allocation: {} });

  const [editingPaymentRule, setEditingPaymentRule] = useState({ id: null, name: '', minMonthsInAdvance: 0, deposit1: 30, deposit1Offset: 0, deposit2: 30, deposit2Offset: 3, deposit3: 30, deposit3Offset: 6 });

  // Handlers
  const handleSaveRule = () => {
    if (editingRule.locations.length === 0) return addToast("請至少選擇一個區域", "error");
    const newRules = [...(localSettings.minSpendRules || [])];
    if (editingRule.id) { const idx = newRules.findIndex(r => r.id === editingRule.id); if (idx !== -1) newRules[idx] = editingRule; } else { newRules.push({ ...editingRule, id: Date.now() }); }
    const updatedSettings = { ...localSettings, minSpendRules: newRules }; setLocalSettings(updatedSettings); onSave(updatedSettings);
    // Reset
    setEditingRule({ id: null, locations: [], prices: { Mon: { lunch: '', dinner: '' }, Tue: { lunch: '', dinner: '' }, Wed: { lunch: '', dinner: '' }, Thu: { lunch: '', dinner: '' }, Fri: { lunch: '', dinner: '' }, Sat: { lunch: '', dinner: '' }, Sun: { lunch: '', dinner: '' } } });
    addToast("規則已儲存", "success");
  };
  const handleDeleteRule = (id) => { const updatedSettings = { ...localSettings, minSpendRules: localSettings.minSpendRules.filter(r => r.id !== id) }; setLocalSettings(updatedSettings); onSave(updatedSettings); };

  const handleSaveMenu = () => {
    if (!editingMenu.title) return addToast("請輸入標題", "error");
    const newMenus = [...(localSettings.defaultMenus || [])];
    if (editingMenu.id) { const idx = newMenus.findIndex(m => m.id === editingMenu.id); if (idx !== -1) newMenus[idx] = editingMenu; } else { newMenus.push({ ...editingMenu, id: Date.now() }); }
    const updatedSettings = { ...localSettings, defaultMenus: newMenus }; setLocalSettings(updatedSettings); onSave(updatedSettings);
    setEditingMenu({ id: null, title: '', content: '', type: 'food', priceWeekday: '', priceWeekend: '', allocation: {} });
    addToast("菜單已儲存", "success");
  };
  const handleDeleteMenu = (id) => { const updatedSettings = { ...localSettings, defaultMenus: localSettings.defaultMenus.filter(m => m.id !== id) }; setLocalSettings(updatedSettings); onSave(updatedSettings); };
  const handleSavePaymentRule = () => { /* (Keep existing logic) */ if (!editingPaymentRule.name) return addToast("請輸入規則名稱", "error"); const totalPercent = editingPaymentRule.deposit1 + editingPaymentRule.deposit2 + editingPaymentRule.deposit3; if (totalPercent > 100) return addToast("錯誤：付款總比例不能超過 100%", "error"); const newRules = [...(localSettings.paymentRules || [])]; if (editingPaymentRule.id) { const idx = newRules.findIndex(r => r.id === editingPaymentRule.id); if (idx !== -1) newRules[idx] = editingPaymentRule; } else { newRules.push({ ...editingPaymentRule, id: Date.now() }); } newRules.sort((a, b) => b.minMonthsInAdvance - a.minMonthsInAdvance); const updatedSettings = { ...localSettings, paymentRules: newRules }; setLocalSettings(updatedSettings); onSave(updatedSettings); setEditingPaymentRule({ id: null, name: '', minMonthsInAdvance: 0, deposit1: 30, deposit1Offset: 0, deposit2: 30, deposit2Offset: 3, deposit3: 30, deposit3Offset: 6 }); addToast("付款規則已儲存", "success"); };
  const handleDeletePaymentRule = (id) => { const updatedSettings = { ...localSettings, paymentRules: localSettings.paymentRules.filter(r => r.id !== id) }; setLocalSettings(updatedSettings); onSave(updatedSettings); };

  const handleBgUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!onUploadProof) return addToast("Upload function missing", "error");
    setIsUploadingBg(true);
    try {
      const url = await onUploadProof(file);
      setLocalSettings(prev => ({ ...prev, defaultFloorplan: { ...(prev.defaultFloorplan || {}), bgImage: url } }));
      addToast("預設平面圖上傳成功", "success");
    } catch (err) {
      addToast("上傳失敗", "error");
    } finally {
      setIsUploadingBg(false);
    }
  };

  const handleSaveFloorplan = () => {
    onSave(localSettings);
    addToast("平面圖預設已儲存", "success");
  };

  // --- ZONE DRAWING LOGIC ---
  const handleMapClick = (e) => {
    if (isDrawingZone) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const scale = localSettings.defaultFloorplan?.itemScale || 40;
      setCurrentZonePoints(prev => [...prev, { x_m: x / scale, y_m: y / scale }]);
    } else if (!isFullscreenMap) {
      setIsFullscreenMap(true);
    }
  };

  const finishZone = () => {
    if (currentZonePoints.length < 3) return addToast("區域至少需要 3 個點 (Minimum 3 points required)", "error");
    let defaultName = "New Zone";
    if (drawingColor.includes('248, 113, 113')) defaultName = '紅區';
    if (drawingColor.includes('250, 204, 21')) defaultName = '黃區';
    if (drawingColor.includes('52, 211, 153')) defaultName = '綠區';
    if (drawingColor.includes('96, 165, 250')) defaultName = '藍區';
    
    const name = window.prompt("請輸入區域名稱 (Enter Zone Name, e.g. 紅區):", defaultName);
    if (!name) return;
    const newZone = { id: Date.now(), name, color: drawingColor, points: currentZonePoints };
    setLocalSettings(p => ({ ...p, defaultFloorplan: { ...p.defaultFloorplan, zones: [...(p.defaultFloorplan.zones || []), newZone] } }));
    setCurrentZonePoints([]);
    setIsDrawingZone(false);
  };

  // Helper to safely get nested price
  const getPriceVal = (rule, day, type) => {
    if (typeof rule.prices[day] === 'object') return rule.prices[day][type];
    return type === 'dinner' ? rule.prices[day] : ''; // Fallback for old data
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in pb-20">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200"><div><h2 className="text-2xl font-bold text-slate-800">系統設定 (Settings)</h2><p className="text-slate-500">管理場地規則、預設餐單與付款條款</p></div></div>
      <div className="flex space-x-1 border-b border-slate-200">
        <button onClick={() => setActiveSubTab('minSpend')} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeSubTab === 'minSpend' ? 'bg-white border-x border-t border-slate-200 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}>場地低消 (Min Spend)</button>
        <button onClick={() => setActiveSubTab('menus')} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeSubTab === 'menus' ? 'bg-white border-x border-t border-slate-200 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}>餐飲預設 (Presets)</button>
        <button onClick={() => setActiveSubTab('payment')} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeSubTab === 'payment' ? 'bg-white border-x border-t border-slate-200 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}>付款規則 (Payment Rules)</button>
        <button onClick={() => setActiveSubTab('floorplan')} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeSubTab === 'floorplan' ? 'bg-white border-x border-t border-slate-200 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}>場地平面圖 (Floorplan)</button>
      </div>

      {/* Min Spend Tab - UPDATED with Dual Inputs */}
      {activeSubTab === 'minSpend' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-5 space-y-4">
              <Card className="p-5 border-l-4 border-l-blue-500">
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center">{editingRule.id ? <Edit2 size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}{editingRule.id ? "編輯規則" : "新增規則"}</h3>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-700 mb-2">1. 選擇區域組合</label>
                  <div className="flex flex-wrap gap-2">{LOCATION_CHECKBOXES.map(loc => (<button key={loc} onClick={() => setEditingRule(p => ({ ...p, locations: p.locations.includes(loc) ? p.locations.filter(l => l !== loc) : [...p.locations, loc] }))} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${editingRule.locations.includes(loc) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300'}`}>{loc}</button>))}</div>
                </div>
                <div className="mb-6">
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-2"><span>2. 設定每日低消</span><span className="flex gap-8 mr-4"><span>午市 (Lunch)</span><span>晚市 (Dinner)</span></span></div>
                  <div className="space-y-2">
                    {DAYS_OF_WEEK.map(day => (
                      <div key={day} className="flex items-center gap-2">
                        <span className="w-8 text-xs font-bold text-slate-500 uppercase">{day}</span>
                        {/* Lunch Input */}
                        <div className="relative flex-1">
                          <input type="number"
                            value={editingRule.prices[day]?.lunch || ''}
                            onChange={(e) => setEditingRule(p => ({ ...p, prices: { ...p.prices, [day]: { ...p.prices[day], lunch: e.target.value } } }))}
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded outline-none focus:border-blue-500 text-center"
                            placeholder="Lunch"
                          />
                        </div>
                        {/* Dinner Input */}
                        <div className="relative flex-1">
                          <input type="number"
                            value={editingRule.prices[day]?.dinner || ''}
                            onChange={(e) => setEditingRule(p => ({ ...p, prices: { ...p.prices, [day]: { ...p.prices[day], dinner: e.target.value } } }))}
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded outline-none focus:border-blue-500 text-center bg-blue-50/30"
                            placeholder="Dinner"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2"><button onClick={handleSaveRule} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold">更新/新增</button>{editingRule.id && <button onClick={() => setEditingRule({ id: null, locations: [], prices: { Mon: { lunch: '', dinner: '' }, Tue: { lunch: '', dinner: '' }, Wed: { lunch: '', dinner: '' }, Thu: { lunch: '', dinner: '' }, Fri: { lunch: '', dinner: '' }, Sat: { lunch: '', dinner: '' }, Sun: { lunch: '', dinner: '' } } })} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold">取消</button>}</div>
              </Card>
            </div>
            <div className="md:col-span-7">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-700">規則列表</h3></div>
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {localSettings.minSpendRules.map((rule) => (
                    <div key={rule.id} className="p-4 hover:bg-blue-50/50 transition-colors group">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-wrap gap-1">{rule.locations.map(l => <span key={l} className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded font-bold">{l}</span>)}</div>
                        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setEditingRule(rule)} className="text-blue-600 hover:bg-blue-100 p-1 rounded"><Edit2 size={14} /></button><button onClick={() => handleDeleteRule(rule.id)} className="text-red-600 hover:bg-red-100 p-1 rounded"><Trash2 size={14} /></button></div>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-[10px] text-slate-600 text-center">
                        {DAYS_OF_WEEK.map(day => (
                          <div key={day} className="flex flex-col border rounded bg-slate-50 p-1">
                            <span className="font-bold mb-1">{day}</span>
                            <span className="text-slate-400">L: {getPriceVal(rule, day, 'lunch') ? `$${parseInt(getPriceVal(rule, day, 'lunch') / 1000)}k` : '-'}</span>
                            <span className="text-blue-600 font-bold">D: {getPriceVal(rule, day, 'dinner') ? `$${parseInt(getPriceVal(rule, day, 'dinner') / 1000)}k` : '-'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu Tab - UPDATED with Dual Pricing */}
      {activeSubTab === 'menus' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-5 space-y-4">
              <Card className="p-5 border-l-4 border-l-emerald-500">
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center">{editingMenu.id ? <Edit2 size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}{editingMenu.id ? "編輯預設" : "新增預設"}</h3>
                <div className="space-y-4">
                  <div className="flex space-x-2"><button onClick={() => setEditingMenu(p => ({ ...p, type: 'food' }))} className={`flex-1 py-2 rounded border text-sm font-bold ${editingMenu.type === 'food' ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-white border-slate-300'}`}><Utensils size={14} className="inline mr-1" /> Menu</button><button onClick={() => setEditingMenu(p => ({ ...p, type: 'drink' }))} className={`flex-1 py-2 rounded border text-sm font-bold ${editingMenu.type === 'drink' ? 'bg-blue-100 border-blue-500 text-blue-800' : 'bg-white border-slate-300'}`}><Coffee size={14} className="inline mr-1" /> Drink</button></div>
                  <FormInput label="標題" value={editingMenu.title} onChange={e => setEditingMenu(p => ({ ...p, title: e.target.value }))} />

                  {/* DUAL PRICES */}
                  <div className="grid grid-cols-2 gap-4">
                    <MoneyInput label="平日價 (Mon-Thu)" name="priceWeekday" value={editingMenu.priceWeekday} onChange={e => setEditingMenu(p => ({ ...p, priceWeekday: e.target.value }))} />
                    <MoneyInput label="週末價 (Fri-Sun)" name="priceWeekend" value={editingMenu.priceWeekend} onChange={e => setEditingMenu(p => ({ ...p, priceWeekend: e.target.value }))} />
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center"><PieChart size={14} className="mr-1.5" /> 部門拆帳 (金額)</h4>
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg">
                      {DEPARTMENTS.map(dept => (
                        <div key={dept.key}>
                          <label className="block text-xs font-medium text-slate-500 mb-1">{dept.label.split(' ')[0]}</label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                            <input type="number" value={editingMenu.allocation?.[dept.key] || ''} onChange={e => setEditingMenu(prev => ({ ...prev, allocation: { ...prev.allocation, [dept.key]: e.target.value } }))} className="w-full pl-5 pr-2 py-1 text-sm border border-slate-300 rounded outline-none" placeholder="0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {editingMenu.type === 'food' ? (<FormTextArea label="內容" value={editingMenu.content} onChange={e => setEditingMenu(p => ({ ...p, content: e.target.value }))} rows={6} placeholder="輸入詳細菜色..." />) : (<FormInput label="酒水內容" value={editingMenu.content} onChange={e => setEditingMenu(p => ({ ...p, content: e.target.value }))} />)}
                  <div className="flex gap-2"><button onClick={handleSaveMenu} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold">儲存</button>{editingMenu.id && <button onClick={() => setEditingMenu({ id: null, title: '', content: '', type: 'food', priceWeekday: '', priceWeekend: '', allocation: {} })} className="px-4 bg-slate-100 rounded-lg text-slate-600 font-bold">取消</button>}</div>
                </div>
              </Card>
            </div>
            <div className="md:col-span-7">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-700">預設列表</h3></div>
                {/* PRESETS LIST (Updated with Allocation Status) */}
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {localSettings.defaultMenus.map(m => {
                    // --- CALCULATION LOGIC ---
                    const price = parseFloat(m.priceWeekday) || parseFloat(m.price) || 0;
                    const allocSum = Object.values(m.allocation || {}).reduce((a, b) => a + (parseFloat(b) || 0), 0);
                    let allocBadge = null;

                    if (m.type === 'food') {
                      if (allocSum === 0) {
                        allocBadge = <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold border border-red-200">未分拆</span>;
                      } else if (Math.abs(price - allocSum) > 1) {
                        allocBadge = <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold border border-amber-200">⚠️ 待分拆 ${Math.round(price - allocSum)}</span>;
                      }
                    }
                    // -------------------------

                    return (
                      <div key={m.id} className="p-4 hover:bg-emerald-50/50 transition-colors group">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${m.type === 'food' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                              {m.type === 'food' ? 'MENU' : 'DRINK'}
                            </span>
                            <span className="font-bold text-slate-800">{m.title}</span>
                            {allocBadge} {/* ✅ DISPLAY BADGE HERE */}
                          </div>
                          <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingMenu(m)} className="text-blue-600 hover:bg-blue-100 p-1 rounded"><Edit2 size={14} /></button>
                            <button onClick={() => handleDeleteMenu(m.id)} className="text-red-600 hover:bg-red-100 p-1 rounded"><Trash2 size={14} /></button>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center text-[10px] text-slate-500 mb-1">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">平日 ${formatMoney(m.priceWeekday)}</span>
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">週末 ${formatMoney(m.priceWeekend)}</span>
                        </div>
                        {m.allocation && (
                          <div className="flex gap-2 text-[10px] text-slate-400 mb-1">
                            {Object.entries(m.allocation).map(([k, v]) => v > 0 && (
                              <span key={k} className="border border-slate-200 px-1 rounded">
                                {DEPARTMENTS.find(d => d.key === k)?.label.split(' ')[0]}:${v}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-slate-500 whitespace-pre-wrap line-clamp-2">{m.content}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Rules Tab */}
      {activeSubTab === 'payment' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

            {/* Left Column: Editor Form */}
            <div className="md:col-span-5 space-y-4">
              <Card className="p-5 border-l-4 border-l-violet-500">
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center">
                  {editingPaymentRule.id ? <Edit2 size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}
                  {editingPaymentRule.id ? "編輯付款規則" : "新增付款規則"}
                </h3>

                <div className="space-y-4">
                  <FormInput
                    label="規則名稱 (Rule Name)"
                    placeholder="e.g. Standard Wedding, Last Minute"
                    value={editingPaymentRule.name}
                    onChange={e => setEditingPaymentRule(p => ({ ...p, name: e.target.value }))}
                  />

                  <FormInput
                    label="最少提前月數 (Min Months in Advance)"
                    type="number"
                    placeholder="0 = 適用於所有"
                    value={editingPaymentRule.minMonthsInAdvance}
                    onChange={e => setEditingPaymentRule(p => ({ ...p, minMonthsInAdvance: parseInt(e.target.value) || 0 }))}
                  />

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                    <div className="text-xs font-bold text-slate-500 uppercase border-b border-slate-200 pb-1 mb-2">分期設定 (Installments)</div>

                    {/* Deposit 1 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-slate-600">付款 1 (%)</label>
                        <div className="relative">
                          <input type="number" value={editingPaymentRule.deposit1} onChange={e => setEditingPaymentRule(p => ({ ...p, deposit1: parseFloat(e.target.value) || 0 }))} className="w-full pl-2 pr-6 py-1 text-sm border rounded outline-none" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600">付款限期 (Offset)</label>
                        <select value={editingPaymentRule.deposit1Offset} onChange={e => setEditingPaymentRule(p => ({ ...p, deposit1Offset: parseInt(e.target.value) }))} className="w-full py-1 text-sm border rounded outline-none bg-white">
                          <option value={0}>即時 (Immediate)</option>
                          <option value={1}>+1 個月</option>
                        </select>
                      </div>
                    </div>

                    {/* Deposit 2 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-slate-600">付款 2 (%)</label>
                        <div className="relative">
                          <input type="number" value={editingPaymentRule.deposit2} onChange={e => setEditingPaymentRule(p => ({ ...p, deposit2: parseFloat(e.target.value) || 0 }))} className="w-full pl-2 pr-6 py-1 text-sm border rounded outline-none" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600">付款限期 (Offset)</label>
                        <select value={editingPaymentRule.deposit2Offset} onChange={e => setEditingPaymentRule(p => ({ ...p, deposit2Offset: parseInt(e.target.value) }))} className="w-full py-1 text-sm border rounded outline-none bg-white">
                          <option value={1}>+1 個月</option>
                          <option value={3}>+3 個月</option>
                          <option value={6}>+6 個月</option>
                        </select>
                      </div>
                    </div>

                    {/* Deposit 3 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-slate-600">付款 3 (%)</label>
                        <div className="relative">
                          <input type="number" value={editingPaymentRule.deposit3} onChange={e => setEditingPaymentRule(p => ({ ...p, deposit3: parseFloat(e.target.value) || 0 }))} className="w-full pl-2 pr-6 py-1 text-sm border rounded outline-none" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600">付款限期 (Offset)</label>
                        <select value={editingPaymentRule.deposit3Offset} onChange={e => setEditingPaymentRule(p => ({ ...p, deposit3Offset: parseInt(e.target.value) }))} className="w-full py-1 text-sm border rounded outline-none bg-white">
                          <option value={3}>+3 個月</option>
                          <option value={6}>+6 個月</option>
                          <option value={9}>+9 個月</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={handleSavePaymentRule} className="flex-1 bg-violet-600 text-white py-2 rounded-lg font-bold hover:bg-violet-700 transition-colors">儲存規則</button>
                    {editingPaymentRule.id && <button onClick={() => setEditingPaymentRule({ id: null, name: '', minMonthsInAdvance: 0, deposit1: 30, deposit1Offset: 0, deposit2: 30, deposit2Offset: 3, deposit3: 30, deposit3Offset: 6 })} className="px-4 bg-slate-100 rounded-lg text-slate-600 font-bold">取消</button>}
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column: Rules List */}
            <div className="md:col-span-7">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-slate-700">現有規則 (Active Rules)</h3>
                </div>
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {localSettings.paymentRules.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">暫無付款規則</div>
                  ) : (
                    localSettings.paymentRules.map(rule => (
                      <div key={rule.id} className="p-4 hover:bg-violet-50/50 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-bold text-slate-800 block">{rule.name}</span>
                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              適用於: {rule.minMonthsInAdvance > 0 ? `提前 ${rule.minMonthsInAdvance} 個月或以上` : '所有訂單 (預設)'}
                            </span>
                          </div>
                          <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingPaymentRule(rule)} className="text-blue-600 hover:bg-blue-100 p-1 rounded"><Edit2 size={14} /></button>
                            <button onClick={() => handleDeletePaymentRule(rule.id)} className="text-red-600 hover:bg-red-100 p-1 rounded"><Trash2 size={14} /></button>
                          </div>
                        </div>

                        {/* Visual Timeline Bar */}
                        <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-100 mt-3">
                          <div style={{ width: `${rule.deposit1}%` }} className="bg-emerald-400" title={`1st Payment: ${rule.deposit1}%`}></div>
                          <div style={{ width: `${rule.deposit2}%` }} className="bg-emerald-300" title={`2nd Payment: ${rule.deposit2}%`}></div>
                          <div style={{ width: `${rule.deposit3}%` }} className="bg-emerald-200" title={`3rd Payment: ${rule.deposit3}%`}></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                          <span>Dep 1: {rule.deposit1}%</span>
                          <span>Dep 2: {rule.deposit2}%</span>
                          <span>Dep 3: {rule.deposit3}%</span>
                          <span className="text-red-400 font-bold">Bal: {100 - (rule.deposit1 + rule.deposit2 + rule.deposit3)}%</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floorplan Default Tab */}
      {activeSubTab === 'floorplan' && (
        <div className="space-y-6 animate-in fade-in">
          <Card className="p-5 border-l-4 border-l-amber-500 max-w-2xl">
            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center">
              <Map size={18} className="mr-2" /> 預設平面圖設定 (Default Map Settings)
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">預設背景圖 (Default Map)</label>
                {localSettings.defaultFloorplan?.bgImage ? (
                  <div className={isFullscreenMap ? "fixed inset-0 z-[9999] bg-slate-800 flex flex-col w-screen h-screen animate-in fade-in zoom-in-95 duration-200" : "relative border border-slate-200 rounded-lg overflow-hidden mb-3 h-64 group"}>
                    {isFullscreenMap && (
                      <div className="bg-white p-4 shadow-md flex justify-between items-center shrink-0">
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg">校準與區域設定 (Calibrate & Zones)</h3>
                          <p className="text-xs text-slate-500">調整比例尺，或在地圖上繪製分區</p>
                        </div>
                        <div className="flex items-center gap-4">
                           {!isDrawingZone && (
                           <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
                             <span className="text-sm font-bold text-slate-600">物件比例 (Scale):</span>
                             <input type="range" min="10" max="150" step="1" value={localSettings.defaultFloorplan?.itemScale || 40} onChange={(e) => setLocalSettings(p => ({...p, defaultFloorplan: { ...p.defaultFloorplan, itemScale: Number(e.target.value)}}))} className="w-32 md:w-48 accent-blue-600 cursor-ew-resize" />
                             <span className="text-sm font-mono font-bold text-blue-600 w-8 text-right">{localSettings.defaultFloorplan?.itemScale || 40}</span>
                           </div>
                           )}
                           <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                             {!isDrawingZone ? (
                                <button onClick={() => setIsDrawingZone(true)} className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors rounded font-bold text-sm shadow-sm">✏️ 繪製區域 (Draw Zone)</button>
                             ) : (
                                <>
                                  <select value={drawingColor} onChange={e => setDrawingColor(e.target.value)} className="px-2 py-1.5 text-sm border border-slate-300 rounded font-bold outline-none"><option value="rgba(248, 113, 113, 0.3)">🔴 紅區 (Red Zone)</option><option value="rgba(250, 204, 21, 0.3)">🟡 黃區 (Yellow Zone)</option><option value="rgba(52, 211, 153, 0.3)">🟢 綠區 (Green Zone)</option><option value="rgba(96, 165, 250, 0.3)">🔵 藍區 (Blue Zone)</option><option value="rgba(192, 132, 252, 0.3)">🟣 紫區 (Purple Zone)</option></select>
                                  <button onClick={() => setCurrentZonePoints(p => p.slice(0, -1))} className="px-3 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded font-bold text-xs transition-colors" disabled={currentZonePoints.length===0}>復原點</button>
                                  <button onClick={() => { setIsDrawingZone(false); setCurrentZonePoints([]); }} className="px-3 py-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded font-bold text-xs transition-colors">取消</button>
                                  <button onClick={finishZone} className="px-4 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded font-bold text-sm transition-colors shadow-sm">完成 (Finish)</button>
                                </>
                             )}
                           </div>
                           <button onClick={() => setIsFullscreenMap(false)} className="flex items-center gap-2 bg-slate-800 text-white hover:bg-slate-700 px-4 py-2 rounded-lg font-bold transition-colors shadow-sm"><Minimize size={16} /> 縮小</button>
                        </div>
                      </div>
                    )}
                    <div className={isFullscreenMap ? "flex-1 w-full overflow-auto bg-slate-100" : "w-full h-full overflow-hidden bg-slate-50"}>
                      <div 
                        className={isFullscreenMap ? "relative min-w-full min-h-full cursor-crosshair" : "relative w-full h-full cursor-pointer"}
                        style={{
                          width: localSettings.defaultFloorplan.bgImage && isFullscreenMap ? 'max-content' : '100%',
                          height: localSettings.defaultFloorplan.bgImage && isFullscreenMap ? 'max-content' : '100%',
                          backgroundImage: `linear-gradient(to right, rgba(96, 165, 250, 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(96, 165, 250, 0.4) 1px, transparent 1px), url("${localSettings.defaultFloorplan.bgImage}")`,
                          backgroundSize: `${localSettings.defaultFloorplan?.itemScale || 40}px ${localSettings.defaultFloorplan?.itemScale || 40}px, ${localSettings.defaultFloorplan?.itemScale || 40}px ${localSettings.defaultFloorplan?.itemScale || 40}px, ${isFullscreenMap ? 'auto' : 'contain'}`,
                          backgroundPosition: `top left, top left, ${isFullscreenMap ? 'top left' : 'center'}`,
                          backgroundRepeat: 'repeat, repeat, no-repeat'
                        }}
                        onClick={handleMapClick}
                      >
                        {localSettings.defaultFloorplan.bgImage && isFullscreenMap && (
                          <img src={localSettings.defaultFloorplan.bgImage} className="opacity-0 pointer-events-none select-none block" alt="" />
                        )}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                          {(localSettings.defaultFloorplan?.zones || []).map(z => {
                              const itemScale = localSettings.defaultFloorplan?.itemScale || 40;
                              const points = z.points.map(p => `${p.x_m * itemScale},${p.y_m * itemScale}`).join(' ');
                              const cx = ((Math.min(...z.points.map(p => p.x_m)) + Math.max(...z.points.map(p => p.x_m))) / 2) * itemScale;
                              const cy = ((Math.min(...z.points.map(p => p.y_m)) + Math.max(...z.points.map(p => p.y_m))) / 2) * itemScale;
                              return (
                                <g key={z.id}>
                                  <polygon points={points} fill={z.color} stroke={z.color.replace(/0\.\d+\)/, '0.8)')} strokeWidth="2" strokeDasharray="4 4" />
                                  <text x={cx} y={cy} fill={z.color.replace(/0\.\d+\)/, '1.0)')} fontSize={Math.max(14, itemScale * 0.8)} fontWeight="bold" textAnchor="middle" dominantBaseline="middle" style={{textShadow: '1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff'}} opacity="0.8">{z.name}</text>
                                </g>
                              );
                          })}
                          {isDrawingZone && currentZonePoints.length > 0 && (
                              <g>
                                <polyline 
                                  points={currentZonePoints.map(p => `${p.x_m * (localSettings.defaultFloorplan?.itemScale || 40)},${p.y_m * (localSettings.defaultFloorplan?.itemScale || 40)}`).join(' ')} 
                                  fill={currentZonePoints.length > 2 ? drawingColor : 'none'} 
                                  stroke={drawingColor.replace(/0\.\d+\)/, '0.8)')} strokeWidth="2" strokeDasharray="4 2" 
                                />
                                {currentZonePoints.map((p, i) => (
                                   <circle key={i} cx={p.x_m * (localSettings.defaultFloorplan?.itemScale || 40)} cy={p.y_m * (localSettings.defaultFloorplan?.itemScale || 40)} r="4" fill={drawingColor.replace(/0\.\d+\)/, '0.8)')} />
                                ))}
                              </g>
                           )}
                        </svg>
                        {!isFullscreenMap && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <span className="bg-white px-4 py-2 rounded-lg text-sm font-bold text-slate-800 shadow-lg flex items-center gap-2"><Maximize size={16} className="text-blue-600"/> 全螢幕校準 (Fullscreen Calibrate)</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {!isFullscreenMap && (
                      <button onClick={() => setLocalSettings(p => ({...p, defaultFloorplan: { ...p.defaultFloorplan, bgImage: ''}}))} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 shadow-sm z-10"><Trash2 size={14}/></button>
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50 text-slate-500 mb-3">
                     <span className="text-sm mb-2">尚未設定預設背景圖 (No default map)</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="inline-flex flex-1 items-center justify-center gap-2 bg-white border border-slate-300 px-4 py-2 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors text-sm font-bold text-slate-700 shadow-sm">
                    {isUploadingBg ? <span className="animate-pulse">上傳中...</span> : '上傳新地圖 (Upload Map)'}
                    <input type="file" className="hidden" accept="image/*" onChange={handleBgUpload} disabled={isUploadingBg} />
                  </label>
                  {localSettings.defaultFloorplan?.bgImage && !isFullscreenMap && (
                    <button onClick={() => setIsFullscreenMap(true)} className="inline-flex items-center justify-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors text-sm font-bold shadow-sm">
                      <Maximize size={16} /> 全螢幕校準
                    </button>
                  )}
                </div>
                
                {/* Existing Zones List */}
                {localSettings.defaultFloorplan?.zones?.length > 0 && (
                   <div className="mt-4 pt-4 border-t border-slate-200">
                     <h4 className="text-sm font-bold text-slate-700 mb-2">已設定區域 (Defined Zones)</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                       {localSettings.defaultFloorplan.zones.map(z => (
                         <div key={z.id} className="flex justify-between items-center bg-white border border-slate-200 p-2 rounded shadow-sm">
                           <div className="flex items-center gap-2">
                             <div className="w-4 h-4 rounded border border-slate-300" style={{backgroundColor: z.color.replace(/0\.\d+\)/, '0.6)')}}></div>
                             <span className="text-sm font-bold text-slate-700">{z.name}</span>
                           </div>
                           <button onClick={() => setLocalSettings(p => ({...p, defaultFloorplan: {...p.defaultFloorplan, zones: p.defaultFloorplan.zones.filter(zone => zone.id !== z.id)}}))} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"><Trash2 size={14}/></button>
                         </div>
                       ))}
                     </div>
                   </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex justify-between"><span>預設物件比例 (Default Scale)</span><span className="text-blue-600">{localSettings.defaultFloorplan?.itemScale || 40}</span></label>
                <input type="range" min="10" max="150" step="1" value={localSettings.defaultFloorplan?.itemScale || 40} onChange={(e) => setLocalSettings(p => ({...p, defaultFloorplan: { ...p.defaultFloorplan, itemScale: Number(e.target.value)}}))} className="w-full accent-blue-600" />
                <p className="text-xs text-slate-500 mt-1">此數值決定新訂單載入時，1x1m 的網格基準為多少像素。可使用全螢幕校準對齊。</p>
              </div>
              <div className="pt-4 border-t border-slate-100"><button onClick={handleSaveFloorplan} className="w-full bg-amber-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-amber-700 transition-colors shadow-sm">儲存平面圖設定</button></div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SettingsView;