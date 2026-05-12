import React from 'react';
import { Printer } from 'lucide-react';

const PrintConfigTab = ({ formData, setFormData }) => {
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <Printer size={18} className="text-indigo-600" />
          <h4 className="font-bold text-slate-800">列印設定 (Print Customization)</h4>
        </div>

        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
          <h5 className="font-bold text-indigo-800 text-sm mb-3">通用設定 (General Settings)</h5>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">覆蓋發單日期 (Issue Date Override)</label>
            <input 
              type="date" 
              value={formData.printSettings?.general?.issueDateOverride || ''} 
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                printSettings: { 
                  ...prev.printSettings, 
                  general: { ...prev.printSettings?.general, issueDateOverride: e.target.value } 
                } 
              }))} 
              className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
            <p className="text-[10px] text-slate-500 mt-1">留空則使用系統當前日期 (Leave blank to use today's date)</p>
          </div>
        </div>

        <div className="bg-violet-50 p-4 rounded-lg border border-violet-100">
          <h5 className="font-bold text-violet-800 text-sm mb-3">菜單確認書 (Menu Confirmation)</h5>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">覆蓋有效期日期 (Validity Date Override)</label>
              <input 
                type="text" 
                placeholder="預設: 今日+14天 (Default: Today+14)" 
                value={formData.printSettings?.menu?.validityDateOverride || ''} 
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  printSettings: { 
                    ...prev.printSettings, 
                    menu: { ...prev.printSettings?.menu, validityDateOverride: e.target.value } 
                  } 
                }))} 
                className="w-full px-3 py-2 border border-violet-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none" 
              />
            </div>
          </div>
        </div>
        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
          <h5 className="font-bold text-emerald-800 text-sm mb-3">報價單 (Quotation)</h5>
          <label className="flex items-center space-x-3 cursor-pointer">
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={formData.printSettings?.quotation?.showClientInfo !== false} 
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  printSettings: { 
                    ...prev.printSettings, 
                    quotation: { ...prev.printSettings?.quotation, showClientInfo: e.target.checked } 
                  } 
                }))} 
              />
              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </div>
            <span className="text-sm font-bold text-slate-700">顯示客戶資訊 (Show Client Info)</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default PrintConfigTab;
