import React from 'react';
import { MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../i18n/language';

export default function AdminMobileHeader({ activeTab, setActiveTab }) {
  const { appSettings } = useAuth();
  const { lang, setLang } = useLang();
  const venueProfile = appSettings?.venueProfile || {};

  return (
    <header className="md:hidden bg-white border-b p-4 flex justify-between items-center flex-shrink-0 shadow-sm z-20 print:hidden">
      <span className="font-bold text-slate-900 flex items-center">
        <MapPin size={18} className="mr-2 text-indigo-600" /> {venueProfile.nameZh || 'VowsOS'}
      </span>
      <div className="flex gap-4 text-sm font-medium items-center">
        <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-indigo-600 font-bold underline' : 'text-slate-500'}>Home</button>
        <button onClick={() => setActiveTab('events')} className={activeTab === 'events' ? 'text-indigo-600 font-bold underline' : 'text-slate-500'}>EOs</button>
        <button onClick={() => setActiveTab('docs')} className={activeTab === 'docs' ? 'text-indigo-600 font-bold underline' : 'text-slate-500'}>Docs</button>
        <button onClick={() => setActiveTab('settings')} className={activeTab === 'settings' ? 'text-indigo-600 font-bold underline' : 'text-slate-500'}>Set</button>
        <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} className="text-[11px] font-bold text-slate-600 border border-slate-300 rounded-md px-2 py-1">{lang === 'zh' ? 'EN' : '中'}</button>
      </div>
    </header>
  );
}
