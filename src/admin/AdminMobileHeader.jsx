import React from 'react';
import { MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminMobileHeader({ activeTab, setActiveTab }) {
  const { appSettings } = useAuth();
  const venueProfile = appSettings?.venueProfile || {};

  return (
    <header className="md:hidden bg-white border-b p-4 flex justify-between items-center flex-shrink-0 shadow-sm z-20">
      <span className="font-bold text-slate-900 flex items-center">
        <MapPin size={18} className="mr-2 text-brand-primary" /> {venueProfile.nameZh || 'VowsOS'}
      </span>
      <div className="flex gap-4 text-sm font-medium">
        <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-brand-primary font-bold' : 'text-slate-500'}>Home</button>
        <button onClick={() => setActiveTab('events')} className={activeTab === 'events' ? 'text-brand-primary font-bold' : 'text-slate-500'}>EOs</button>
        <button onClick={() => setActiveTab('docs')} className={activeTab === 'docs' ? 'text-brand-primary font-bold' : 'text-slate-500'}>Docs</button>
        <button onClick={() => setActiveTab('settings')} className={activeTab === 'settings' ? 'text-brand-primary font-bold' : 'text-slate-500'}>Set</button>
      </div>
    </header>
  );
}
