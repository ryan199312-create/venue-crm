import React from 'react';
import {
  Utensils, Save, Plus, History, Eye, Trash2, ChevronLeft, ChevronRight,
  Languages, Loader2, PieChart, AlertCircle, AlertTriangle, CheckCircle, Coffee, Info
} from 'lucide-react';
import { FormSelect, MoneyInput, FormTextArea } from '../components/ui';
import {
  SERVING_STYLES, DEFAULT_DRINK_PACKAGES, DEPARTMENTS,
  FOOD_DEPTS, DRINK_DEPTS, formatMoney
} from '../utils/vmsUtils';

const FnBTab = ({
  formData, setFormData, appSettings,
  saveMenuSnapshot, addMenu, setPreviewVersion, deleteMenuSnapshot,
  moveMenu, handleMenuChange, handleApplyMenuPreset, removeMenu,
  translatingMenuId, handleTranslateMenu, toggleMenuAllocation, handleMenuAllocationChange,
  updateFinanceState, handlePriceChange, drinkPackageType, handleDrinkTypeChange,
  isTranslatingDrinks, handleTranslateDrinks, handleInputChange, DocumentVisibilityToggles
}) => {
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-3 mb-4 gap-4">
          <div>
            <h4 className="font-bold text-slate-800 flex items-center gap-2"><Utensils size={18} className="text-blue-600"/> 餐單設定 (Menus)</h4>
            <p className="text-xs text-slate-500 mt-1">Corporate Mode: Save versions before major edits.</p>
          </div>
          <div className="flex space-x-2">
            <button type="button" onClick={addMenu} className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-bold flex items-center transition-colors border border-blue-200"><Plus size={16} className="mr-1" /> 新增菜單</button>
          </div>
        </div>
        
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
                <div className="flex justify-between items-end mb-1"><label className="text-xs font-bold text-slate-500">菜單內容 (一行一項)</label><div className="flex gap-2"><button type="button" onClick={() => saveMenuSnapshot(menu.id)} className="flex items-center text-[10px] bg-violet-50 text-violet-600 px-2 py-1 rounded hover:bg-violet-100 transition-colors border border-violet-200"><Save size={12} className="mr-1" /> 儲存版本</button><button type="button" onClick={() => handleTranslateMenu(menu.id, menu.content)} disabled={translatingMenuId === menu.id || !menu.content} className="flex items-center text-[10px] bg-violet-100 text-violet-700 px-2 py-1 rounded hover:bg-violet-200 disabled:opacity-50 transition-colors">{translatingMenuId === menu.id ? <><Loader2 size={12} className="animate-spin mr-1" /> 翻譯中...</> : <><Languages size={12} className="mr-1" /> AI 中英對照翻譯</>}</button></div></div>
                <textarea rows={8} placeholder="輸入詳細菜色..." value={menu.content} onChange={(e) => handleMenuChange(menu.id, 'content', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white mb-3 font-mono leading-relaxed" />
                {menu.versions && menu.versions.length > 0 && (
                  <div className="bg-slate-100/50 p-2 rounded border border-slate-200 mb-3">
                    <div className="text-[10px] font-bold text-slate-500 mb-2 flex items-center"><History size={12} className="mr-1" /> 版本紀錄 ({menu.versions.length})</div>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200">
                      {menu.versions.map(v => (
                        <div key={v.id} className="flex-shrink-0 bg-white border border-slate-200 rounded p-2 text-[10px] flex flex-col gap-1.5 shadow-sm min-w-[120px] group hover:border-blue-300 transition-colors">
                          <div><div className="font-bold text-slate-700 truncate" title={v.name}>{v.name}</div><div className="text-[9px] text-slate-400 mt-0.5">{new Date(v.id).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></div>
                          <div className="flex gap-1 mt-auto pt-1.5 border-t border-slate-100"><button type="button" onClick={() => setPreviewVersion({ menuId: menu.id, ...v })} className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded py-1 font-bold transition-colors flex items-center justify-center"><Eye size={10} className="mr-1" /> 查看</button><button type="button" onClick={(e) => { e.stopPropagation(); if (window.confirm('確定刪除此版本?')) deleteMenuSnapshot(menu.id, v.id); }} className="px-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={10} /></button></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
  );
};

export default FnBTab;