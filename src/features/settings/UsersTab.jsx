import React, { useState } from 'react';
import { User, Mail, Shield, Trash2, Plus, Search, MoreVertical, Edit2 } from 'lucide-react';
import { Card } from '../../components/ui';

const UsersTab = ({ users, appSettings, updateUserRole, updateUserProfile, deleteUser, addToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'staff' });
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

  const handleUpdateName = async (userId) => {
    try {
      await updateUserProfile(userId, { displayName: editingName });
      setEditingUserId(null);
      addToast("用戶名稱已更新", "success");
    } catch (err) {
      addToast("更新失敗", "error");
    }
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
          <h3 className="font-bold text-slate-800 mb-4">新增系統用戶</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">用戶名稱 (Name)</label>
              <input 
                type="text" 
                value={newUser.name}
                onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm"
                placeholder="例如: Ryan"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">電子郵件 (Email)</label>
              <input 
                type="email" 
                value={newUser.email}
                onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm"
                placeholder="ryan@example.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">角色 (Role)</label>
              <select 
                value={newUser.role}
                onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm appearance-none"
              >
                {Object.entries(roles).map(([id, config]) => (
                  <option key={id} value={id}>{config.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button 
              onClick={() => setIsAddingUser(false)}
              className="px-4 py-2 text-slate-600 font-bold text-sm"
            >
              取消
            </button>
            <button 
              onClick={() => {
                // In a real app, this would invite the user via Firebase Auth
                addToast("用戶邀請功能需配合 Firebase Admin SDK", "info");
                setIsAddingUser(false);
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm"
            >
              送出邀請
            </button>
          </div>
        </Card>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">用戶名稱 (Name)</th>
              <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">電子郵件 (Email)</th>
              <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">角色 (Role)</th>
              <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400 text-sm">找不到用戶</td>
              </tr>
            ) : (
              filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                        {u.displayName?.charAt(0).toUpperCase() || <User size={14} />}
                      </div>
                      {editingUserId === u.id ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            className="px-2 py-1 bg-white border border-blue-500 rounded text-sm font-bold outline-none"
                            autoFocus
                          />
                          <button onClick={() => handleUpdateName(u.id)} className="text-emerald-600 hover:text-emerald-700 font-bold text-xs uppercase">儲存</button>
                          <button onClick={() => setEditingUserId(null)} className="text-slate-400 hover:text-slate-500 font-bold text-xs uppercase">取消</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <span className="font-bold text-slate-700">{u.displayName}</span>
                          <button 
                            onClick={() => { setEditingUserId(u.id); setEditingName(u.displayName || ''); }}
                            className="p-1 text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-500 font-mono">{u.email}</td>
                  <td className="p-4">
                    <select 
                      value={u.role || 'staff'}
                      onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                      disabled={u.role === 'admin' && users.filter(usr => usr.role === 'admin').length === 1}
                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-600 outline-none focus:border-blue-500"
                    >
                      {Object.entries(roles).map(([id, config]) => (
                        <option key={id} value={id}>{config.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDeleteUser(u.id, u.displayName)}
                      disabled={u.role === 'admin'}
                      className={`p-2 rounded-lg transition-colors ${u.role === 'admin' ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                    >
                      <Trash2 size={18} />
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