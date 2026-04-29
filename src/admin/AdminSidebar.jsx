import React from 'react';
import { MapPin, LayoutDashboard, FileText, Settings, LogOut, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminSidebar({ activeTab, setActiveTab, userProfile, user, handleSignOut }) {
  const { hasPermission } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: '儀表板 (Dashboard)', icon: LayoutDashboard, permission: 'dashboard' },
    { id: 'events', label: '訂單管理 (EOs)', icon: FileText, permission: 'events' },
    { id: 'docs', label: '使用指南 (Docs)', icon: BookOpen, permission: 'docs' },
    { id: 'settings', label: '設定 (Settings)', icon: Settings, permission: 'settings' },
  ].filter(item => hasPermission(item.permission));

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 hidden md:flex flex-col flex-shrink-0 transition-all">
      <div className="p-6 border-b border-slate-800 flex items-center space-x-3 text-white">
        <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/50">
          <MapPin size={20} />
        </div>
        <span className="text-l font-bold">璟瓏軒宴會管理系統</span>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map(item => (
          <button 
            key={item.id} 
            onClick={() => setActiveTab(item.id)} 
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800'}`}
          >
            <div className="flex items-center space-x-3">
              <item.icon size={20} />
              <span>{item.label}</span>
            </div>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center space-x-3 px-2 mb-3">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white border-2 border-slate-600">
            {userProfile?.displayName?.slice(0, 2).toUpperCase() || user?.uid?.slice(0, 2) || 'U'}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-medium text-white truncate">{userProfile?.displayName || 'Staff'}</p>
            <p className="text-xs text-slate-500 truncate capitalize">{userProfile?.role || 'User'}</p>
          </div>
        </div>
        <button onClick={handleSignOut} className="w-full flex items-center justify-center px-2 py-2 text-xs font-medium text-white bg-rose-600 rounded hover:bg-rose-700 transition-colors" title="登出">
          <LogOut size={14} className="mr-1" /> 登出
        </button>
      </div>
    </aside>
  );
}
