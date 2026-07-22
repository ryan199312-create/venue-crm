import React from 'react';
import { 
  Utensils, Coffee, Trash2, Plus, Sparkles, Languages, History, ArrowUp, ArrowDown, PieChart, AlertCircle
} from 'lucide-react';
import { FormTextArea, FormSelect } from '../../../components/ui';
import { DEPARTMENTS, FOOD_DEPTS, DRINK_DEPTS } from '../../../services/billingService';
import { useLang } from '../../../i18n/language';

const FoodAndBeverageTab = ({
  formData, 
  setFormData, 
  appSettings,
  saveMenuSnapshot,
  addMenu,
  setPreviewVersion,
  deleteMenuSnapshot,
  moveMenu,
  handleMenuChange,
  handleApplyMenuPreset,
  removeMenu,
  translatingMenuId,
  handleTranslateMenu,
  toggleMenuAllocation,
  handleMenuAllocationChange,
  updateFinanceState,
  handlePriceChange,
  drinkPackageType,
  handleDrinkTypeChange,
  isTranslatingDrinks,
  handleTranslateDrinks,
  handleInputChange,
  DocumentVisibilityToggles
}) => {
  const { L } = useLang();

  const menuPresets = appSettings?.defaultMenus?.filter(m => m.type === 'food' || !m.type) || [];
  const drinkPresets = appSettings?.defaultMenus?.filter(m => m.type === 'drink') || [];

  // 🌟 Legacy Migration Helper
  const hasLegacyMenu = formData.menuItems || formData.menuName;
  const isMenusEmpty = !formData.menus || formData.menus.length === 0 || (formData.menus.length === 1 && !formData.menus[0].content);

  const migrateLegacyMenu = () => {
    const legacyMenu = {
      id: Date.now(),
      title: formData.menuName || 'Legacy Menu',
      content: formData.menuItems || '',
      price: formData.pricePerTable || '',
      priceType: 'perTable',
      qty: formData.tableCount || 1,
      applySC: true
    };
    setFormData(prev => ({
      ...prev,
      menus: [legacyMenu],
      menuName: '', // Clear legacy to avoid confusion
      menuItems: ''
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* 🌟 Legacy Notice */}
      {hasLegacyMenu && isMenusEmpty && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 shadow-sm mb-6">
          <AlertCircle className="text-amber-600 shrink-0" size={20} />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-800">{L('偵測到舊版菜單資料 (Legacy Menu Detected)')}</h4>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              {L('此訂單包含舊版格式的菜單資料。為了能正常顯示並支援多菜單功能，請點擊下方按鈕進行格式轉換。 (This order contains legacy-format menu data. To display it correctly and support multiple menus, click the button below to convert the format.)')}
            </p>
            <button
              type="button"
              onClick={migrateLegacyMenu}
              className="mt-3 px-4 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors shadow-sm"
            >
              {L('轉換為新版格式 (Migrate to New Format)')}
            </button>
          </div>
        </div>
      )}

      {/* 1. Menus List */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><Utensils size={20} /></div>
            <div>
              <h3 className="font-bold text-slate-800">{L('宴會菜單 (Banquet Menus)')}</h3>
              <p className="text-xs text-slate-500">{L('設置活動主菜單內容、單價與預算分配 (Set the main menu content, unit price, and budget allocation)')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={addMenu}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors border border-rose-200"
          >
            <Plus size={14} /> {L('新增菜單 (Add Menu)')}
          </button>
        </div>

        <div className="space-y-4">
          {(!formData.menus || formData.menus.length === 0) ? (
            <div className="bg-slate-50 p-12 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-3">
              <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto text-slate-300 shadow-sm">
                <Utensils size={24} />
              </div>
              <div className="text-slate-400 font-medium">{L('尚未添加菜單內容 (No menu content added yet)')}</div>
              <button type="button" onClick={addMenu} className="text-indigo-600 font-bold text-sm hover:underline">{L('立即新增第一個菜單 (Add the first menu now)')}</button>
            </div>
          ) : (
            formData.menus.map((menu, idx) => (
              <div key={menu.id} id={`menu-item-${menu.id}`} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-top-2">
                {/* Menu Card Header */}
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-200 text-slate-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black">
                      {idx + 1}
                    </span>
                    <input 
                      type="text"
                      value={menu.title}
                      onChange={(e) => handleMenuChange(menu.id, 'title', e.target.value)}
                      placeholder={L('菜單標題 (Menu Title)')}
                      className="bg-transparent border-none font-bold text-slate-600 focus:ring-0 p-0 text-xs placeholder:text-slate-300 w-48"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                     <button type="button" onClick={() => moveMenu(idx, 'up')} disabled={idx === 0} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ArrowUp size={14}/></button>
                     <button type="button" onClick={() => moveMenu(idx, 'down')} disabled={idx === formData.menus.length - 1} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ArrowDown size={14}/></button>
                     <div className="w-px h-3 bg-slate-200 mx-1"></div>
                     <button type="button" onClick={() => removeMenu(menu.id)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={14}/></button>
                  </div>
                </div>

                {/* Menu Card Content */}
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Left Column: Editor */}
                    <div className="md:col-span-8 space-y-3">
                      <div className="flex items-center justify-between">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{L('菜單內容 (Menu Detail)')}</label>
                         <button 
                            type="button" 
                            onClick={() => handleTranslateMenu(menu.id, menu.content)}
                            disabled={translatingMenuId === menu.id}
                            className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                          >
                            {translatingMenuId === menu.id ? <History size={12} className="animate-spin"/> : <Languages size={12}/>}
                            {L('AI 翻譯 (AI Translate)')}
                          </button>
                      </div>
                      <FormTextArea 
                        value={menu.content}
                        onChange={(e) => handleMenuChange(menu.id, 'content', e.target.value)}
                        rows={10}
                        placeholder={L('鴻運乳豬全體 (e.g. Roast Suckling Pig)')}
                        className="font-serif text-sm leading-relaxed"
                      />

                      {/* Snapshots Bar */}
                      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                         <button 
                          type="button" 
                          onClick={() => saveMenuSnapshot(menu.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-500 rounded border border-slate-200 text-[10px] font-bold hover:bg-slate-200 transition-colors shrink-0"
                         >
                           <History size={10} /> {L('儲存快照 (Save Snapshot)')}
                         </button>
                         {(menu.versions || []).map(v => (
                           <div key={v.id} className="group relative flex items-center shrink-0">
                             <button 
                              type="button"
                              onClick={() => setPreviewVersion({ ...v, menuId: menu.id })}
                              className="px-2 py-1 bg-white border border-indigo-100 text-indigo-500 rounded text-[10px] font-bold hover:bg-indigo-50 transition-colors"
                             >
                               {v.name}
                             </button>
                             <button 
                              type="button"
                              onClick={() => deleteMenuSnapshot(menu.id, v.id)}
                              className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                               <Plus size={8} className="rotate-45" />
                             </button>
                           </div>
                         ))}
                      </div>
                    </div>

                    {/* Right Column: Pricing & Allocation */}
                    <div className="md:col-span-4">
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4 h-full">
                         <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{L('設定 (Settings)')}</label>
                            <div className="space-y-3">
                              <FormSelect
                                label={L('快捷菜單範本 (Presets)')}
                                value=""
                                onChange={(e) => handleApplyMenuPreset(menu.id, e.target.value)}
                                options={[{ value: '', label: L('請選擇菜單範本... (Select a menu preset...)') }, ...menuPresets.map(p => ({ value: p.id, label: p.title }))]}
                              />

                              <div className="flex items-center gap-2">
                                 <div className="relative flex-1">
                                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                   <input 
                                    type="number"
                                    value={menu.price}
                                    onChange={(e) => handleMenuChange(menu.id, 'price', e.target.value)}
                                    className="w-full pl-6 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="0"
                                   />
                                 </div>
                                 <select 
                                  value={menu.priceType}
                                  onChange={(e) => handleMenuChange(menu.id, 'priceType', e.target.value)}
                                  className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold text-slate-600 outline-none"
                                 >
                                   <option value="perTable">{L('每席 (Per Table)')}</option>
                                   <option value="perPerson">{L('每位 (Per Person)')}</option>
                                   <option value="total">{L('總額 (Total)')}</option>
                                 </select>
                              </div>
                              <div className="flex items-center gap-2">
                                 <div className="flex-1">
                                   <input 
                                    type="number"
                                    value={menu.qty}
                                    onChange={(e) => handleMenuChange(menu.id, 'qty', e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder={L('數量 (Qty)')}
                                   />
                                 </div>
                                 <div className="bg-slate-200 px-3 py-2 rounded-lg text-[10px] font-bold text-slate-500">
                                   {menu.priceType === 'perTable' ? L('席 (tbl)') : menu.priceType === 'perPerson' ? L('位 (pax)') : L('項 (item)')}
                                 </div>
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                                 <span className="text-[10px] font-bold text-slate-500">{L('總計: (Total:)')}</span>
                                 <span className="text-sm font-black text-slate-800 font-mono">${(safeFloat(menu.price) * safeFloat(menu.qty)).toLocaleString()}</span>
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer select-none mt-2">
                                 <input 
                                  type="checkbox"
                                  checked={menu.applySC !== false}
                                  onChange={(e) => handleMenuChange(menu.id, 'applySC', e.target.checked)}
                                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                 />
                                 <span className="text-[10px] font-bold text-slate-500 uppercase">{L('計算 10% 服務費 (Apply 10% Service Charge)')}</span>
                              </label>
                            </div>
                         </div>

                         <div className="pt-4 border-t border-slate-200">
                            <div className="flex items-center justify-between mb-2">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{L('撇數項目 (Allocation)')}</label>
                               <button 
                                type="button" 
                                onClick={() => toggleMenuAllocation(menu.id)}
                                className={`p-1 rounded transition-colors ${menu.showAllocation ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-200'}`}
                               >
                                 <PieChart size={12} />
                               </button>
                            </div>
                            
                            {menu.showAllocation && (
                              <div className="space-y-2 animate-in slide-in-from-top-1">
                                 {FOOD_DEPTS.map(key => {
                                   const dept = DEPARTMENTS.find(d => d.key === key);
                                   const isCustom = dept?.isCustom;
                                   const customLabel = formData.customDeptLabels?.[key] || '';
                                   
                                   return (
                                     <div key={key} className="flex items-center gap-2">
                                        <div className="w-14">
                                          {isCustom ? (
                                            <input 
                                              type="text"
                                              value={customLabel}
                                              onChange={(e) => setFormData(prev => ({ 
                                                ...prev, 
                                                customDeptLabels: { ...(prev.customDeptLabels || {}), [key]: e.target.value } 
                                              }))}
                                              className="w-full bg-transparent border-b border-dashed border-slate-200 text-[9px] font-black text-slate-400 focus:border-indigo-400 outline-none p-0"
                                              placeholder={L('其他... (Other...)')}
                                            />
                                          ) : (
                                            <span className="text-[10px] font-bold text-slate-400 truncate">{dept?.label.split(' ')[0]}</span>
                                          )}
                                        </div>
                                        <div className="relative flex-1">
                                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">$</span>
                                          <input 
                                            type="number"
                                            value={menu.allocation?.[key] || ''}
                                            onChange={(e) => handleMenuAllocationChange(menu.id, key, e.target.value)}
                                            className="w-full pl-4 pr-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                                            placeholder="0"
                                          />
                                        </div>
                                     </div>
                                   );
                                 })}
                                 <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[10px] font-bold">
                                    <span className={safeFloat(menu.price) === Object.values(menu.allocation || {}).reduce((a,b) => a+safeFloat(b), 0) ? 'text-emerald-600' : 'text-rose-500'}>
                                      ${Object.values(menu.allocation || {}).reduce((a,b) => a+safeFloat(b), 0)}
                                    </span>
                                    <span className="text-slate-400">Diff: ${safeFloat(menu.price) - Object.values(menu.allocation || {}).reduce((a,b) => a+safeFloat(b), 0)}</span>
                                 </div>
                              </div>
                            )}
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Drink Package */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Coffee size={20} /></div>
             <div>
               <h3 className="font-bold text-slate-800">{L('酒水安排 (Drinks & Beverages)')}</h3>
               <p className="text-xs text-slate-500">{L('設置無限供應或單點酒水套餐 (Set up free-flow or à la carte drink packages)')}</p>
             </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
           <div className="md:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{L('酒水內容 (Drinks Detail)')}</label>
                <button
                  type="button"
                  onClick={handleTranslateDrinks}
                  disabled={isTranslatingDrinks}
                  className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                >
                  {isTranslatingDrinks ? <History size={12} className="animate-spin"/> : <Languages size={12}/>}
                  {L('AI 翻譯 (AI Translate)')}
                </button>
              </div>
              <FormTextArea
                name="drinksPackage"
                value={formData.drinksPackage}
                onChange={handleInputChange}
                rows={6}
                placeholder={L('無限供應橙汁、汽水、本地啤酒... (Free-flow orange juice, soft drinks, local beer...)')}
                className="font-medium text-sm leading-relaxed"
              />
              <DocumentVisibilityToggles 
                field="drinksPackage"
                defaultClient={true}
                defaultInternal={true}
                clientDocs={L('報價單、合約、發票、收據、附加協議 (Quotation, Contract, Invoice, Receipt, Addendum)')}
                internalDocs={L('宴會通知單 (EO)')}
              />
           </div>

           <div className="md:col-span-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4">
                 <div className="space-y-3">
                   <FormSelect
                    label={L('快捷酒水範本 (Presets)')}
                    value={drinkPackageType}
                    onChange={handleDrinkTypeChange}
                    options={[
                      { value: '', label: L('請選擇酒水範本... (Select a drink preset...)') },
                      ...drinkPresets.map(p => ({ value: p.title, label: p.title })),
                      { value: 'Other', label: L('其他 (Other / Custom)') }
                    ]}
                   />

                   <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                        <input 
                          type="number"
                          name="drinksPrice"
                          value={formData.drinksPrice}
                          onChange={handlePriceChange}
                          className="w-full pl-6 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="0"
                        />
                      </div>
                      <select 
                        name="drinksPriceType"
                        value={formData.drinksPriceType}
                        onChange={handleInputChange}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold text-slate-600 outline-none"
                      >
                        <option value="perTable">{L('每席 (Per Table)')}</option>
                        <option value="perPerson">{L('每位 (Per Person)')}</option>
                        <option value="total">{L('總額 (Total)')}</option>
                      </select>
                   </div>

                   <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <input 
                          type="number"
                          name="drinksQty"
                          value={formData.drinksQty}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder={L('數量 (Qty)')}
                        />
                      </div>
                      <div className="bg-slate-200 px-3 py-2 rounded-lg text-[10px] font-bold text-slate-500">
                        {formData.drinksPriceType === 'perTable' ? L('席 (tbl)') : formData.drinksPriceType === 'perPerson' ? L('位 (pax)') : L('項 (item)')}
                      </div>
                   </div>

                   <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500">{L('總計: (Total:)')}</span>
                      <span className="text-sm font-black text-slate-800 font-mono">${(safeFloat(formData.drinksPrice) * safeFloat(formData.drinksQty)).toLocaleString()}</span>
                   </div>

                   <label className="flex items-center gap-2 cursor-pointer select-none mt-2">
                      <input 
                        type="checkbox"
                        checked={formData.drinksApplySC !== false}
                        onChange={(e) => setFormData(prev => updateFinanceState({ ...prev, drinksApplySC: e.target.checked }))}
                        className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                      />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{L('計算 10% 服務費 (Apply 10% Service Charge)')}</span>
                   </label>
                 </div>

                 <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{L('撇數項目 (Allocation)')}</label>
                       <button 
                        type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, showDrinkAllocation: !prev.showDrinkAllocation }))}
                        className={`p-1 rounded transition-colors ${formData.showDrinkAllocation ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-200'}`}
                       >
                         <PieChart size={14} />
                       </button>
                    </div>
                    {formData.showDrinkAllocation && (
                      <div className="space-y-2 animate-in slide-in-from-top-1">
                         {DRINK_DEPTS.map(key => {
                           const dept = DEPARTMENTS.find(d => d.key === key);
                           const isCustom = dept?.isCustom;
                           const customLabel = formData.customDeptLabels?.[key] || '';
                           
                           return (
                             <div key={key} className="flex items-center gap-2">
                                <div className="w-14">
                                  {isCustom ? (
                                    <input 
                                      type="text"
                                      value={customLabel}
                                      onChange={(e) => setFormData(prev => ({ 
                                        ...prev, 
                                        customDeptLabels: { ...(prev.customDeptLabels || {}), [key]: e.target.value } 
                                      }))}
                                      className="w-full bg-transparent border-b border-dashed border-slate-200 text-[9px] font-black text-slate-400 focus:border-indigo-400 outline-none p-0"
                                      placeholder={L('其他... (Other...)')}
                                    />
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-400 truncate">{dept?.label.split(' ')[0]}</span>
                                  )}
                                </div>
                                <div className="relative flex-1">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">$</span>
                                  <input 
                                    type="number"
                                    value={formData.drinkAllocation?.[key] || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, drinkAllocation: { ...(prev.drinkAllocation || {}), [key]: e.target.value } }))}
                                    className="w-full pl-4 pr-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                                    placeholder="0"
                                  />
                                </div>
                             </div>
                           );
                         })}
                         <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[10px] font-bold">
                            <span className={safeFloat(formData.drinksPrice) === Object.values(formData.drinkAllocation || {}).reduce((a,b) => a+safeFloat(b), 0) ? 'text-emerald-600' : 'text-rose-500'}>
                              ${Object.values(formData.drinkAllocation || {}).reduce((a,b) => a+safeFloat(b), 0)}
                            </span>
                            <span className="text-slate-400">Diff: ${safeFloat(formData.drinksPrice) - Object.values(formData.drinkAllocation || {}).reduce((a,b) => a+safeFloat(b), 0)}</span>
                         </div>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* 3. Special Requests */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Sparkles size={20} /></div>
          <div>
            <h3 className="font-bold text-slate-800">{L('特別餐飲與過敏要求 (Special F&B Requests)')}</h3>
            <p className="text-xs text-slate-500">{L('素食、食物過敏或特定禁忌安排 (Vegetarian, food allergies, or specific dietary restrictions)')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{L('食物過敏紀錄 (Allergies)')}</label>
              <FormTextArea
                name="allergies"
                rows={3}
                value={formData.allergies}
                onChange={handleInputChange}
                placeholder={L('例如: 1位對花生過敏, 2位不吃牛... (e.g. 1 guest allergic to peanuts, 2 do not eat beef...)')}
              />
              <DocumentVisibilityToggles
                field="allergies"
                defaultClient={true}
                defaultInternal={true}
                clientDocs={L('報價單、合約、菜譜確認單 (Quotation, Contract, Menu Confirmation)')}
                internalDocs={L('宴會通知單、樓面工作單 (EO, Staff Copy)')}
              />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{L('特別安排 (Special Arrangement)')}</label>
              <FormTextArea
                name="specialMenuReq"
                rows={3}
                value={formData.specialMenuReq}
                onChange={handleInputChange}
                placeholder={L('例如: 素食套餐 A x 2位, 兒童餐 x 5位... (e.g. Vegetarian Set A x 2, Kids Meal x 5...)')}
              />
              <DocumentVisibilityToggles
                field="specialMenuReq"
                defaultClient={true}
                defaultInternal={true}
                clientDocs={L('報價單、合約、菜譜確認單 (Quotation, Contract, Menu Confirmation)')}
                internalDocs={L('宴會通知單、樓面工作單 (EO, Staff Copy)')}
              />
           </div>
        </div>
      </div>
    </div>
  );
};

const safeFloat = (val) => {
  if (!val) return 0;
  const clean = val.toString().replace(/,/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};

export default FoodAndBeverageTab;
