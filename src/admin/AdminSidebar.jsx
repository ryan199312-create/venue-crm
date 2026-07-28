import React from 'react';
import { MapPin, LayoutDashboard, FileText, Settings, LogOut, BookOpen, ChevronDown, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../i18n/language';

export default function AdminSidebar({ activeTab, setActiveTab }) {
  const { L, lang, setLang } = useLang();
  const {
    hasPermission, 
    selectedVenueId, 
    setSelectedVenueId, 
    getVisibleVenues, 
    outlets,
    userProfile,
    user,
    signOut: handleSignOut,
    appSettings
  } = useAuth();

  const venueProfile = appSettings?.venueProfile || {};
  const visibleVenues = getVisibleVenues(outlets);

  const menuItems = [
    { id: 'dashboard', label: '儀表板 (Dashboard)', icon: LayoutDashboard, permission: 'dashboard' },
    { id: 'events', label: '訂單管理 (EOs)', icon: FileText, permission: 'events' },
    { id: 'messages', label: '對話 (Messages)', icon: MessageSquare, permission: 'events' },
    { id: 'docs', label: '使用指南 (Docs)', icon: BookOpen, permission: 'docs' },
    { id: 'settings', label: '設定 (Settings)', icon: Settings, permission: 'settings' },
  ].filter(item => hasPermission(item.permission));

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 hidden md:flex flex-col flex-shrink-0 transition-all border-r border-slate-800 print:hidden">
      <div className="p-6 border-b border-slate-800 flex items-center space-x-3 text-white">
        <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/50">
          <MapPin size={20} />
        </div>
        <div>
          <h1 className="text-l font-bold leading-none mb-1">{venueProfile.nameZh || 'VowsOS'}</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">{venueProfile.nameEn || 'Management System'}</p>
        </div>
      </div>

      {/* --- OUTLET SWITCHER --- */}
      <div className="px-4 pt-6 pb-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-2 block tracking-wider">
          {L('當前分店 (Active Outlet)')}
        </label>
        <div className="relative group">
          <select 
            value={selectedVenueId}
            onChange={(e) => setSelectedVenueId(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700 text-white text-sm rounded-lg px-3 py-2.5 appearance-none cursor-pointer hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {hasPermission('manage_all_outlets') && (
              <option value="all">🌐 {L('所有分店 (Global HQ)')}</option>
            )}
            {visibleVenues.map(v => (
              <option key={v.id} value={v.id}>🏢 {v.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-3 text-slate-500 pointer-events-none" size={16} />
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto mt-2">
        {menuItems.map(item => (
          <button 
            key={item.id} 
            onClick={() => setActiveTab(item.id)} 
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-black/20 translate-x-1' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <div className="flex items-center space-x-3 font-medium">
              <item.icon size={19} className={activeTab === item.id ? 'text-white' : 'text-slate-400'} />
              <span>{L(item.label)}</span>
            </div>
            {activeTab === item.id && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center space-x-3 px-2 mb-4 bg-slate-800/40 p-2 rounded-xl border border-slate-700/50">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-sm font-bold text-white shadow-inner">
            {userProfile?.displayName?.slice(0, 2).toUpperCase() || user?.uid?.slice(0, 2) || 'U'}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-bold text-white truncate leading-none mb-1">{userProfile?.displayName || 'Staff'}</p>
            <div className="flex items-center space-x-1">
              <span className={`w-1.5 h-1.5 rounded-full ${userProfile?.role === 'super_admin' ? 'bg-violet-500' : userProfile?.role === 'admin' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
              <p className="text-[10px] text-slate-400 truncate uppercase font-bold tracking-tight">{userProfile?.role || 'User'}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1 mb-3 border border-slate-700/50">
          {[{ id: 'zh', label: '中文' }, { id: 'en', label: 'English' }].map(o => (
            <button key={o.id} type="button" onClick={() => setLang(o.id)}
              className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all ${lang === o.id ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-white'}`}>
              {o.label}
            </button>
          ))}
        </div>
        <button onClick={handleSignOut} className="w-full flex items-center justify-center px-4 py-2.5 text-xs font-bold text-white bg-slate-800 hover:bg-rose-600 rounded-lg transition-all group shadow-sm border border-slate-700" title="登出">
          <LogOut size={14} className="mr-2 group-hover:scale-110 transition-transform" /> {L('安全登出 (Sign Out)')}
        </button>
      </div>
    </aside>
  );
}
