import React, { useState } from 'react';
import { 
  Utensils, Coffee, Wine, Info, Trash2, Plus, Sparkles, ChevronDown, ChevronUp, 
  Clock, CheckCircle2, AlertCircle, ShoppingCart 
} from 'lucide-react';
import { FormTextArea, FormInput, FormSelect, FormCheckbox } from '../../../components/ui';
import { DEFAULT_DRINK_PACKAGES } from '../../../services/billingService';

const FoodAndBeverageTab = ({ formData, setFormData, handleInputChange, DocumentVisibilityToggles }) => {
  const [activePackageTab, setActivePackageTab] = useState('drinks');

  const updateDrinkPackage = (packageId, field, value) => {
    const currentPackages = formData.drinkPackages || [];
    const idx = currentPackages.findIndex(p => p.id === packageId);
    
    if (idx === -1) {
      const template = DEFAULT_DRINK_PACKAGES.find(p => p.id === packageId);
      const newPackage = { ...template, [field]: value };
      setFormData(prev => ({ ...prev, drinkPackages: [...currentPackages, newPackage] }));
    } else {
      const newPackages = [...currentPackages];
      newPackages[idx] = { ...newPackages[idx], [field]: value };
      setFormData(prev => ({ ...prev, drinkPackages: newPackages }));
    }
  };

  const isPackageEnabled = (packageId) => {
    return (formData.drinkPackages || []).some(p => p.id === packageId && p.enabled);
  };

  const getPackageData = (packageId) => {
    return (formData.drinkPackages || []).find(p => p.id === packageId) || 
           DEFAULT_DRINK_PACKAGES.find(p => p.id === packageId);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* 1. Menu Selection */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><Utensils size={20} /></div>
            <div>
              <h3 className="font-bold text-slate-800">菜單選擇 (Menu Selection)</h3>
              <p className="text-xs text-slate-500">設置活動主菜單內容與備註</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormInput 
              label="菜單名稱 (Menu Name)" 
              name="menuName" 
              value={formData.menuName} 
              onChange={handleInputChange} 
              placeholder="例如: 璟瓏軒喜慶晚宴 A" 
             />
             <div className="flex items-end gap-2">
               <div className="flex-1">
                 <FormInput 
                  label="每席價格 (Price per Table)" 
                  name="pricePerTable" 
                  type="number" 
                  value={formData.pricePerTable} 
                  onChange={handleInputChange} 
                  placeholder="0" 
                 />
               </div>
               <div className="bg-slate-100 px-3 py-2 rounded-lg text-xs font-bold text-slate-500 mb-1">HKD</div>
             </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">菜單內容 (Menu Items)</label>
              <span className="text-[10px] text-slate-400 font-medium">每行一項菜式 (One item per line)</span>
            </div>
            <FormTextArea 
              name="menuItems" 
              rows={12} 
              value={formData.menuItems} 
              onChange={handleInputChange} 
              placeholder="鴻運乳豬全體&#10;翡翠花枝玉帶&#10;..." 
              className="font-medium leading-relaxed"
            />
            <DocumentVisibilityToggles field="menuItems" defaultClient={true} defaultInternal={true} />
          </div>

          <div className="pt-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-2">菜單備註 (Menu Notes)</label>
            <FormTextArea 
              name="menuNotes" 
              rows={3} 
              value={formData.menuNotes} 
              onChange={handleInputChange} 
              placeholder="例如: 更改個別菜式、素食安排等..." 
            />
            <DocumentVisibilityToggles field="menuNotes" defaultClient={true} defaultInternal={true} />
          </div>
        </div>
      </div>

      {/* 2. Drink Packages */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Wine size={20} /></div>
            <div>
              <h3 className="font-bold text-slate-800">酒水套餐 (Drink Packages)</h3>
              <p className="text-xs text-slate-500">設置無限供應或單點酒水</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEFAULT_DRINK_PACKAGES.map(pkg => {
            const data = getPackageData(pkg.id);
            const enabled = isPackageEnabled(pkg.id);
            
            return (
              <div 
                key={pkg.id} 
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                  enabled ? 'border-amber-500 bg-amber-50/30' : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                }`}
                onClick={() => updateDrinkPackage(pkg.id, 'enabled', !enabled)}
              >
                {enabled && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-white p-1 rounded-bl-lg">
                    <CheckCircle2 size={12} />
                  </div>
                )}
                <div className="flex flex-col h-full">
                  <h4 className="font-bold text-slate-800 text-sm mb-1">{pkg.name}</h4>
                  <p className="text-[10px] text-slate-500 mb-3 flex-1">{pkg.description}</p>
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100">
                    <span className="text-xs font-black text-amber-700">${pkg.price}/{pkg.unit}</span>
                    <div className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200">
                      {enabled ? '已選擇' : '點擊選擇'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {(formData.drinkPackages || []).some(p => p.enabled) && (
          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in slide-in-from-top-2">
            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">酒水服務備註 (Beverage Service Notes)</label>
            <FormTextArea 
              name="drinkNotes" 
              rows={3} 
              value={formData.drinkNotes} 
              onChange={handleInputChange} 
              placeholder="例如: 開始供應時間、特定酒類要求..." 
            />
            <DocumentVisibilityToggles field="drinkNotes" defaultClient={true} defaultInternal={true} />
          </div>
        )}
      </div>

      {/* 3. Special Requests */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Sparkles size={20} /></div>
          <div>
            <h3 className="font-bold text-slate-800">特別餐飲要求 (Special F&B Requests)</h3>
            <p className="text-xs text-slate-500">過敏、素食或其他客製化安排</p>
          </div>
        </div>
        <FormTextArea 
          name="fbSpecialRequests" 
          rows={4} 
          value={formData.fbSpecialRequests} 
          onChange={handleInputChange} 
          placeholder="例如: 素食者姓名及數量、食物過敏提醒..." 
        />
        <DocumentVisibilityToggles field="fbSpecialRequests" defaultClient={true} defaultInternal={true} />
      </div>
    </div>
  );
};

export default FoodAndBeverageTab;
