import React from 'react';
import { Printer } from 'lucide-react';

const PrintConfigTab = ({ formData, setFormData }) => {
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <Printer size={18} className="text-blue-600" />
          <h4 className="font-bold text-slate-800">列印自訂 (Print Customization)</h4>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h5 className="font-bold text-blue-800 text-sm mb-3">通用設定 (General Settings)</h5>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">文件發出日期 (Issue Date Override)</label>
            <input type="date" value={formData.printSettings?.general?.issueDateOverride || ''} onChange={(e) => setFormData(prev => ({ ...prev, printSettings: { ...prev.printSettings, general: { ...prev.printSettings?.general, issueDateOverride: e.target.value } } }))} className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            <p className="text-[10px] text-slate-500 mt-1">留空則預設顯示今天日期 (Leave blank to use today's date)</p>
          </div>
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
        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
          <h5 className="font-bold text-emerald-800 text-sm mb-3">報價單 (Quotation)</h5>
          <label className="flex items-center space-x-3 cursor-pointer"><div className="relative"><input type="checkbox" className="sr-only peer" checked={formData.printSettings?.quotation?.showClientInfo !== false} onChange={(e) => setFormData(prev => ({ ...prev, printSettings: { ...prev.printSettings, quotation: { ...prev.printSettings?.quotation, showClientInfo: e.target.checked } } }))} /><div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div></div><span className="text-sm font-bold text-slate-700">顯示客戶資料 (Show Client Info)</span></label>
        </div>
      </div>
    </div>
  );
};

export default PrintConfigTab;