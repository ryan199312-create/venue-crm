import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { User, Mail, Phone, Trash2, Plus, Search, Edit2, Building2, Copy, CheckCircle, Clock, Loader2, X } from 'lucide-react';
import { Card } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_ROLE_PERMISSIONS } from '../../core/constants';
import { useLang } from '../../i18n/language';

const UsersTab = ({ users, pendingUsers = [], appSettings, updateUserRole, updateUserProfile, deleteUser, provisionUser, revokePending, addToast }) => {
  const { L } = useLang();
  const { outlets, userProfile, maxUsers } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', identifierType: 'email', identifier: '', role: 'staff', accessibleVenues: [] });
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [provisioned, setProvisioned] = useState(null); // { identifier, type }
  const [addOutletUserId, setAddOutletUserId] = useState(null); // which user's "add outlet" picker is open

  const roles = { ...DEFAULT_ROLE_PERMISSIONS, ...(appSettings.rolePermissions || {}) };

  const filteredUsers = users.filter(u =>
    (u.role || 'staff') !== 'deleted' && (
      u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(u.phone || '').includes(searchTerm)
    )
  );

  const activeCount = users.filter(u => (u.role || 'staff') !== 'deleted').length;
  const usedCount = activeCount + pendingUsers.length;
  const atUserLimit = maxUsers !== null && usedCount >= maxUsers;
  const activateUrl = `${window.location.origin}/activate`;

  const handleProvision = async () => {
    if (!newUser.identifier.trim()) {
      return addToast(newUser.identifierType === 'phone' ? L('請輸入電話號碼 (Enter phone number)') : L('請輸入電郵 (Enter email)'), 'error');
    }
    setIsInviting(true);
    try {
      await provisionUser({
        identifier: newUser.identifier.trim(),
        type: newUser.identifierType,
        role: newUser.role,
        displayName: newUser.name,
        accessibleVenues: newUser.accessibleVenues
      });
      setProvisioned({ identifier: newUser.identifier.trim(), type: newUser.identifierType });
      setNewUser({ name: '', identifierType: 'email', identifier: '', role: 'staff', accessibleVenues: [] });
      setIsAddingUser(false);
    } catch (err) {
      console.error(err);
      addToast(L('新增失敗 (Add failed)') + ': ' + (err.message || err), 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevoke = async (key, label) => {
    if (!window.confirm(`${L('確定要移除待啟用用戶 (Remove this pending user)')}「${label}」？`)) return;
    try {
      await revokePending(key);
      addToast(L('已移除 (Removed)'), 'success');
    } catch (err) {
      addToast(L('移除失敗 (Remove failed)') + ': ' + (err.message || err), 'error');
    }
  };

  const handleUpdateRole = async (userId, role) => {
    try { await updateUserRole(userId, role); addToast(L('用戶角色已更新 (Role updated)'), 'success'); }
    catch (err) { addToast(L('更新失敗 (Update failed)'), 'error'); }
  };

  const handleUpdateVenues = async (userId, venues) => {
    try { await updateUserProfile(userId, { accessibleVenues: venues }); addToast(L('分店存取權限已更新 (Outlet access updated)'), 'success'); }
    catch (err) { addToast(L('更新失敗 (Update failed)'), 'error'); }
  };

  const handleUpdateName = async (userId) => {
    try { await updateUserProfile(userId, { displayName: editingName }); setEditingUserId(null); addToast(L('用戶名稱已更新 (Name updated)'), 'success'); }
    catch (err) { addToast(L('更新失敗 (Update failed)'), 'error'); }
  };

  const toggleVenue = (currentVenues, venueId) =>
    currentVenues.includes(venueId) ? currentVenues.filter(id => id !== venueId) : [...currentVenues, venueId];

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`${L('確定要刪除用戶 (Delete this user)')}「${userName}」？`)) return;
    try { await deleteUser(userId); addToast(L('用戶已刪除 (User deleted)'), 'success'); }
    catch (err) { addToast(L('刪除失敗 (Delete failed)'), 'error'); }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Provision success — activation instructions */}
      {provisioned && (
        <div className="fixed inset-0 z-[5000] bg-black/40 flex items-center justify-center p-4" onClick={() => setProvisioned(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <CheckCircle className="text-emerald-500 shrink-0" size={22} />
              <p className="text-sm font-bold text-emerald-800">{L('已登記！請通知對方啟用帳戶。 (Registered! Ask them to activate their account.)')}</p>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {L('請對方前往以下網址，使用其 (Ask them to visit the link below using their)')} <b>{provisioned.type === 'phone' ? L('電話號碼 (Phone Number)') : 'Email'}</b>
              <code className="mx-1 px-1.5 py-0.5 bg-slate-100 rounded font-mono text-xs">{provisioned.identifier}</code>
              {L('啟用帳戶並自行設定密碼： (to activate the account and set their own password:)')}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-3 bg-slate-50 border border-indigo-200 rounded-xl font-mono text-sm font-bold text-indigo-700 break-all">{activateUrl}</code>
              <button onClick={() => navigator.clipboard?.writeText(activateUrl)} className="px-3 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50" title={L('複製連結 (Copy link)')}><Copy size={16} /></button>
            </div>
            <button onClick={() => setProvisioned(null)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all">{L('完成 (Done)')}</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder={L('搜尋用戶名稱、電郵或電話 (Search name, email or phone)') + '...'} value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm" />
        </div>
        <div className="flex items-center gap-3">
          {maxUsers !== null && (
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${atUserLimit ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {L('用戶 (Users)')} {usedCount} / {maxUsers}
            </span>
          )}
          <button onClick={() => setIsAddingUser(!isAddingUser)} disabled={atUserLimit && !isAddingUser}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm text-sm disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
            <Plus size={18} /> {L('新增用戶 (Add User)')}
          </button>
        </div>
      </div>

      {atUserLimit && (
        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-700 font-medium">
          {L('已達授權用戶數量上限，如需新增請聯絡平台管理員升級方案。 (Licensed user limit reached. To add more, contact the platform admin to upgrade your plan.)')} ({maxUsers})
        </div>
      )}

      {/* Add (provision) form */}
      {isAddingUser && (
        <Card className="p-5 border-l-4 border-l-indigo-500 animate-in slide-in-from-top-2">
          <h3 className="font-bold text-slate-800 mb-1 text-lg">{L('登記新用戶 (Register New User)')}</h3>
          <p className="text-xs text-slate-400 mb-4">{L('登記後，對方自行前往啟用頁面設定密碼 — 無需驗證。 (After registration, the user visits the activation page to set their own password — no verification needed.)')}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">{L('用戶名稱 (Name)')}</label>
              <input type="text" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-indigo-500 transition-all" placeholder={L('例如 (e.g.)') + ': Ryan'} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{L('登入方式 (Login ID)')}</label>
                <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
                  {['email', 'phone'].map(t => (
                    <button key={t} type="button" onClick={() => setNewUser(p => ({ ...p, identifierType: t }))}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all ${newUser.identifierType === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
                      {t === 'email' ? 'Email' : L('電話 (Phone)')}
                    </button>
                  ))}
                </div>
              </div>
              <input type={newUser.identifierType === 'phone' ? 'tel' : 'email'} value={newUser.identifier}
                onChange={e => setNewUser(p => ({ ...p, identifier: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder={newUser.identifierType === 'phone' ? '91234567' : 'ryan@example.com'} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">{L('角色 (Role)')}</label>
              <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm appearance-none focus:ring-2 focus:ring-indigo-500 transition-all">
                {Object.entries(roles).filter(([id]) => id !== 'super_admin').map(([id, config]) => (
                  <option key={id} value={id}>{L(config.label)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-2">{L('可存取分店 (Accessible Outlets)')}</label>
            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              {outlets.map(v => (
                <button key={v.id} onClick={() => setNewUser(p => ({ ...p, accessibleVenues: toggleVenue(p.accessibleVenues, v.id) }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${newUser.accessibleVenues.includes(v.id) ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                  <Building2 size={14} /> {v.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button onClick={() => setIsAddingUser(false)} disabled={isInviting}
              className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-50 rounded-lg transition-colors">{L('取消 (Cancel)')}</button>
            <button onClick={handleProvision} disabled={isInviting}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-60">
              {isInviting ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              {isInviting ? L('登記中 (Registering)') + '...' : L('登記用戶 (Register User)')}
            </button>
          </div>
        </Card>
      )}

      {/* Pending (whitelisted, not yet activated) */}
      {pendingUsers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden">
          <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <Clock size={16} className="text-amber-600" />
            <h4 className="font-bold text-amber-800 text-sm">{L('待啟用用戶 (Pending Activation)')} ({pendingUsers.length})</h4>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingUsers.map(p => (
              <div key={p.key} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    {p.type === 'phone' ? <Phone size={16} /> : <Mail size={16} />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{p.displayName || p.identifier}</p>
                    <p className="text-xs text-slate-400 font-mono">{p.identifier} · {L(roles[p.role]?.label || p.role)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">{L('尚未啟用 (Not Activated)')}</span>
                  <button onClick={() => handleRevoke(p.key, p.identifier)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active users table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">{L('用戶 (User)')}</th>
              <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">{L('角色 (Role)')}</th>
              <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">{L('分店權限 (Outlets)')}</th>
              <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">{L('操作 (Actions)')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400 text-sm italic">{L('找不到用戶 (No users found)')}</td></tr>
            ) : (
              filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shadow-inner shrink-0">
                        {u.displayName?.charAt(0).toUpperCase() || <User size={16} />}
                      </div>
                      <div className="min-w-0">
                        {editingUserId === u.id ? (
                          <div className="flex items-center gap-2">
                            <input type="text" value={editingName} onChange={e => setEditingName(e.target.value)}
                              className="px-2 py-1 bg-white border border-indigo-500 rounded text-sm font-bold outline-none shadow-sm" autoFocus />
                            <button onClick={() => handleUpdateName(u.id)} className="text-emerald-600 hover:text-emerald-700 font-bold text-xs uppercase">{L('儲存 (Save)')}</button>
                            <button onClick={() => setEditingUserId(null)} className="text-slate-400 hover:text-slate-500 font-bold text-xs uppercase">{L('取消 (Cancel)')}</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <span className="font-bold text-slate-800">{u.displayName}</span>
                            <button onClick={() => { setEditingUserId(u.id); setEditingName(u.displayName || ''); }}
                              className="p-1 text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all"><Edit2 size={12} /></button>
                          </div>
                        )}
                        <p className="text-xs text-slate-400 font-mono truncate flex items-center gap-1">
                          {u.loginType === 'phone' ? <Phone size={10} /> : <Mail size={10} />}
                          {u.email || u.phone || '—'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <select value={u.role || 'staff'} onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                      disabled={userProfile?.role !== 'super_admin' && (u.role === 'admin' || u.role === 'super_admin') && users.filter(usr => usr.role === 'admin' || usr.role === 'super_admin').length === 1}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-sm">
                      {/* super_admin is the platform master — never assignable from a tenant.
                          (Kept as an option only if the user somehow already holds it, so the
                          select isn't broken.) */}
                      {Object.entries(roles).filter(([id]) => id !== 'super_admin' || u.role === 'super_admin').map(([id, config]) => (<option key={id} value={id}>{L(config.label)}</option>))}
                    </select>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1.5 max-w-[300px]">
                      {(u.role === 'admin' || u.role === 'super_admin') ? (
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100">{L('所有分店 (All Outlets)')}</span>
                      ) : (
                        <>
                          {(u.accessibleVenues || []).map(vid => (
                            <span key={vid} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                              <Building2 size={10} /> {outlets.find(o => o.id === vid)?.name.split(' (')[0]}
                              <button onClick={() => handleUpdateVenues(u.id, u.accessibleVenues.filter(id => id !== vid))} className="text-slate-400 hover:text-red-500 transition-colors ml-0.5">×</button>
                            </span>
                          ))}
                          <button onClick={() => setAddOutletUserId(u.id)} className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors flex items-center gap-1">
                            <Plus size={10} /> {L('新增 (Add)')}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleDeleteUser(u.id, u.displayName)}
                      disabled={u.role === 'admin' || u.role === 'super_admin'}
                      className={`p-2 rounded-lg transition-all ${u.role === 'admin' || u.role === 'super_admin' ? 'text-slate-100 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50 hover:scale-110'}`}>
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add-outlet picker — rendered in a portal so it isn't clipped by the table's overflow */}
      {addOutletUserId && createPortal((() => {
        const u = users.find(x => x.id === addOutletUserId);
        if (!u) return null;
        const available = outlets.filter(v => !u.accessibleVenues?.includes(v.id));
        return (
          <div className="fixed inset-0 z-[5000] bg-black/40 flex items-center justify-center p-4" onClick={() => setAddOutletUserId(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Building2 size={16} className="text-indigo-600" /> {L('選擇分店 (Select Outlet)')}</h4>
                <button onClick={() => setAddOutletUserId(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
              </div>
              <p className="text-[11px] text-slate-400 mb-3 truncate">{u.displayName}</p>
              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {available.map(v => (
                  <button key={v.id} onClick={() => { handleUpdateVenues(u.id, [...(u.accessibleVenues || []), v.id]); setAddOutletUserId(null); }}
                    className="w-full text-left px-3 py-2 text-sm font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors flex items-center gap-2">
                    <Building2 size={14} /> {v.name}
                  </button>
                ))}
                {available.length === 0 && <p className="text-[11px] text-slate-400 px-2 italic py-4 text-center">{L('已無更多分店 (No more outlets)')}</p>}
              </div>
            </div>
          </div>
        );
      })(), document.body)}
    </div>
  );
};

export default UsersTab;
