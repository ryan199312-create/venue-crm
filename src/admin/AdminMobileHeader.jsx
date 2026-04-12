import React from 'react';
import { MapPin } from 'lucide-react';

export default function AdminMobileHeader({ activeTab, setActiveTab }) {
  return (
    <header className="md:hidden bg-white border-b p-4 flex justify-between items-center flex-shrink-0 shadow-sm z-20">
      <span className="font-bold text-slate-900 flex items-center">
        <MapPin size={18} className="mr-2 text-blue-600" /> 璟瓏軒宴會管理系統
      </span>
      <div className="space-x-4 text-sm font-medium">
        <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-500'}>Home</button>
        <button onClick={() => setActiveTab('events')} className={activeTab === 'events' ? 'text-blue-600' : 'text-slate-500'}>EOs</button>
      </div>
    </header>
  );
}