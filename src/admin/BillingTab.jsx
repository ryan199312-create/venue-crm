import React from 'react';
import {
  CreditCard, Utensils, Coffee, Layout, Tv, Star, Truck, Plus,
  AlertTriangle, Clock, Info, RotateCw, Upload, X, Image as ImageIcon, Trash2
} from 'lucide-react';
import { FormSelect, DepositField, PendingProofCard } from '../components/ui';
import {
  formatMoney, safeFloat, generateBillingSummary,
  equipmentMap, avMap, decorationMap
} from '../utils/vmsUtils';

// --- OPTIMIZED SUB-COMPONENTS ---
// By extracting list items and using React.memo, typing in one custom item won't re-render the others.
const CustomBillingItemRow = React.memo(({ item, idx, onUpdate, onRemove }) => {
  return (
    <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors border-t border-slate-100">
      <div className="col-span-5 flex items-center">
        <div className="p-1.5 bg-slate-100 text-slate-500 rounded mr-3 flex-shrink-0"><Plus size={14} /></div>
        <input type="text" value={item.name} placeholder="額外項目名稱" onChange={e => onUpdate(idx, 'name', e.target.value)} className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none text-sm text-slate-700" />
        <label title="標記為合約後新增之附加項目 (Mark as Addendum Item)" className="flex items-center text-[10px] font-bold text-slate-400 cursor-pointer hover:text-blue-600 ml-2 shrink-0">
          <input type="checkbox" checked={item.isAddendum} onChange={e => onUpdate(idx, 'isAddendum', e.target.checked)} className="mr-1.5 rounded-sm text-blue-600 focus:ring-blue-500 w-3 h-3" /> 
          <span>附加</span>
        </label>
      </div>
      <div className="col-span-2 flex items-center justify-end">
        <span className="text-slate-400 text-xs mr-1">$</span>
        <input type="number" value={item.price} onChange={e => onUpdate(idx, 'price', e.target.value)} className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-sm font-mono text-slate-700" placeholder="0" />
      </div>
      <div className="col-span-2">
        <div className="flex items-center border border-slate-300 rounded-md bg-white h-9 overflow-hidden shadow-sm">
          <select value={item.unitType || 'fixed'} onChange={e => onUpdate(idx, 'unitType', e.target.value)} className="bg-slate-50 border-r border-slate-300 h-full px-2 text-[10px] outline-none text-slate-600 cursor-pointer min-w-[60px]"><option value="fixed">固定</option><option value="perTable">席</option><option value="perPerson">位</option></select>
          <input type="number" value={item.qty || ''} onChange={e => onUpdate(idx, 'qty', e.target.value)} className="w-full h-full text-center outline-none text-sm font-bold text-slate-700 focus:bg-blue-50 transition-colors" placeholder="1" />
        </div>
      </div>
      <div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">${formatMoney(safeFloat(item.price) * safeFloat(item.qty))}</div>
      <div className="col-span-1 flex justify-center items-center gap-1.5">
        <button 
          type="button"
          title="計算加一服務費 (Apply 10% Service Charge)"
          onClick={() => onUpdate(idx, 'applySC', item.applySC === false)}
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${item.applySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200 opacity-50'}`}
        >SC</button>
        <button type="button" onClick={() => onRemove(idx)} className="text-slate-300 hover:text-red-500 p-1 transition-colors"><Trash2 size={14} /></button>
      </div>
    </div>
  );
});

const BillingTab = ({
  formData, setFormData,
  updateFinanceState, handlePriceChange, handleInputChange,
  updateCustomItem, removeCustomItem, jumpToAllocation,
  minSpendInfo, billingSummary, calculatePaymentTerms,
  addToast, onUploadProof, onRemoveProof
}) => {
  return (
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
                <div className="col-span-1 flex justify-center"><button type="button" title="計算加一服務費 (Apply 10% Service Charge)" onClick={() => { const newMenus = [...formData.menus]; newMenus[idx].applySC = !menu.applySC; setFormData(prev => updateFinanceState({ ...prev, menus: newMenus })); }} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${menu.applySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200 opacity-50'}`}>SC</button></div>
              </div>
            );
          })}
          {formData.servingStyle === '位上' && (
            <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors"><div className="col-span-5"><div className="flex items-center"><div className="p-1.5 bg-blue-100 text-blue-600 rounded mr-3 flex-shrink-0"><Utensils size={14} /></div><div><span className="font-bold text-slate-700 block text-sm">位上服務費 (Plating Fee)</span><span className="text-xs text-slate-400">來源: 上菜方式設定</span></div></div></div><div className="col-span-2 flex items-center justify-end"><span className="text-slate-400 text-xs mr-1">$</span><input type="number" name="platingFee" value={formData.platingFee} onChange={handlePriceChange} className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-sm font-mono text-slate-700" placeholder="0" /></div><div className="col-span-2 text-center text-sm text-slate-500">{formData.tableCount} (每席)</div><div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">${formatMoney(safeFloat(formData.platingFee) * safeFloat(formData.tableCount))}</div><div className="col-span-1 flex justify-center"><button type="button" title="計算加一服務費 (Apply 10% Service Charge)" onClick={() => setFormData(prev => updateFinanceState({ ...prev, platingFeeApplySC: !prev.platingFeeApplySC }))} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${formData.platingFeeApplySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200'}`}>SC</button></div></div>
          )}
          <div id="drinks-section" className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors">
            <div className="col-span-5"><div className="flex items-center"><div className="p-1.5 bg-blue-100 text-blue-600 rounded mr-3 flex-shrink-0"><Coffee size={14} /></div><div className="flex-1"><div className="flex items-center"><input type="text" name="drinksPackage" value={formData.drinksPackage || ''} onChange={handleInputChange} placeholder="酒水套餐" className="bg-transparent border-b border-transparent hover:border-blue-200 focus:border-blue-500 outline-none text-sm font-bold text-slate-700 w-full" />{(() => { const dPrice = safeFloat(formData.drinksPrice); const dAllocSum = Object.values(formData.drinkAllocation || {}).reduce((a, b) => a + safeFloat(b), 0); if (dPrice > 0 && Math.abs(dPrice - dAllocSum) >= 1) return (<div className="relative group ml-2 z-10 cursor-pointer" onClick={() => jumpToAllocation({ type: 'drinks' })}><div className="flex items-center justify-center w-4 h-4 bg-red-100 text-red-600 rounded-full border border-red-200 animate-pulse hover:bg-red-200 hover:scale-110 transition-transform"><span className="text-[10px] font-bold">!</span></div></div>); return null; })()}</div><span className="text-xs text-slate-400">來源: 餐飲分頁</span></div></div></div><div className="col-span-2 flex items-center justify-end"><span className="text-slate-400 text-xs mr-1">$</span><input type="number" name="drinksPrice" value={formData.drinksPrice} onChange={handlePriceChange} className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-sm font-mono text-blue-800" placeholder="0" /></div><div className="col-span-2"><div className="flex items-center border border-slate-300 rounded-md bg-white h-9 overflow-hidden shadow-sm"><select name="drinksPriceType" value={formData.drinksPriceType} onChange={e => { const type = e.target.value; let newQty = 1; if (type === 'perTable') newQty = formData.tableCount; if (type === 'perPerson') newQty = formData.guestCount; setFormData(prev => updateFinanceState({ ...prev, drinksPriceType: type, drinksQty: newQty })); }} className="bg-slate-50 border-r border-slate-300 h-full px-2 text-[10px] outline-none text-slate-600"><option value="perTable">席</option><option value="perPerson">位</option><option value="total">固定</option></select><input type="number" value={formData.drinksQty || ''} onChange={e => setFormData(prev => updateFinanceState({ ...prev, drinksQty: e.target.value }))} className="w-full h-full text-center outline-none text-sm font-bold text-slate-700 focus:bg-blue-50 transition-colors" /></div></div><div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">${formatMoney(safeFloat(formData.drinksPrice) * safeFloat(formData.drinksQty))}</div><div className="col-span-1 flex justify-center"><button type="button" title="計算加一服務費 (Apply 10% Service Charge)" onClick={() => setFormData(prev => updateFinanceState({ ...prev, drinksApplySC: !prev.drinksApplySC }))} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${formData.drinksApplySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200'}`}>SC</button></div>
          </div>
          {Object.entries(formData.equipment || {}).some(([k, v]) => v === true && equipmentMap[k]) && (
            <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors"><div className="col-span-5"><div className="flex items-center"><div className="p-1.5 bg-blue-100 text-blue-600 rounded mr-3 flex-shrink-0"><Layout size={14} /></div><div><span className="font-bold block text-sm text-slate-700">舞台與接待設備 (Setup & Reception)</span><span className="text-[10px] text-slate-400 leading-tight block mt-0.5">{Object.entries(formData.equipment || {}).filter(([k, v]) => v === true && equipmentMap[k]).map(([k]) => equipmentMap[k].split(' (')[0]).join(', ')}{formData.equipment?.nameSign && formData.nameSignText && `, 字牌: ${formData.nameSignText}`}{formData.equipment?.hasCake && formData.cakePounds && `, 蛋糕: ${formData.cakePounds}磅`}</span></div></div></div><div className="col-span-2 flex items-center justify-end"><span className="text-slate-400 text-xs mr-1">$</span><input type="number" value={formData.setupPackagePrice || ''} onChange={e => setFormData(prev => updateFinanceState({ ...prev, setupPackagePrice: e.target.value }))} className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-sm font-mono text-slate-700" placeholder="0" /></div><div className="col-span-2 text-center text-[10px] text-slate-400 font-bold uppercase tracking-tight">固定套票</div><div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">${formatMoney(safeFloat(formData.setupPackagePrice))}</div><div className="col-span-1 flex justify-center"><button type="button" title="計算加一服務費 (Apply 10% Service Charge)" onClick={() => setFormData(prev => updateFinanceState({ ...prev, setupApplySC: !prev.setupApplySC }))} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${formData.setupApplySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200'}`}>SC</button></div></div>
          )}
          {Object.entries(formData.equipment || {}).some(([k, v]) => v === true && avMap[k]) && (
            <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors"><div className="col-span-5"><div className="flex items-center"><div className="p-1.5 bg-indigo-100 text-indigo-600 rounded mr-3 flex-shrink-0"><Tv size={14} /></div><div><span className="font-bold block text-sm text-slate-700">影音設備套票 (AV Package)</span><span className="text-[10px] text-slate-400 leading-tight block mt-0.5">{Object.entries(formData.equipment || {}).filter(([k, v]) => v === true && avMap[k]).map(([k]) => avMap[k].split(' (')[0]).join(', ')}</span></div></div></div><div className="col-span-2 flex items-center justify-end"><span className="text-slate-400 text-xs mr-1">$</span><input type="number" value={formData.avPackagePrice || ''} onChange={e => setFormData(prev => updateFinanceState({ ...prev, avPackagePrice: e.target.value }))} className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-indigo-500 outline-none text-sm font-mono text-slate-700" placeholder="0" /></div><div className="col-span-2 text-center text-[10px] text-slate-400 font-bold uppercase tracking-tight">固定套票</div><div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">${formatMoney(safeFloat(formData.avPackagePrice))}</div><div className="col-span-1 flex justify-center"><button type="button" title="計算加一服務費 (Apply 10% Service Charge)" onClick={() => setFormData(prev => updateFinanceState({ ...prev, avApplySC: !prev.avApplySC }))} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${formData.avApplySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200'}`}>SC</button></div></div>
          )}
          {Object.values(formData.decoration || {}).some(v => v === true) && (
            <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors"><div className="col-span-5"><div className="flex items-center"><div className="p-1.5 bg-rose-100 text-rose-600 rounded mr-3 flex-shrink-0"><Star size={14} /></div><div><span className="font-bold block text-sm text-slate-700">場地佈置套票 (Decoration)</span><span className="text-[10px] text-slate-400 leading-tight block mt-0.5">{Object.entries(formData.decoration || {}).filter(([k, v]) => v === true && decorationMap[k]).map(([k]) => decorationMap[k].split(' (')[0]).join(', ')}{formData.decoration?.hasFlowerPillar && formData.flowerPillarQty && `, 花柱: ${formData.flowerPillarQty}支`}{formData.decoration?.hasMahjong && formData.mahjongTableQty && `, 麻雀: ${formData.mahjongTableQty}張`}{formData.decoration?.hasInvitation && formData.invitationQty && `, 喜帖: ${formData.invitationQty}套`}{formData.decoration?.hasCeremonyChair && formData.ceremonyChairQty && `, 婚椅: ${formData.ceremonyChairQty}張`}</span></div></div></div><div className="col-span-2 flex items-center justify-end"><span className="text-slate-400 text-xs mr-1">$</span><input type="number" value={formData.decorPackagePrice || ''} onChange={e => setFormData(prev => updateFinanceState({ ...prev, decorPackagePrice: e.target.value }))} className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-rose-500 outline-none text-sm font-mono text-slate-700" placeholder="0" /></div><div className="col-span-2 text-center text-[10px] text-slate-400 font-bold uppercase tracking-tight">固定套票</div><div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">${formatMoney(safeFloat(formData.decorPackagePrice))}</div><div className="col-span-1 flex justify-center"><button type="button" title="計算加一服務費 (Apply 10% Service Charge)" onClick={() => setFormData(prev => updateFinanceState({ ...prev, decorApplySC: !prev.decorApplySC }))} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${formData.decorApplySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200'}`}>SC</button></div></div>
          )}
          {(formData.customItems || []).map((item, idx) => (
            <CustomBillingItemRow 
              key={item.id || idx} 
              item={item} 
              idx={idx} 
              onUpdate={updateCustomItem} 
              onRemove={removeCustomItem}
            />
          ))}
          {formData.busInfo?.enabled && (
            <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors border-b border-slate-100"><div className="col-span-5"><div className="flex items-center"><div className="p-1.5 bg-slate-100 text-slate-500 rounded mr-3 flex-shrink-0"><Truck size={14} /></div><div><span className="font-bold text-slate-700 block text-sm">旅遊巴安排 (Bus Fee)</span><span className="text-xs text-slate-400">來源: 物流分頁</span></div></div></div><div className="col-span-2 flex items-center justify-end"><span className="text-slate-400 text-xs mr-1">$</span><input type="number" value={formData.busCharge} onChange={e => setFormData(prev => updateFinanceState({ ...prev, busCharge: e.target.value }))} className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-sm font-mono text-slate-700" placeholder="0" /></div><div className="col-span-2 text-center text-sm text-slate-500">1</div><div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">${formatMoney(safeFloat(formData.busCharge))}</div><div className="col-span-1 flex justify-center"><button type="button" title="計算加一服務費 (Apply 10% Service Charge)" onClick={() => setFormData(prev => updateFinanceState({ ...prev, busApplySC: !prev.busApplySC }))} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${formData.busApplySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200 opacity-50'}`}>SC</button></div></div>
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
                          <a href={url} target="_blank" rel="noreferrer" className="flex items-center text-xs text-blue-600 hover:underline truncate max-w-[120px]" title="查看收據">
                            <ImageIcon size={14} className="mr-1 shrink-0" /> 收據 {proofs.length > 1 ? idx + 1 : ''}
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
  );
};

export default BillingTab;