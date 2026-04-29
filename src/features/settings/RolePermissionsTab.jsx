import React, { useState, useEffect } from 'react';
import { 
  Shield, Plus, Trash2, Check, X, ChevronRight, 
  Save, AlertCircle, Info, UserPlus, Fingerprint 
} from 'lucide-react';
import { Card } from '../../components/ui';
import { PERMISSION_CATEGORIES as CATEGORIES, DEFAULT_ROLE_PERMISSIONS } from '../../core/constants';

const RolePermissionsTab = ({ settings, onSave, setLocalSettings, addToast }) => {
  const initialPermissions = (settings.rolePermissions && Object.keys(settings.rolePermissions).length > 0) 
    ? settings.rolePermissions 
    : DEFAULT_ROLE_PERMISSIONS;
    
  const [rolePermissions, setRolePermissions] = useState(initialPermissions);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hoverRow, setHoverRow] = useState(null);
  const [hoverCol, setHoverCol] = useState(null);

  const roles = Object.keys(rolePermissions);

  const handleToggle = (role, permissionId) => {
    if (role === 'admin' || rolePermissions[role].isFixed && role === 'admin') return;
    
    setRolePermissions(prev => {
      const updated = {
        ...prev,
        [role]: {
          ...prev[role],
          permissions: {
            ...prev[role].permissions,
            [permissionId]: !prev[role].permissions[permissionId]
          }
        }
      };
      setHasUnsavedChanges(true);
      return updated;
    });
  };

  const handleSaveAll = () => {
    const updatedSettings = { ...settings, rolePermissions };
    onSave(updatedSettings);
    if (setLocalSettings) {
      setLocalSettings(updatedSettings);
    }
    setHasUnsavedChanges(false);
    addToast("權限設定已成功儲存 (Permissions Saved)", "success");
  };

  const handleAddRole = () => {
    if (!newRoleId || !newRoleName) return addToast("請輸入角色代碼及名稱", "error");
    if (rolePermissions[newRoleId]) return addToast("角色代碼已存在", "error");

    const updated = {
      ...rolePermissions,
      [newRoleId.toLowerCase()]: {
        label: newRoleName,
        isFixed: false,
        permissions: {} // Default all false
      }
    };
    
    setRolePermissions(updated);
    setHasUnsavedChanges(true);
    setNewRoleId('');
    setNewRoleName('');
    addToast("角色已新增，請記得儲存變更", "info");
  };

  const handleDeleteRole = (roleId) => {
    if (rolePermissions[roleId].isFixed) return;
    if (!window.confirm(`確定要刪除角色「${rolePermissions[roleId].label}」嗎？`)) return;

    const updated = { ...rolePermissions };
    delete updated[roleId];
    
    setRolePermissions(updated);
    setHasUnsavedChanges(true);
    addToast("角色已移除，請記得儲存變更", "info");
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      {/* Header Info & Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Shield className="text-indigo-600" size={24} />
            權限矩陣管理 (RBAC Matrix)
          </h2>
          <p className="text-sm text-slate-500 font-medium">定義不同角色的系統操作與資料存取權限</p>
        </div>
        
        {hasUnsavedChanges && (
          <button 
            onClick={handleSaveAll}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all animate-bounce-subtle"
          >
            <Save size={18} />
            儲存變更 (Save Changes)
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Matrix Card */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px] table-fixed">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest w-1/2 border-r border-slate-800 sticky left-0 z-20 bg-slate-900">
                      系統功能權限矩陣
                    </th>
                    {roles.map(role => (
                      <th 
                        key={role} 
                        className={`p-4 text-center border-l border-slate-800 transition-colors ${hoverCol === role ? 'bg-indigo-600' : ''}`}
                        onMouseEnter={() => setHoverCol(role)}
                        onMouseLeave={() => setHoverCol(null)}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <Fingerprint size={16} className={hoverCol === role ? 'text-indigo-200' : 'text-slate-500'} />
                          <span className="text-xs font-black whitespace-nowrap">{rolePermissions[role].label}</span>
                          {!rolePermissions[role].isFixed && (
                            <button 
                              onClick={() => handleDeleteRole(role)}
                              className="text-[9px] text-rose-400 hover:text-rose-200 transition-colors uppercase font-bold tracking-tighter"
                            >
                              [ 刪除 ]
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {CATEGORIES.map(category => (
                    <React.Fragment key={category.id}>
                      <tr className="bg-slate-50/80">
                        <td colSpan={roles.length + 1} className="px-5 py-2.5 border-y border-slate-200">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                              {category.label}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {category.permissions.map(p => (
                        <tr 
                          key={p.id} 
                          className={`transition-all group ${hoverRow === p.id ? 'bg-indigo-50/50' : ''}`}
                          onMouseEnter={() => setHoverRow(p.id)}
                          onMouseLeave={() => setHoverRow(null)}
                        >
                          <td className="px-5 py-3 border-r border-slate-100 sticky left-0 z-10 bg-white group-hover:bg-indigo-50/50 transition-colors">
                            <div className="flex items-center">
                              <ChevronRight size={14} className={`mr-2 transition-transform duration-200 ${hoverRow === p.id ? 'text-indigo-600 translate-x-1' : 'text-slate-300'}`} />
                              <span className={`text-xs font-bold transition-colors ${hoverRow === p.id ? 'text-indigo-700' : 'text-slate-600'}`}>
                                {p.label}
                              </span>
                            </div>
                          </td>
                          {roles.map(role => {
                            const isGranted = rolePermissions[role].permissions[p.id];
                            const isAdmin = role === 'admin';
                            return (
                              <td 
                                key={`${role}-${p.id}`} 
                                className={`p-0 text-center border-l border-slate-50 transition-colors ${hoverCol === role ? 'bg-indigo-50/30' : ''}`}
                              >
                                <button 
                                  onClick={() => handleToggle(role, p.id)}
                                  disabled={isAdmin}
                                  className={`w-full py-4 flex items-center justify-center transition-all ${
                                    isGranted 
                                      ? 'text-indigo-600' 
                                      : 'text-slate-200'
                                  } ${isAdmin ? 'cursor-not-allowed text-indigo-400 opacity-60' : 'hover:bg-indigo-100/50'}`}
                                >
                                  <div className={`p-1 rounded-md transition-all ${isGranted ? 'bg-indigo-100 scale-110' : 'scale-90 opacity-40 group-hover:opacity-100'}`}>
                                    {isGranted ? <Check size={16} strokeWidth={4} /> : <X size={14} strokeWidth={3} />}
                                  </div>
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
             <div className="p-2 bg-slate-100 text-slate-500 rounded-lg">
                <AlertCircle size={20} />
             </div>
             <div>
                <p className="text-xs font-black text-slate-700">尚未儲存變更？</p>
                <p className="text-[10px] text-slate-500 font-medium">所有的權限更動在點擊右上方「儲存變更」按鈕前都不會生效。</p>
             </div>
          </div>
        </div>

        {/* Role Creation Card */}
        <Card className="lg:col-span-1 p-5 border-t-4 border-t-indigo-500 h-fit sticky top-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <UserPlus size={20} />
            </div>
            <h3 className="font-black text-slate-800">新增角色 (New Role)</h3>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">角色名稱 (Label)</label>
              <input 
                type="text" 
                value={newRoleName} 
                onChange={e => setNewRoleName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-sm font-bold"
                placeholder="例如: 高級銷售 (Senior Sales)"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">角色代碼 (Unique ID)</label>
              <input 
                type="text" 
                value={newRoleId} 
                onChange={e => setNewRoleId(e.target.value.toLowerCase().replace(/\s/g, ''))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-sm font-mono font-bold"
                placeholder="例如: senior_sales"
              />
            </div>
            <button 
              onClick={handleAddRole}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-indigo-600 transition-all shadow-md active:scale-[0.98]"
            >
              建立新角色
            </button>
          </div>

          <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
            <div className="flex gap-2 text-amber-800 mb-1">
              <Info size={16} className="shrink-0 mt-0.5" />
              <span className="text-xs font-black">使用提示 (Tips)</span>
            </div>
            <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
              • Admin 權限是固定的，不可修改。<br/>
              • 變更權限後，相關人員需重新整理頁面生效。<br/>
              • 「存取限制」可限制員工僅能看到自己負責的訂單。
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RolePermissionsTab;