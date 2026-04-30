import React, { useState } from 'react';
import { User, Mail, Shield, Trash2, Plus, Search, MoreVertical, Edit2, Building2 } from 'lucide-react';
import { Card } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

const UsersTab = ({ users, appSettings, updateUserRole, updateUserProfile, deleteUser, addToast }) => {
  const { outlets } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'staff', accessibleVenues: [] });
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const roles = appSettings.rolePermissions || {};

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUpdateRole = async (userId, role) => {
    try {
      await updateUserRole(userId, role);
      addToast("用戶角色已更新", "success");
    } catch (err) {
      addToast("更新失敗", "error");
    }
  };

  const handleUpdateVenues = async (userId, venues) => {
    try {
      await updateUserProfile(userId, { accessibleVenues: venues });
      addToast("分店存取權限已更新", "success");
    } catch (err) {
      addToast("更新失敗", "error");
    }
  };

  const handleUpdateName = async (userId) => {
    try {
      await updateUserProfile(userId, { displayName: editingName });
      setEditingUserId(null);
      addToast("用戶名稱已更新", "success");
    } catch (err) {
      addToast("更新失敗", "error");
    }
  };

  const toggleVenue = (currentVenues, venueId) => {
    if (currentVenues.includes(venueId)) {
      return currentVenues.filter(id => id !== venueId);
    }
    return [...currentVenues, venueId];
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`確定要刪除用戶「${userName}」嗎？`)) return;
    try {
      await deleteUser(userId);
      addToast("用戶已刪除", "success");
    } catch (err) {
      addToast("刪除失敗", "error");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="搜尋用戶名稱或電郵..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white transition-all text-sm"
          />
        </div>
        <button 
          onClick={() => setIsAddingUser(!isAddingUser)}
          className="ml-4 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm text-sm"
        >
          <Plus size={18} /> 新增用戶 (Add User)
        </button>
      </div>

      {isAddingUser && (
        <Card className="p-5 border-l-4 border-l-blue-500 animate-in slide-in-from-top-2">
          <h3 className="font-bold text-slate-800 mb-4 text-lg">新增系統用戶</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">用戶名稱 (Name)</label>
              <input 
                type="text" 
                value={newUser.name}
                onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="例如: Ryan"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">電子郵件 (Email)</label>
              <input 
                type="email" 
                value={newUser.email}
                onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="ryan@example.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">角色 (Role)</label>
              <select 
                value={newUser.role}
                onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm appearance-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                {Object.entries(roles).map(([id, config]) => (
                  <option key={id} value={id}>{config.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-2">可存取分店 (Accessible Outlets)</label>
            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              {outlets.map(v => (
                <button
                  key={v.id}
                  onClick={() => setNewUser(p => ({ ...p, accessibleVenues: toggleVenue(p.accessibleVenues, v.id) }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${newUser.accessibleVenues.includes(v.id) ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                >
                  <Building2 size={14} /> {v.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button 
              onClick={() => setIsAddingUser(false)}
              className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-50 rounded-lg transition-colors"
            >
              取消 (Cancel)
            </button>
            <button 
              onClick={() => {
                addToast("用戶邀請功能需配合 Firebase Admin SDK", "info");
                setIsAddingUser(false);
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 shadow-md transition-all active:scale-95"
            >
              送出邀請 (Invite)
            </button>
          </div>
        </Card>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">用戶 (User)</th>
              <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">角色 (Role)</th>
              <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">分店權限 (Outlets)</th>
              <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400 text-sm italic">找不到用戶</td>
              </tr>
            ) : (
              filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-700 flex items-center justify-center font-bold text-sm shadow-inner shrink-0">
                        {u.displayName?.charAt(0).toUpperCase() || <User size={16} />}
                      </div>
                      <div className="min-w-0">
                        {editingUserId === u.id ? (
                          <div className="flex items-center gap-2">
                            <input 
                              type="text" 
                              value={editingName}
                              onChange={e => setEditingName(e.target.value)}
                              className="px-2 py-1 bg-white border border-blue-500 rounded text-sm font-bold outline-none shadow-sm"
                              autoFocus
                            />
                            <button onClick={() => handleUpdateName(u.id)} className="text-emerald-600 hover:text-emerald-700 font-bold text-xs uppercase">儲存</button>
                            <button onClick={() => setEditingUserId(null)} className="text-slate-400 hover:text-slate-500 font-bold text-xs uppercase">取消</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <span className="font-bold text-slate-800">{u.displayName}</span>
                            <button 
                              onClick={() => { setEditingUserId(u.id); setEditingName(u.displayName || ''); }}
                              className="p-1 text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Edit2 size={12} />
                            </button>
                          </div>
                        )}
                        <p className="text-xs text-slate-400 font-mono truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <select 
                      value={u.role || 'staff'}
                      onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                      disabled={u.role === 'admin' && users.filter(usr => usr.role === 'admin').length === 1}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-sm"
                    >
                      {Object.entries(roles).map(([id, config]) => (
                        <option key={id} value={id}>{config.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1.5 max-w-[300px]">
                      {u.role === 'admin' ? (
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100">所有分店 (All Outlets)</span>
                      ) : (
                        <>
                          {(u.accessibleVenues || []).map(vid => (
                            <span key={vid} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                              <Building2 size={10} /> {outlets.find(o => o.id === vid)?.name.split(' (')[0]}
                              <button onClick={() => handleUpdateVenues(u.id, u.accessibleVenues.filter(id => id !== vid))} className="text-slate-400 hover:text-red-500 transition-colors ml-0.5">×</button>
                            </span>
                          ))}
                          <div className="relative group">
                            <button className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1">
                              <Plus size={10} /> 新增
                            </button>
                            <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-10 hidden group-hover:block min-w-[200px] animate-in fade-in slide-in-from-top-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase px-2 mb-2 tracking-wider">選擇分店</p>
                              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                {outlets.filter(v => !u.accessibleVenues?.includes(v.id)).map(v => (
                                  <button
                                    key={v.id}
                                    onClick={() => handleUpdateVenues(u.id, [...(u.accessibleVenues || []), v.id])}
                                    className="w-full text-left px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors flex items-center gap-2"
                                  >
                                    <Building2 size={12} /> {v.name}
                                  </button>
                                ))}
                                {outlets.filter(v => !u.accessibleVenues?.includes(v.id)).length === 0 && (
                                  <p className="text-[10px] text-slate-400 px-2 italic">已無更多分店</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDeleteUser(u.id, u.displayName)}
                      disabled={u.role === 'admin'}
                      className={`p-2 rounded-lg transition-all ${u.role === 'admin' ? 'text-slate-100 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50 hover:scale-110'}`}
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersTab;