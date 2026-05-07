import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, Modal } from '../components/ui';
import { db, functions } from '../core/firebase';
import { collection, doc, setDoc, onSnapshot, serverTimestamp, getDoc, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Shield, Users, Building2, LayoutDashboard, Globe, Settings, LogOut, Plus, Search, Loader2, ChevronRight, ExternalLink, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import AdminLogin from '../admin/AdminLogin';
import DataMigrationTool from './DataMigrationTool';

const SuperAdminPortal = () => {
  const { user, userProfile, loading: authLoading, login, loginGuest, signOut, error: authError } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTenantId, setNewTenantId] = useState('');
  const [newTenantName, setNewTenantName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  // --- DELETE TENANT STATE ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [globalUsers, setGlobalUsers] = useState([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // --- FETCH TENANTS ---
  useEffect(() => {
    if (!userProfile || userProfile.role !== 'super_admin') return;
    
    const tenantsRef = collection(db, 'tenants');
    const unsubscribe = onSnapshot(tenantsRef, (snap) => {
      setTenants(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Error fetching tenants:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userProfile]);

  // --- FETCH GLOBAL USERS ---
  useEffect(() => {
    if (activeTab !== 'users' || tenants.length === 0) return;
    
    const fetchAllUsers = async () => {
      setFetchingUsers(true);
      try {
        const allUsers = [];
        for (const tenant of tenants) {
          const usersRef = collection(db, 'artifacts', tenant.id, 'private', 'data', 'users');
          const usersSnap = await getDocs(usersRef);
          usersSnap.forEach(uDoc => {
            allUsers.push({
              ...uDoc.data(),
              tenantId: tenant.id,
              tenantName: tenant.name
            });
          });
        }
        // Sort by last login or created date
        allUsers.sort((a, b) => {
          const dateA = a.lastLogin?.toDate ? a.lastLogin.toDate() : new Date(0);
          const dateB = b.lastLogin?.toDate ? b.lastLogin.toDate() : new Date(0);
          return dateB - dateA;
        });
        setGlobalUsers(allUsers);
      } catch (err) {
        console.error("Error fetching global users:", err);
      } finally {
        setFetchingUsers(false);
      }
    };

    fetchAllUsers();
  }, [activeTab, tenants]);

  const handleJump = (tid) => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : '';
    
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
      window.location.href = `${protocol}//${tid}.localhost${port}/admin`;
    } else {
      // Production (Vercel or Custom Domain)
      // Note: This will result in [tenant].[project].vercel.app
      window.location.href = `${protocol}//${tid}.${hostname}${port}/admin`;
    }
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    if (!newTenantId || !newTenantName) return;
    setIsCreating(true);

    try {
      const tenantId = newTenantId.toLowerCase().trim().replace(/\s/g, '-');
      
      // 1. Create global tenant record
      await setDoc(doc(db, 'tenants', tenantId), {
        name: newTenantName,
        createdAt: serverTimestamp(),
        status: 'active'
      }, { merge: true });

      // 2. Initialize tenant settings ONLY if they don't exist
      const settingsRef = doc(db, 'artifacts', tenantId, 'private', 'data', 'settings', 'config');
      const settingsSnap = await getDoc(settingsRef);
      
      if (!settingsSnap.exists()) {
        await setDoc(settingsRef, {
          venueName: newTenantName,
          isSetupComplete: false,
          outlets: [
            { id: 'main', name: `${newTenantName} - Main Hall` }
          ],
          updatedAt: serverTimestamp()
        });
      }

      setIsCreateModalOpen(false);
      setNewTenantId('');
      setNewTenantName('');
      alert(`租戶 ${newTenantName} 設定成功！(ID: ${tenantId})`);
    } catch (err) {
      console.error("Error creating tenant:", err);
      alert("設定租戶失敗: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTenant = async (e) => {
    e.preventDefault();
    if (deleteConfirmation !== tenantToDelete?.id) {
      alert("請輸入正確的租戶 ID 以確認刪除");
      return;
    }
    setIsDeleting(true);

    try {
      const deleteApi = httpsCallable(functions, 'deleteTenant');
      await deleteApi({ tenantId: tenantToDelete.id });
      
      setIsDeleteModalOpen(false);
      setTenantToDelete(null);
      setDeleteConfirmation('');
      alert(`租戶 ${tenantToDelete.id} 已成功刪除。`);
    } catch (err) {
      console.error("Error deleting tenant:", err);
      alert("刪除租戶失敗: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClaimSuperAdmin = async () => {
    if (!user) {
      alert("請先登入 (Please log in first)");
      return;
    }
    setIsClaiming(true);
    try {
      const claimApi = httpsCallable(functions, 'updateUserRoleSecure');
      await claimApi({ appId: 'vowsos-central', uid: user.uid, newRole: 'super_admin' });
      alert("成功獲取 Super Admin 權限！請重新登入以生效。");
      signOut();
    } catch (err) {
      console.error("Bootstrap Error:", err);
      alert("獲取權限失敗: " + (err.message || "未知錯誤"));
    } finally {
      setIsClaiming(false);
    }
  };

  // 🌟 STEP 0: Auth or Profile still loading
  if (authLoading || (user && !userProfile)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 text-slate-500">
        <Loader2 className="animate-spin mb-4 text-violet-600" size={48} />
        <p className="font-bold">驗證身份中 (Verifying Identity)...</p>
      </div>
    );
  }

  // 🌟 STEP 1: If not logged in, show Login
  if (!user) {
    return <AdminLogin onLogin={login} error={authError} />;
  }

  // 🌟 STEP 2: If logged in but not super_admin, show Bootstrap
  if (userProfile?.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <Card className="p-8 max-w-md w-full text-center">
          <Shield className="mx-auto text-rose-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-slate-800 mb-2">存取被拒 (Access Denied)</h2>
          <p className="text-slate-500 mb-6 font-medium">
            您目前以 <span className="text-slate-900 font-bold">{user?.email}</span> 登入，但沒有存取系統管理員門戶的權限。
          </p>
          <div className="space-y-3">
             <button 
               onClick={handleClaimSuperAdmin} 
               disabled={isClaiming}
               className="w-full bg-violet-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-violet-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
             >
               {isClaiming ? <Loader2 className="animate-spin" /> : <><Shield size={18}/> 獲取 Super Admin 權限 (Bootstrap)</>}
             </button>
             <button onClick={signOut} className="w-full bg-slate-800 text-white px-6 py-3 rounded-xl font-bold transition-all hover:bg-slate-700">安全登出</button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3 text-white">
          <div className="bg-violet-600 p-2 rounded-lg shadow-lg">
            <Globe size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">VowsOS</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Central Console</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'overview' ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40' : 'hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={19} />
            <span className="font-medium">總覽 (Overview)</span>
          </button>
          <button 
            onClick={() => setActiveTab('tenants')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'tenants' ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40' : 'hover:bg-slate-800'}`}
          >
            <Building2 size={19} />
            <span className="font-medium">租戶管理 (Tenants)</span>
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'users' ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40' : 'hover:bg-slate-800'}`}
          >
            <Users size={19} />
            <span className="font-medium">系統用戶 (Users)</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'settings' ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40' : 'hover:bg-slate-800'}`}
          >
            <Settings size={19} />
            <span className="font-medium">全域設定 (Settings)</span>
          </button>
          <button 
            onClick={() => setActiveTab('system')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'system' ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40' : 'hover:bg-slate-800'}`}
          >
            <Shield size={19} />
            <span className="font-medium">資料同步 (Sync Tool)</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
           <button onClick={signOut} className="w-full flex items-center justify-center px-4 py-2.5 text-xs font-bold text-white bg-slate-800 hover:bg-rose-600 rounded-lg transition-all">
             <LogOut size={14} className="mr-2" /> 安全登出 (Sign Out)
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto h-screen">
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
          {/* Global Header */}
          <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {activeTab === 'overview' && '系統管理總覽'}
                {activeTab === 'tenants' && '租戶管理 (Tenants)'}
                {activeTab === 'users' && '系統用戶管理'}
                {activeTab === 'settings' && '全域平台設定'}
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                {activeTab === 'overview' && '管理 VowsOS 平台上的所有租戶與訂閱'}
                {activeTab === 'tenants' && `目前共有 ${tenants.length} 個活躍租戶`}
                {activeTab === 'users' && '管理具備全域管理權限的系統用戶'}
                {activeTab === 'settings' && '配置 VowsOS 平台的基礎參數與 API 密鑰'}
              </p>
            </div>
            <div className="flex items-center gap-4">
               <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{userProfile?.displayName}</p>
                  <p className="text-[10px] text-violet-600 font-black uppercase tracking-widest">Super Admin</p>
               </div>
               <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                  {userProfile?.displayName?.charAt(0)}
               </div>
            </div>
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 border-l-4 border-l-violet-500">
                   <p className="text-sm text-slate-500 font-bold mb-1">活躍租戶 (Active Tenants)</p>
                   <h3 className="text-3xl font-black text-slate-800">{tenants.length}</h3>
                </Card>
                <Card className="p-6 border-l-4 border-l-emerald-500">
                   <p className="text-sm text-slate-500 font-bold mb-1">本月營收 (Monthly Rev)</p>
                   <h3 className="text-3xl font-black text-slate-800">$0</h3>
                </Card>
                <Card className="p-6 border-l-4 border-l-blue-500">
                   <p className="text-sm text-slate-500 font-bold mb-1">系統健康度 (Health)</p>
                   <h3 className="text-3xl font-black text-slate-800 text-emerald-500">100%</h3>
                </Card>
              </div>

              <Card className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">最近活動 (Recent Activity)</h3>
                <div className="text-center py-8 text-slate-400 italic text-sm">
                  尚無最近活動紀錄
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'tenants' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input 
                     type="text" 
                     placeholder="搜尋租戶名稱或 ID..." 
                     className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-500/20 transition-all shadow-sm"
                   />
                </div>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-violet-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-violet-700 transition-all shadow-md active:scale-95 whitespace-nowrap"
                >
                  <Plus size={18} /> 新增租戶
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="animate-spin text-slate-300" size={48} />
                </div>
              ) : tenants.length === 0 ? (
                <Card className="p-12 text-center bg-white">
                   <Building2 className="mx-auto text-slate-200 mb-4" size={64} />
                   <h3 className="text-lg font-bold text-slate-800 mb-2">目前沒有租戶數據</h3>
                   <p className="text-slate-500 mb-6">開始新增您的第一個租戶以啟用平台功能。</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tenants.map(tenant => (
                    <Card key={tenant.id} className="p-6 hover:border-violet-300 transition-all group border border-slate-200 shadow-sm bg-white overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                         <Building2 size={80} className="-mr-8 -mt-4 text-slate-900" />
                      </div>

                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-violet-50 transition-colors">
                          <Globe className="text-slate-400 group-hover:text-violet-500" size={24} />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${tenant.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {tenant.status}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setTenantToDelete(tenant);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            title="刪除租戶"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="relative z-10">
                        <h4 className="text-lg font-black text-slate-800 truncate pr-8">{tenant.name}</h4>
                        <div className="flex items-center gap-1.5 mt-1 mb-6">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">ID: {tenant.id}</span>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-slate-50 flex justify-between items-center relative z-10">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">
                          建立於: {tenant.createdAt?.toDate ? tenant.createdAt.toDate().toLocaleDateString() : 'N/A'}
                        </div>
                        <button 
                          onClick={() => handleJump(tenant.id)}
                          className="text-xs font-black text-violet-600 hover:text-violet-700 flex items-center gap-1.5 group/btn"
                        >
                          進入系統 <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1 max-w-md">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input 
                     type="text" 
                     placeholder="搜尋用戶姓名、Email 或租戶 ID..." 
                     value={userSearch}
                     onChange={(e) => setUserSearch(e.target.value)}
                     className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-500/20 transition-all font-medium"
                   />
                </div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                   總用戶數: {globalUsers.length}
                </div>
              </div>

              {fetchingUsers ? (
                <div className="flex flex-col items-center justify-center p-24 text-slate-400 gap-4">
                  <Loader2 className="animate-spin" size={48} />
                  <p className="font-bold animate-pulse">正在掃描各租戶資料庫 (Scanning Tenants)...</p>
                </div>
              ) : (
                <Card className="overflow-hidden border-slate-200 shadow-sm bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">用戶 (User)</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">權限 (Role)</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">所屬租戶 (Tenant)</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">最後登入 (Activity)</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {globalUsers
                        .filter(u => 
                          u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.tenantId?.toLowerCase().includes(userSearch.toLowerCase())
                        )
                        .map((u, i) => (
                        <tr key={`${u.tenantId}-${u.uid}`} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                               <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 border border-slate-200">
                                  {u.displayName?.charAt(0) || 'U'}
                               </div>
                               <div>
                                  <p className="text-sm font-black text-slate-800">{u.displayName || 'Unknown'}</p>
                                  <p className="text-xs text-slate-400 font-medium font-mono">{u.email}</p>
                               </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                             <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${
                               u.role === 'admin' || u.role === 'super_admin' 
                               ? 'bg-indigo-50 text-indigo-600 border-indigo-100' 
                               : 'bg-slate-50 text-slate-500 border-slate-100'
                             }`}>
                               {u.role}
                             </span>
                          </td>
                          <td className="px-6 py-4">
                             <div>
                                <p className="text-sm font-bold text-slate-700">{u.tenantName}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {u.tenantId}</p>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                <Clock size={12} className="text-slate-300" />
                                {u.lastLogin?.toDate ? u.lastLogin.toDate().toLocaleString() : 'N/A'}
                             </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <button 
                               onClick={() => handleJump(u.tenantId)}
                               className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-600 hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-all shadow-sm active:scale-95"
                             >
                               協助恢復 <ExternalLink size={12} />
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {globalUsers.length === 0 && !fetchingUsers && (
                    <div className="text-center py-20 text-slate-400 italic text-sm">
                       尚無跨租戶用戶資料。
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <Card className="p-6">
                 <h3 className="text-lg font-bold text-slate-800 mb-2 border-b pb-4 text-rose-600">系統維護工具 (Maintenance)</h3>
                 <div className="mt-6">
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl mb-6 flex gap-3">
                       <AlertTriangle className="text-rose-600 shrink-0" />
                       <p className="text-xs text-rose-800 leading-relaxed">
                         <b>注意：</b> 此工具會將 <b>my-venue-crm</b> 的所有資料強制同步至 <b>kinglungheen</b>。
                         如果您在 King Lung Heen 建立了新訂單，執行同步可能會覆蓋部分設定。建議僅在確認 Legacy 資料有更新時使用。
                       </p>
                    </div>
                    <DataMigrationTool sourceId="my-venue-crm" targetId="kinglungheen" />
                 </div>
              </Card>
            </div>
          )}

          {activeTab === 'settings' && (
            <Card className="p-12 text-center bg-white border border-slate-200 shadow-sm">
               <Settings className="mx-auto text-slate-200 mb-4" size={64} />
               <h3 className="text-lg font-bold text-slate-800 mb-2">平台設定開發中</h3>
               <p className="text-slate-500">此功能將允許您配置 VowsOS 的全域參數與第三方整合。</p>
            </Card>
          )}
        </div>
      </main>

      {/* CREATE TENANT MODAL */}
      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => !isCreating && setIsCreateModalOpen(false)}
        title="建立新租戶 (New Tenant)"
      >
        <form onSubmit={handleCreateTenant} className="space-y-6 p-6 bg-slate-50">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">租戶名稱 (Tenant Name)</label>
            <input 
              type="text"
              required
              value={newTenantName}
              onChange={e => setNewTenantName(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-bold shadow-sm"
              placeholder="例如: 璟瓏軒 (King Lung Heen)"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">租戶代碼 (Subdomain ID)</label>
            <div className="flex items-center gap-2">
              <input 
                type="text"
                required
                value={newTenantId}
                onChange={e => setNewTenantId(e.target.value.toLowerCase().replace(/\s/g, ''))}
                className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-mono font-bold shadow-sm"
                placeholder="kinglungheen"
              />
              <span className="text-sm font-bold text-slate-400">.vowsos.com</span>
            </div>
          </div>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 shadow-sm">
             <Shield className="text-amber-600 shrink-0" size={20} />
             <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
               建立租戶後，系統將自動初始化必要的資料結構與預設設定。此操作無法輕易還原，請確認代碼輸入正確。
             </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="flex-1 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
              取消
            </button>
            <button 
              type="submit"
              disabled={isCreating}
              className="flex-[2] py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isCreating ? <Loader2 className="animate-spin" size={20} /> : '確認建立租戶'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE TENANT MODAL */}
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        title="刪除租戶 (Delete Tenant)"
      >
        <form onSubmit={handleDeleteTenant} className="space-y-6 p-6 bg-slate-50">
          <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 flex gap-3 shadow-sm">
             <AlertTriangle className="text-rose-600 shrink-0" size={20} />
             <div>
               <p className="text-sm font-bold text-rose-800">警告：此操作不可復原</p>
               <p className="text-[10px] text-rose-700 leading-relaxed font-medium mt-1">
                 您即將刪除租戶 <b>{tenantToDelete?.name} ({tenantToDelete?.id})</b>。
                 這將永久移除所有相關的活動、設定、用戶資料與檔案。
               </p>
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
              請輸入租戶 ID <span className="text-rose-600 font-mono">"{tenantToDelete?.id}"</span> 以確認刪除：
            </label>
            <input 
              type="text"
              required
              value={deleteConfirmation}
              onChange={e => setDeleteConfirmation(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-mono font-bold shadow-sm"
              placeholder={tenantToDelete?.id}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setTenantToDelete(null);
                setDeleteConfirmation('');
              }}
              className="flex-1 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
              取消
            </button>
            <button 
              type="submit"
              disabled={isDeleting || deleteConfirmation !== tenantToDelete?.id}
              className="flex-[2] py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="animate-spin" size={20} /> : '確認永久刪除'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SuperAdminPortal;
