import React from 'react';
import { Palette, Image as ImageIcon, Globe, MousePointer2 } from 'lucide-react';
import { Card, FormInput } from '../../components/ui';

const BrandingTab = ({ localSettings, setLocalSettings, onSave, onUploadProof, addToast }) => {
  const branding = localSettings?.branding || {
    primaryColor: '#4F46E5',
    secondaryColor: '#1e293b',
    accentColor: '#8b5cf6',
  };

  const handleColorChange = (field, value) => {
    setLocalSettings(prev => ({
      ...prev,
      branding: {
        ...(prev.branding || {}),
        [field]: value
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Colors Selection */}
        <Card className="p-6 border-l-4 border-l-indigo-600">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Palette className="text-indigo-600" /> 品牌顏色 (Brand Colors)
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

          <Card className="p-6 bg-slate-900 text-white">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <MousePointer2 size={16} className="text-indigo-400" /> 即時預覽 (Live Preview)
            </h4>
            <p className="text-[10px] text-slate-400 mb-4">預覽當前顏色在介面上的效果</p>
            
            <div className="space-y-3">
              <button 
                className="w-full py-2 rounded-lg font-bold text-xs shadow-lg transition-transform active:scale-95"
                style={{ backgroundColor: branding.primaryColor, color: '#fff' }}
              >
                主要按鈕 (Primary Button)
              </button>
              <button 
                className="w-full py-2 rounded-lg font-bold text-xs border transition-colors"
                style={{ borderColor: branding.primaryColor, color: branding.primaryColor }}
              >
                空心按鈕 (Outline Button)
              </button>
              <div className="flex gap-2">
                <span className="px-2 py-1 rounded text-[9px] font-bold" style={{ backgroundColor: branding.accentColor + '20', color: branding.accentColor }}>
                  標籤 (Badge)
                </span>
                <span className="px-2 py-1 rounded text-[9px] font-bold" style={{ backgroundColor: branding.primaryColor + '20', color: branding.primaryColor }}>
                  標籤 2
                </span>
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
          儲存視覺設定 (Save Branding)
        </button>
      </div>
    </div>
  );
};

export default BrandingTab;
