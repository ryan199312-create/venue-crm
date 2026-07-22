import React, { useState } from 'react';
import { 
  Rocket, MapPin, Palette, Building2, CheckCircle2, 
  ChevronRight, ChevronLeft, Image as ImageIcon, Globe, Phone, 
  Sparkles, ShieldCheck, Heart, Loader2
} from 'lucide-react';
import { Card, FormInput, FormTextArea } from '../../components/ui';
import { useLang } from '../../i18n/language';

const OnboardingWizard = ({ appSettings, onSave, onUploadProof, addToast }) => {
  const { L } = useLang();
  const [step, setStep] = useState(1);
  const [isFinishing, setIsFinishing] = useState(false);
  const [localSettings, setLocalSettings] = useState({
    ...appSettings,
    branding: appSettings.branding || {
      primaryColor: '#4F46E5',
      secondaryColor: '#1e293b',
      accentColor: '#8b5cf6',
    },
    venueProfile: appSettings.venueProfile || {
      nameZh: appSettings.venueName || '',
      nameEn: '',
      phone: '',
      address: '',
      website: ''
    }
  });

  const totalSteps = 5;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = async () => {
    setIsFinishing(true);
    const finalSettings = {
      ...localSettings,
      isSetupComplete: true,
      setupCompletedAt: new Date().toISOString()
    };
    try {
      await onSave(finalSettings);
      addToast(L("恭喜！系統設定已完成 (Onboarding Complete)!"), "success");
    } catch (err) {
      addToast(L("儲存失敗，請重試 (Save failed, please try again)"), "error");
      setIsFinishing(false);
    }
  };

  const handleUpdateBranding = (field, value) => {
    setLocalSettings(prev => ({
      ...prev,
      branding: { ...prev.branding, [field]: value }
    }));
  };

  const handleUpdateProfile = (field, value) => {
    setLocalSettings(prev => ({
      ...prev,
      venueProfile: { ...prev.venueProfile, [field]: value }
    }));
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-50 flex flex-col overflow-hidden">
      {/* Top Progress Bar */}
      <div className="h-1.5 w-full bg-slate-200">
        <div 
          className="h-full bg-indigo-600 transition-all duration-500 ease-out"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center overflow-y-auto p-6 md:p-12">
        <div className="w-full max-w-3xl space-y-8 py-8">
          
          {/* STEP 1: WELCOME */}
          {step === 1 && (
            <div className="text-center space-y-8 animate-in fade-in zoom-in-95">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-indigo-600/10 rounded-3xl text-indigo-600 mb-4">
                <Rocket size={48} className="animate-bounce" />
              </div>
              <div className="space-y-2">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">{L('歡迎使用 VowsOS (Welcome to VowsOS)')}</h1>
                <p className="text-lg text-slate-500 font-medium italic">{L('您的專屬宴會管理專家 (Your Premium CRM Partner)')}</p>
              </div>
              <Card className="p-8 bg-white border-2 border-slate-100 shadow-xl text-left space-y-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="text-indigo-600" size={20} /> {L('啟程準備 (Getting Started)')}
                </h2>
                <p className="text-slate-600 leading-relaxed">
                  {L('感謝您選擇 VowsOS！在開始管理您的活動之前，我們需要花 3 分鐘時間完成基礎品牌與場地設定。這將確保您的客戶門戶與合約文件展現出一致的品牌形象。 (Thank you for choosing VowsOS! Before you start managing events, we need about 3 minutes to set up your basic branding and venue details. This ensures your client portal and contract documents present a consistent brand image.)')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { icon: Palette, text: L("視覺風格設定 (Visual style setup)") },
                    { icon: Building2, text: L("場地基本資料 (Venue basic details)") },
                    { icon: ShieldCheck, text: L("合約條款配置 (Contract terms setup)") },
                    { icon: Heart, text: L("自訂品牌標誌 (Custom brand logo)") },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <item.icon size={18} className="text-indigo-600" />
                      <span className="text-sm font-bold text-slate-700">{item.text}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <button 
                type="button"
                onClick={handleNext}
                className="group px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 mx-auto"
              >
                {L('立即開始 (Start Setup)')} <ChevronRight />
              </button>
            </div>
          )}

          {/* STEP 2: IDENTITY */}
          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-8">
              <div className="text-center">
                <h2 className="text-3xl font-black text-slate-900">{L('品牌身份 (Identity)')}</h2>
                <p className="text-slate-500 mt-2 font-medium">{L('定義您的場地名稱與標誌 (Define your venue name and logo)')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                <Card className="p-6 space-y-6">
                  <FormInput
                    label={L("中文場地名稱 (Venue Name in Chinese)")}
                    placeholder={L("例如: 璟瓏軒 (e.g. King Lung Heen)")}
                    value={localSettings.venueProfile.nameZh}
                    onChange={e => handleUpdateProfile('nameZh', e.target.value)}
                  />
                  <FormInput
                    label={L("英文場地名稱 (Venue Name in English)")}
                    placeholder="e.g. King Lung Heen"
                    value={localSettings.venueProfile.nameEn}
                    onChange={e => handleUpdateProfile('nameEn', e.target.value)}
                  />

                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">{L('品牌標誌 (Organization Logo)')}</label>
                    <div className="flex items-center gap-6">
                      <div className="w-32 h-32 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center bg-slate-50 relative overflow-hidden group">
                        {localSettings.companyLogoUrl ? (
                          <img src={localSettings.companyLogoUrl} className="w-full h-full object-contain p-2" />
                        ) : (
                          <ImageIcon size={32} className="text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="inline-block bg-slate-900 text-white px-6 py-2 rounded-xl cursor-pointer font-bold text-sm">
                          {L('上傳標誌 (Upload Logo)')}
                          <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            try {
                              const url = await onUploadProof(file);
                              setLocalSettings(prev => ({ ...prev, companyLogoUrl: url }));
                              addToast(L("標誌上傳成功 (Logo uploaded successfully)"), "success");
                            } catch(err) { addToast(L("上傳失敗 (Upload failed)"), "error"); }
                          }} />
                        </label>
                        <p className="text-[10px] text-slate-400 leading-relaxed">{L('建議比例 1:1 或寬屏，背景透明之 PNG 檔案。 (Recommended 1:1 or wide ratio, transparent PNG file.)')}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="flex justify-between items-center pt-8">
                <button onClick={handlePrev} className="flex items-center gap-2 text-slate-500 font-bold px-6 py-3 hover:text-slate-800 transition-all"><ChevronLeft /> {L('上一步 (Back)')}</button>
                <button
                  onClick={handleNext}
                  disabled={!localSettings.venueProfile.nameZh}
                  className="bg-indigo-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                >
                  {L('下一步 (Colors)')}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: VISUALS */}
          {step === 3 && (
            <div className="space-y-8 animate-in slide-in-from-right-8">
              <div className="text-center">
                <h2 className="text-3xl font-black text-slate-900">{L('品牌色彩 (Visuals)')}</h2>
                <p className="text-slate-500 mt-2 font-medium">{L('配置專屬於您的系統色彩 (Configure your system colors)')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 space-y-6">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-3">{L('主要顏色 (Primary)')}</label>
                    <div className="flex gap-4 items-center">
                      <input 
                        type="color" 
                        value={localSettings.branding.primaryColor} 
                        onChange={e => handleUpdateBranding('primaryColor', e.target.value)}
                        className="w-14 h-14 rounded-xl cursor-pointer border-2 border-slate-100"
                      />
                      <FormInput 
                        value={localSettings.branding.primaryColor} 
                        onChange={e => handleUpdateBranding('primaryColor', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-3">{L('次要顏色 (Secondary)')}</label>
                    <div className="flex gap-4 items-center">
                      <input 
                        type="color" 
                        value={localSettings.branding.secondaryColor} 
                        onChange={e => handleUpdateBranding('secondaryColor', e.target.value)}
                        className="w-14 h-14 rounded-xl cursor-pointer border-2 border-slate-100"
                      />
                      <FormInput 
                        value={localSettings.branding.secondaryColor} 
                        onChange={e => handleUpdateBranding('secondaryColor', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-3">{L('點綴色 (Accent)')}</label>
                    <div className="flex gap-4 items-center">
                      <input 
                        type="color" 
                        value={localSettings.branding.accentColor} 
                        onChange={e => handleUpdateBranding('accentColor', e.target.value)}
                        className="w-14 h-14 rounded-xl cursor-pointer border-2 border-slate-100"
                      />
                      <FormInput 
                        value={localSettings.branding.accentColor} 
                        onChange={e => handleUpdateBranding('accentColor', e.target.value)}
                      />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-slate-900 text-white space-y-6">
                  <h4 className="font-bold flex items-center gap-2"><Sparkles size={16} className="text-indigo-400" /> {L('預覽效果 (Preview)')}</h4>
                  <div className="space-y-4 pt-2">
                    <button 
                      className="w-full py-3 rounded-xl font-black text-sm shadow-lg transition-transform"
                      style={{ backgroundColor: localSettings.branding.primaryColor }}
                    >
                      {L('範例按鈕 (Action Button)')}
                    </button>
                    <div className="flex gap-2">
                      <span 
                        className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest"
                        style={{ backgroundColor: localSettings.branding.accentColor + '30', color: localSettings.branding.accentColor }}
                      >
                        Badge 1
                      </span>
                      <span 
                        className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest"
                        style={{ backgroundColor: localSettings.branding.primaryColor + '30', color: localSettings.branding.primaryColor }}
                      >
                        Badge 2
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full w-2/3" style={{ backgroundColor: localSettings.branding.primaryColor }}></div>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="flex justify-between items-center pt-8">
                <button onClick={handlePrev} className="flex items-center gap-2 text-slate-500 font-bold px-6 py-3 hover:text-slate-800 transition-all"><ChevronLeft /> {L('上一步 (Back)')}</button>
                <button
                  onClick={handleNext}
                  className="bg-indigo-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  {L('下一步 (Presence)')}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PRESENCE */}
          {step === 4 && (
            <div className="space-y-8 animate-in slide-in-from-right-8">
              <div className="text-center">
                <h2 className="text-3xl font-black text-slate-900">{L('場地資訊 (Presence)')}</h2>
                <p className="text-slate-500 mt-2 font-medium">{L('用於文件頁底與通訊聯絡 (Used in document footers and communications)')}</p>
              </div>

              <Card className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormInput
                    label={L("聯絡電話 (Contact Phone)")}
                    icon={Phone}
                    placeholder="+852 1234 5678"
                    value={localSettings.venueProfile.phone}
                    onChange={e => handleUpdateProfile('phone', e.target.value)}
                  />
                  <FormInput
                    label={L("官方網站 (Website)")}
                    icon={Globe}
                    placeholder="www.yourvenue.com"
                    value={localSettings.venueProfile.website}
                    onChange={e => handleUpdateProfile('website', e.target.value)}
                  />
                </div>
                <FormTextArea
                  label={L("場地地址 (Address)")}
                  icon={MapPin}
                  rows={3}
                  placeholder={L("請輸入場地詳細地址... (Enter the full venue address...)")}
                  value={localSettings.venueProfile.address}
                  onChange={e => handleUpdateProfile('address', e.target.value)}
                />
              </Card>

              <div className="flex justify-between items-center pt-8">
                <button onClick={handlePrev} className="flex items-center gap-2 text-slate-500 font-bold px-6 py-3 hover:text-slate-800 transition-all"><ChevronLeft /> {L('上一步 (Back)')}</button>
                <button
                  onClick={handleNext}
                  className="bg-indigo-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  {L('最後一步 (Final)')}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: FINAL */}
          {step === 5 && (
            <div className="text-center space-y-8 animate-in zoom-in-95">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-emerald-50 rounded-3xl text-emerald-500 mb-4">
                <CheckCircle2 size={64} />
              </div>
              <div className="space-y-2">
                <h2 className="text-4xl font-black text-slate-900">{L('一切就緒！ (All set!)')}</h2>
                <p className="text-lg text-slate-500 font-medium tracking-tight">{L('VowsOS 已經為您的場地配置完成。 (VowsOS has finished configuring your venue.)')}</p>
              </div>
              
              <Card className="p-6 bg-white border border-slate-100 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16"></div>
                <div className="flex items-center gap-4 text-left">
                  <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                    {localSettings.companyLogoUrl ? (
                      <img src={localSettings.companyLogoUrl} className="w-10 h-10 object-contain" />
                    ) : (
                      <Building2 className="text-white" size={32} />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">{localSettings.venueProfile.nameEn || 'Venue Management'}</p>
                    <h4 className="text-2xl font-black text-slate-800">{localSettings.venueProfile.nameZh}</h4>
                  </div>
                </div>
              </Card>

              <div className="bg-slate-100/50 p-6 rounded-2xl space-y-3 text-left">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{L('後續建議步驟 (Next Steps)')}:</p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> {L('在「設定」中上傳場地平面圖預設值 (Upload default floorplans in Settings)')}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> {L('配置常用的菜單與酒水套餐 (Set up common menu and beverage packages)')}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> {L('邀請您的團隊成員加入系統 (Invite your team members to the system)')}
                  </li>
                </ul>
              </div>

              <button 
                onClick={handleFinish}
                disabled={isFinishing}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {isFinishing ? <Loader2 className="animate-spin" /> : L('進入儀表板 (Go to Dashboard)')}
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Brand Watermark */}
      <div className="p-8 text-center bg-slate-50">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Powered by VowsOS Infrastructure</p>
      </div>
    </div>
  );
};

export default OnboardingWizard;
