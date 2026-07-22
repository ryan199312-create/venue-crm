import React from 'react';
import { Palette, Image as ImageIcon, Globe, LayoutTemplate } from 'lucide-react';
import { Card, FormInput } from '../../components/ui';
import { DOC_STYLES, DOC_STYLE_ORDER } from '../documents/docStyles';

// Preset document design themes — each sets the --brand-primary/secondary/accent colours
// used across every generated document (contracts, quotations, receipts, EO…).
const DOC_THEMES = [
  { id: 'indigo',    name: '經典靛藍', en: 'Classic',        primary: '#4F46E5', secondary: '#1e293b', accent: '#8b5cf6' },
  { id: 'emerald',   name: '翡翠金',   en: 'Emerald & Gold', primary: '#047857', secondary: '#1c1917', accent: '#b8942f' },
  { id: 'burgundy',  name: '酒紅',     en: 'Burgundy',       primary: '#9f1239', secondary: '#292524', accent: '#c2953a' },
  { id: 'noir',      name: '午夜金',   en: 'Midnight Gold',  primary: '#111827', secondary: '#374151', accent: '#d4af37' },
  { id: 'rosegold',  name: '玫瑰金',   en: 'Rose Gold',      primary: '#b76e79', secondary: '#3f3f46', accent: '#d4a373' },
  { id: 'navy',      name: '海軍藍',   en: 'Navy',           primary: '#1e3a8a', secondary: '#1e293b', accent: '#94a3b8' },
  { id: 'forest',    name: '森林綠',   en: 'Forest',         primary: '#166534', secondary: '#14532d', accent: '#a3b18a' },
  { id: 'champagne', name: '香檳',     en: 'Champagne',      primary: '#7c6f5b', secondary: '#44403c', accent: '#c9a227' },
];

const BrandingTab = ({ localSettings, setLocalSettings, onSave, onUploadProof, addToast }) => {
  const branding = localSettings?.branding || {
    primaryColor: '#4F46E5',
    secondaryColor: '#1e293b',
    accentColor: '#8b5cf6',
  };

  const handleColorChange = (field, value) => {
    const isColor = ['primaryColor', 'secondaryColor', 'accentColor'].includes(field);
    setLocalSettings(prev => ({
      ...prev,
      branding: {
        ...(prev.branding || {}),
        [field]: value,
        // Hand-tweaking a colour means it's no longer a pristine preset.
        ...(isColor ? { themeId: null } : {})
      }
    }));
  };

  const applyTheme = (theme) => {
    setLocalSettings(prev => ({
      ...prev,
      branding: {
        ...(prev.branding || {}),
        themeId: theme.id,
        primaryColor: theme.primary,
        secondaryColor: theme.secondary,
        accentColor: theme.accent,
      }
    }));
  };

  const handleSaveBranding = () => {
    onSave(localSettings);
    addToast("Branding settings saved successfully!", "success");
  };

  const brandStyles = {
    '--brand-primary': branding.primaryColor,
    '--brand-secondary': branding.secondaryColor,
    '--brand-accent': branding.accentColor,
  };

  return (
    <div className="space-y-6 animate-in fade-in" style={brandStyles}>
      {/* Design theme presets */}
      <Card className="p-6 border-l-4 border-l-violet-600">
        <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2"><Palette className="text-violet-600" /> 設計主題 (Design Themes)</h3>
        <p className="text-[11px] text-slate-400 mb-5">選擇一個主題，即套用到所有單據的配色；之後仍可在下方自訂微調。</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {DOC_THEMES.map(theme => {
            const active = branding.themeId === theme.id;
            return (
              <button key={theme.id} type="button" onClick={() => applyTheme(theme)}
                className={`text-left p-3 rounded-2xl border-2 transition-all ${active ? 'border-violet-500 shadow-lg shadow-violet-100' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className="flex gap-1.5 mb-2.5">
                  <span className="w-6 h-6 rounded-lg shadow-inner border border-black/5" style={{ backgroundColor: theme.primary }} />
                  <span className="w-6 h-6 rounded-lg shadow-inner border border-black/5" style={{ backgroundColor: theme.secondary }} />
                  <span className="w-6 h-6 rounded-lg shadow-inner border border-black/5" style={{ backgroundColor: theme.accent }} />
                </div>
                <p className="text-xs font-black text-slate-800 leading-tight">{theme.name}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{theme.en}</p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Document design style — typography + header treatment */}
      <Card className="p-6 border-l-4 border-l-slate-700">
        <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2"><LayoutTemplate className="text-slate-700" /> 文件設計 (Document Design)</h3>
        <p className="text-[11px] text-slate-400 mb-5">整體風格：字體與頁首排版，套用到所有生成的單據。</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DOC_STYLE_ORDER.map(id => {
            const s = DOC_STYLES[id];
            const active = (branding.docStyle || 'classic') === id;
            const c = branding.primaryColor || '#4F46E5';
            return (
              <button key={id} type="button" onClick={() => handleColorChange('docStyle', id)}
                className={`p-3 rounded-2xl border-2 transition-all text-left ${active ? 'border-violet-500 shadow-lg shadow-violet-100' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className="h-16 bg-slate-50 rounded-lg border border-slate-200 p-2 mb-2 overflow-hidden">
                  {s.header === 'classic' && (
                    <div className="h-full flex flex-col">
                      <div className="flex justify-between"><div className="w-8 h-2 rounded-sm" style={{ backgroundColor: c }} /><div className="w-6 h-1.5 bg-slate-300 rounded-sm" /></div>
                      <div className="mt-1 h-0.5 rounded" style={{ backgroundColor: c }} />
                      <div className="mt-2 space-y-1"><div className="w-full h-1 bg-slate-200 rounded" /><div className="w-2/3 h-1 bg-slate-200 rounded" /></div>
                    </div>
                  )}
                  {s.header === 'modern' && (
                    <div className="h-full flex flex-col items-center gap-1 pt-1">
                      <div className="w-10 h-2 rounded-sm" style={{ backgroundColor: c }} />
                      <div className="w-6 h-1 bg-slate-300 rounded" />
                      <div className="w-full h-px bg-slate-200 mt-0.5" />
                      <div className="w-8 h-1 bg-slate-200 rounded mt-0.5" />
                    </div>
                  )}
                  {s.header === 'minimal' && (
                    <div className="h-full flex flex-col justify-between">
                      <div className="flex justify-between items-end"><div className="w-8 h-1.5 bg-slate-400 rounded-sm" /><div className="w-6 h-1.5 bg-slate-300 rounded-sm" /></div>
                      <div className="h-px bg-slate-300" />
                      <div className="w-full h-1 bg-slate-200 rounded" />
                    </div>
                  )}
                  {s.header === 'bold' && (
                    <div className="h-full flex flex-col gap-1">
                      <div className="w-full h-4 rounded" style={{ backgroundColor: c }} />
                      <div className="flex justify-between"><div className="w-8 h-1.5 bg-slate-300 rounded-sm" /><div className="w-6 h-1.5 bg-slate-300 rounded-sm" /></div>
                    </div>
                  )}
                </div>
                <div className="flex items-baseline justify-between gap-1">
                  <p className="text-xs font-black text-slate-800 leading-tight">{s.label}</p>
                  <span className="text-base text-slate-500 leading-none" style={{ fontFamily: s.font }}>Aa文</span>
                </div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{s.en}</p>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Colors Selection */}
        <Card className="p-6 border-l-4 border-l-indigo-600">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Palette className="text-indigo-600" /> 自訂顏色 (Custom Colors)
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Primary Color (主要顏色)</label>
              <div className="flex gap-3 items-center">
                <input 
                  type="color" 
                  value={branding.primaryColor || '#4F46E5'} 
                  onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border-2 border-slate-200"
                />
                <FormInput 
                  value={branding.primaryColor || '#4F46E5'} 
                  onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                  placeholder="#4F46E5"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">主要按鈕、導航與強調色。</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Secondary Color (次要顏色)</label>
              <div className="flex gap-3 items-center">
                <input 
                  type="color" 
                  value={branding.secondaryColor || '#1e293b'} 
                  onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border-2 border-slate-200"
                />
                <FormInput 
                  value={branding.secondaryColor || '#1e293b'} 
                  onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                  placeholder="#1e293b"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">側邊欄、頁底或深色背景。</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Accent Color (點綴色)</label>
              <div className="flex gap-3 items-center">
                <input 
                  type="color" 
                  value={branding.accentColor || '#8b5cf6'} 
                  onChange={(e) => handleColorChange('accentColor', e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border-2 border-slate-200"
                />
                <FormInput 
                  value={branding.accentColor || '#8b5cf6'} 
                  onChange={(e) => handleColorChange('accentColor', e.target.value)}
                  placeholder="#8b5cf6"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">小圖標、標籤或提示色。</p>
            </div>
          </div>
        </Card>

        {/* Portal Assets */}
        <div className="space-y-6">
          <Card className="p-6 border-l-4 border-l-indigo-500">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <ImageIcon className="text-indigo-500" /> 門戶資源 (Portal Assets)
            </h3>
            
            <div className="space-y-4">
              <FormInput 
                label="瀏覽器標題 (Portal Browser Title)" 
                placeholder="例如: 璟瓏軒客戶專區" 
                value={branding.portalTitle || ''} 
                onChange={(e) => handleColorChange('portalTitle', e.target.value)}
              />
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Favicon (網站圖標)</label>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center bg-slate-50">
                    {branding.faviconUrl ? (
                      <img src={branding.faviconUrl} alt="Favicon" className="w-8 h-8 object-contain" />
                    ) : (
                      <Globe size={20} className="text-slate-300" />
                    )}
                  </div>
                  <label className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg cursor-pointer hover:bg-slate-200 transition-all font-bold text-xs">
                    上傳 ICO/PNG
                    <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      try {
                        const url = await onUploadProof(file);
                        handleColorChange('faviconUrl', url);
                      } catch (err) {
                        addToast("Favicon upload failed", "error");
                      }
                    }} />
                  </label>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSaveBranding}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3 rounded-xl font-bold shadow-xl transition-all active:scale-95"
        >
          儲存文件風格 (Save Doc Style)
        </button>
      </div>
    </div>
  );
};

export default BrandingTab;
