import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, Modal } from '../components/ui';
import { db, functions } from '../core/firebase';
import { collection, doc, setDoc, onSnapshot, serverTimestamp, getDoc, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  Shield, Users, Building2, LayoutDashboard, Globe, LogOut, Plus, Search, Loader2,
  ArrowLeft, ExternalLink, Clock, AlertTriangle, Trash2, Layers, Gauge, UserPlus,
  Power, Database, CheckCircle, ChevronRight, Pencil, Copy
} from 'lucide-react';
import AdminLogin from '../admin/AdminLogin';
import DataMigrationTool from './DataMigrationTool';

// ---------- Small presentational helpers ----------
// Static class strings so the Tailwind build includes them (no dynamic interpolation).
const ACCENTS = {
  violet: { border: 'border-l-violet-500', icon: 'text-violet-400' },
  emerald: { border: 'border-l-emerald-500', icon: 'text-emerald-400' },
  blue: { border: 'border-l-blue-500', icon: 'text-blue-400' },
  rose: { border: 'border-l-rose-500', icon: 'text-rose-400' },
  slate: { border: 'border-l-slate-400', icon: 'text-slate-400' }
};

const KpiCard = ({ icon: Icon, label, value, sub, accent = 'violet' }) => {
  const a = ACCENTS[accent] || ACCENTS.violet;
  return (
    <Card className={`p-6 border-l-4 ${a.border}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-slate-500 font-bold">{label}</p>
        <Icon size={18} className={a.icon} />
      </div>
      <h3 className="text-3xl font-black text-slate-800">{value}</h3>
      {sub && <p className="text-[11px] text-slate-400 font-bold mt-1">{sub}</p>}
    </Card>
  );
};

const roleBadge = (role) => {
  const map = {
    super_admin: 'bg-violet-50 text-violet-700 border-violet-100',
    admin: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    staff: 'bg-slate-50 text-slate-500 border-slate-100'
  };
  return map[role] || map.staff;
};

const SuperAdminPortal = () => {
  const { user, userProfile, loading: authLoading, login, signOut, error: authError } = useAuth();

  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [tenantSearch, setTenantSearch] = useState('');

  // Aggregates keyed by tenant id
  const [usageMap, setUsageMap] = useState({});   // outlets in use
  const [userCountMap, setUserCountMap] = useState({});

  // Drill-down
  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [tenantUsers, setTenantUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Modals / forms
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTenant, setNewTenant] = useState({ id: '', name: '', maxBranches: 1 });
  const [isCreating, setIsCreating] = useState(false);

  const [isLicenseOpen, setIsLicenseOpen] = useState(false);
  const [licenseValue, setLicenseValue] = useState(1);
  const [isSavingLicense, setIsSavingLicense] = useState(false);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', displayName: '', role: 'staff' });
  const [isInviting, setIsInviting] = useState(false);
  const [invitedCreds, setInvitedCreds] = useState(null); // { email, tempPassword, isNew }

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [migrateSource, setMigrateSource] = useState('');
  const [busyMsg, setBusyMsg] = useState('');

  const isSuper = userProfile?.role === 'super_admin';
  const selectedTenant = useMemo(
    () => tenants.find(t => t.id === selectedTenantId) || null,
    [tenants, selectedTenantId]
  );

  // ---------- Fetch tenants ----------
  useEffect(() => {
    if (!isSuper) return;
    const unsub = onSnapshot(collection(db, 'tenants'), (snap) => {
      setTenants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => { console.error('Error fetching tenants:', err); setLoading(false); });
    return () => unsub();
  }, [isSuper]);

  // ---------- Fetch aggregates (branch usage + user counts) ----------
  useEffect(() => {
    if (tenants.length === 0) return;
    let cancelled = false;
    (async () => {
      const usage = {};
      const counts = {};
      for (const t of tenants) {
        try {
          const cfg = await getDoc(doc(db, 'artifacts', t.id, 'private', 'data', 'settings', 'config'));
          usage[t.id] = cfg.exists() ? (cfg.data().outlets || []).length : 0;
        } catch { usage[t.id] = null; }
        try {
          const us = await getDocs(collection(db, 'artifacts', t.id, 'private', 'data', 'users'));
          counts[t.id] = us.size;
        } catch { counts[t.id] = null; }
      }
      if (!cancelled) { setUsageMap(usage); setUserCountMap(counts); }
    })();
    return () => { cancelled = true; };
  }, [tenants]);

  // ---------- Fetch users of the selected tenant (live) ----------
  useEffect(() => {
    if (!selectedTenantId) { setTenantUsers([]); return; }
    setLoadingUsers(true);
    const unsub = onSnapshot(
      collection(db, 'artifacts', selectedTenantId, 'private', 'data', 'users'),
      (snap) => { setTenantUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() }))); setLoadingUsers(false); },
      (err) => { console.error('Error fetching tenant users:', err); setLoadingUsers(false); }
    );
    return () => unsub();
  }, [selectedTenantId]);

  // ---------- Derived KPIs ----------
  const kpis = useMemo(() => {
    const activeCount = tenants.filter(t => (t.status || 'active') === 'active').length;
    let licensed = 0, used = 0, users = 0, atCap = 0;
    for (const t of tenants) {
      const max = typeof t.maxBranches === 'number' ? t.maxBranches : null;
      const u = usageMap[t.id] ?? 0;
      if (max !== null) { licensed += max; if (u >= max) atCap += 1; }
      used += u;
      users += userCountMap[t.id] ?? 0;
    }
    return { activeCount, licensed, used, users, atCap };
  }, [tenants, usageMap, userCountMap]);

  const attentionTenants = useMemo(() => tenants.filter(t => {
    const max = typeof t.maxBranches === 'number' ? t.maxBranches : null;
    const u = usageMap[t.id] ?? 0;
    return (t.status && t.status !== 'active') || (max !== null && u >= max);
  }), [tenants, usageMap]);

  // ---------- Actions ----------
  const jumpTo = (tid) => {
    const { hostname, protocol, port } = window.location;
    const p = port ? `:${port}` : '';
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
      window.location.href = `${protocol}//${tid}.localhost${p}/admin`;
    } else {
      window.location.href = `${protocol}//${tid}.${hostname}${p}/admin`;
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const id = newTenant.id.toLowerCase().trim().replace(/\s/g, '-');
    if (!id || !newTenant.name) return;
    setIsCreating(true);
    try {
      await setDoc(doc(db, 'tenants', id), {
        name: newTenant.name,
        createdAt: serverTimestamp(),
        status: 'active',
        maxBranches: Math.max(1, Number(newTenant.maxBranches) || 1)
      }, { merge: true });

      const settingsRef = doc(db, 'artifacts', id, 'private', 'data', 'settings', 'config');
      const settingsSnap = await getDoc(settingsRef);
      if (!settingsSnap.exists()) {
        await setDoc(settingsRef, {
          venueName: newTenant.name,
          isSetupComplete: false,
          outlets: [{ id: 'main', name: `${newTenant.name} - Main Hall` }],
          updatedAt: serverTimestamp()
        });
      }
      setIsCreateOpen(false);
      setNewTenant({ id: '', name: '', maxBranches: 1 });
    } catch (err) {
      console.error('Error creating tenant:', err);
      alert('建立租戶失敗: ' + err.message);
    } finally { setIsCreating(false); }
  };

  const toggleStatus = async (tenant) => {
    const next = (tenant.status || 'active') === 'active' ? 'suspended' : 'active';
    try {
      await setDoc(doc(db, 'tenants', tenant.id), { status: next, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) { alert('更新狀態失敗: ' + err.message); }
  };

  const openLicense = () => {
    setLicenseValue(typeof selectedTenant?.maxBranches === 'number' ? selectedTenant.maxBranches : 1);
    setIsLicenseOpen(true);
  };

  const handleSaveLicense = async (e) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setIsSavingLicense(true);
    try {
      await setDoc(doc(db, 'tenants', selectedTenant.id),
        { maxBranches: Math.max(1, Number(licenseValue) || 1), updatedAt: serverTimestamp() }, { merge: true });
      setIsLicenseOpen(false);
    } catch (err) { alert('更新授權失敗: ' + err.message); }
    finally { setIsSavingLicense(false); }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setIsInviting(true);
    try {
      const fn = httpsCallable(functions, 'inviteUser');
      const res = await fn({ email: inviteForm.email, displayName: inviteForm.displayName, role: inviteForm.role, appId: selectedTenant.id });
      const invitedEmail = inviteForm.email;
      setIsInviteOpen(false);
      setInviteForm({ email: '', displayName: '', role: 'staff' });
      setInvitedCreds({ email: invitedEmail, tempPassword: res.data?.tempPassword || null, isNew: !!res.data?.isNew });
    } catch (err) {
      alert('邀請失敗: ' + (err.message || err));
    } finally { setIsInviting(false); }
  };

  const changeRole = async (uid, newRole) => {
    if (!selectedTenant) return;
    setBusyMsg(`更新 ${uid.slice(0, 5)} 權限中...`);
    try {
      const fn = httpsCallable(functions, 'updateUserRoleSecure');
      await fn({ uid, newRole, appId: selectedTenant.id });
    } catch (err) {
      alert('更新權限失敗: ' + (err.message || err));
    } finally { setBusyMsg(''); }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!selectedTenant || deleteConfirm !== selectedTenant.id) return;
    setIsDeleting(true);
    try {
      const fn = httpsCallable(functions, 'deleteTenant');
      await fn({ tenantId: selectedTenant.id });
      setIsDeleteOpen(false);
      setDeleteConfirm('');
      setSelectedTenantId(null);
    } catch (err) {
      alert('刪除租戶失敗: ' + (err.message || err));
    } finally { setIsDeleting(false); }
  };

  // ---------- Auth gates ----------
  if (authLoading || (user && !userProfile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-violet-500" size={26} />
      </div>
    );
  }
  if (!user) return <AdminLogin onLogin={login} error={authError} />;
  if (!isSuper) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <Card className="p-8 max-w-md w-full text-center">
          <Shield className="mx-auto text-rose-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-slate-800 mb-2">存取被拒 (Access Denied)</h2>
          <p className="text-slate-500 mb-6 font-medium">
            您目前以 <span className="text-slate-900 font-bold">{user?.email}</span> 登入，但沒有存取系統管理員門戶的權限。
          </p>
          <button onClick={signOut} className="w-full bg-slate-800 text-white px-6 py-3 rounded-xl font-bold transition-all hover:bg-slate-700">安全登出</button>
        </Card>
      </div>
    );
  }

  const visibleTenants = tenants.filter(t =>
    t.name?.toLowerCase().includes(tenantSearch.toLowerCase()) ||
    t.id?.toLowerCase().includes(tenantSearch.toLowerCase())
  );

  const NavBtn = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => { setActiveTab(id); setSelectedTenantId(null); }}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${activeTab === id ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40' : 'hover:bg-slate-800'}`}
    >
      <Icon size={19} /><span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3 text-white">
          <div className="bg-violet-600 p-2 rounded-lg shadow-lg"><Globe size={20} /></div>
          <div>
            <h1 className="text-lg font-bold leading-none">VowsOS</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Central Console</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavBtn id="overview" icon={LayoutDashboard} label="總覽 (Overview)" />
          <NavBtn id="tenants" icon={Building2} label="租戶管理 (Tenants)" />
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={signOut} className="w-full flex items-center justify-center px-4 py-2.5 text-xs font-bold text-white bg-slate-800 hover:bg-rose-600 rounded-lg transition-all">
            <LogOut size={14} className="mr-2" /> 安全登出 (Sign Out)
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-auto h-screen">
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
          {/* Header */}
          <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {activeTab === 'overview' ? '系統管理總覽' : (selectedTenant ? selectedTenant.name : '租戶管理 (Tenants)')}
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                {activeTab === 'overview'
                  ? '平台整體容量與需要關注的租戶'
                  : (selectedTenant ? `ID: ${selectedTenant.id} · ${selectedTenant.id}.vowsos.com` : `目前共有 ${tenants.length} 個租戶`)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800">{userProfile?.displayName || user?.email}</p>
                <p className="text-[10px] text-violet-600 font-black uppercase tracking-widest">Super Admin</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                {(userProfile?.displayName || user?.email || 'S').charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          {busyMsg && (
            <div className="flex items-center gap-2 text-xs font-bold text-violet-700 bg-violet-50 border border-violet-100 rounded-lg px-4 py-2">
              <Loader2 className="animate-spin" size={14} /> {busyMsg}
            </div>
          )}

          {/* ---------- OVERVIEW ---------- */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KpiCard icon={Building2} label="租戶 (Tenants)" value={tenants.length} sub={`${kpis.activeCount} active`} accent="violet" />
                <KpiCard icon={Layers} label="分店 (Branches)" value={`${kpis.used} / ${kpis.licensed}`} sub="used / licensed" accent="emerald" />
                <KpiCard icon={Users} label="用戶 (Users)" value={kpis.users} sub="across all tenants" accent="blue" />
                <KpiCard icon={Gauge} label="需關注 (At Cap)" value={kpis.atCap} sub="tenants at branch limit" accent={kpis.atCap > 0 ? 'rose' : 'slate'} />
              </div>

              <Card className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-500" /> 需要關注 (Needs Attention)
                </h3>
                {attentionTenants.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 italic text-sm flex items-center justify-center gap-2">
                    <CheckCircle size={16} className="text-emerald-400" /> 一切正常，沒有租戶超額或被停用。
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {attentionTenants.map(t => {
                      const max = typeof t.maxBranches === 'number' ? t.maxBranches : null;
                      const u = usageMap[t.id] ?? 0;
                      const overCap = max !== null && u >= max;
                      const suspended = t.status && t.status !== 'active';
                      return (
                        <button key={t.id} onClick={() => { setActiveTab('tenants'); setSelectedTenantId(t.id); }}
                          className="w-full flex items-center justify-between py-3 hover:bg-slate-50 rounded-lg px-2 text-left transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 rounded-lg"><Building2 size={16} className="text-slate-500" /></div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{t.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{t.id}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {suspended && <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">Suspended</span>}
                            {overCap && <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-100 text-rose-600 uppercase">分店額滿 {u}/{max}</span>}
                            <ChevronRight size={16} className="text-slate-300" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ---------- TENANTS: LIST ---------- */}
          {activeTab === 'tenants' && !selectedTenant && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="搜尋租戶名稱或 ID..." value={tenantSearch}
                    onChange={e => setTenantSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-500/20 transition-all shadow-sm" />
                </div>
                <button onClick={() => setIsCreateOpen(true)}
                  className="bg-violet-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-violet-700 transition-all shadow-md active:scale-95 whitespace-nowrap">
                  <Plus size={18} /> 新增租戶
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin text-slate-300" size={48} /></div>
              ) : visibleTenants.length === 0 ? (
                <Card className="p-12 text-center bg-white">
                  <Building2 className="mx-auto text-slate-200 mb-4" size={64} />
                  <h3 className="text-lg font-bold text-slate-800 mb-2">沒有符合的租戶</h3>
                  <p className="text-slate-500 mb-6">新增您的第一個租戶以啟用平台功能。</p>
                </Card>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">租戶 (Tenant)</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">狀態</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">分店 (Branches)</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">用戶</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] text-right">管理</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleTenants.map(t => {
                        const max = typeof t.maxBranches === 'number' ? t.maxBranches : null;
                        const u = usageMap[t.id] ?? '–';
                        const overCap = max !== null && (usageMap[t.id] ?? 0) >= max;
                        const active = (t.status || 'active') === 'active';
                        return (
                          <tr key={t.id} onClick={() => setSelectedTenantId(t.id)}
                            className="hover:bg-slate-50/70 transition-colors cursor-pointer group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-violet-50 group-hover:text-violet-600 transition-colors"><Building2 size={18} /></div>
                                <div>
                                  <p className="text-sm font-black text-slate-800">{t.name}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">{t.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{t.status || 'active'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-sm font-bold ${overCap ? 'text-rose-600' : 'text-slate-700'}`}>{u} / {max ?? '∞'}</span>
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-slate-700">{userCountMap[t.id] ?? '–'}</td>
                            <td className="px-6 py-4 text-right">
                              <ChevronRight size={18} className="inline text-slate-300 group-hover:text-violet-500 transition-colors" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ---------- TENANTS: DETAIL ---------- */}
          {activeTab === 'tenants' && selectedTenant && (
            <div className="space-y-6">
              <button onClick={() => setSelectedTenantId(null)} className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
                <ArrowLeft size={16} /> 返回租戶列表
              </button>

              {/* Info + status */}
              <Card className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-violet-50 rounded-xl"><Building2 className="text-violet-600" size={26} /></div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800">{selectedTenant.name}</h3>
                      <p className="text-xs text-slate-400 font-mono">{selectedTenant.id}.vowsos.com · 建立於 {selectedTenant.createdAt?.toDate ? selectedTenant.createdAt.toDate().toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${(selectedTenant.status || 'active') === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{selectedTenant.status || 'active'}</span>
                    <button onClick={() => toggleStatus(selectedTenant)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-all">
                      <Power size={14} /> {(selectedTenant.status || 'active') === 'active' ? '停用 (Suspend)' : '啟用 (Activate)'}
                    </button>
                    <button onClick={() => jumpTo(selectedTenant.id)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-all">
                      <ExternalLink size={14} /> 進入系統
                    </button>
                  </div>
                </div>
              </Card>

              {/* License */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2"><Layers size={18} className="text-emerald-500" /> 分店授權 (Branch License)</h4>
                  <button onClick={openLicense} className="flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:text-violet-700"><Pencil size={13} /> 調整</button>
                </div>
                {(() => {
                  const max = typeof selectedTenant.maxBranches === 'number' ? selectedTenant.maxBranches : null;
                  const u = usageMap[selectedTenant.id] ?? 0;
                  const pct = max ? Math.min(100, Math.round((u / max) * 100)) : 0;
                  const over = max !== null && u >= max;
                  return (
                    <div>
                      <div className="flex items-end justify-between mb-2">
                        <span className="text-3xl font-black text-slate-800">{u} <span className="text-lg text-slate-400">/ {max ?? '∞'}</span></span>
                        <span className={`text-xs font-bold ${over ? 'text-rose-600' : 'text-slate-400'}`}>{max === null ? '未設定授權 (unlimited)' : (over ? '已達上限' : `剩餘 ${max - u}`)}</span>
                      </div>
                      {max !== null && (
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${over ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </Card>

              {/* Users */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2"><Users size={18} className="text-blue-500" /> 用戶 ({tenantUsers.length})</h4>
                  <button onClick={() => setIsInviteOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-all"><UserPlus size={14} /> 邀請用戶</button>
                </div>
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-10 text-slate-400"><Loader2 className="animate-spin" size={28} /></div>
                ) : tenantUsers.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 italic text-sm">此租戶尚無用戶。</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {tenantUsers.map(u => (
                      <div key={u.uid} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{(u.displayName || u.email || 'U').charAt(0).toUpperCase()}</div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{u.displayName || 'Unknown'}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={11} /> {u.lastLogin?.toDate ? u.lastLogin.toDate().toLocaleDateString() : '—'}</span>
                          <select value={u.role || 'staff'} onChange={(e) => changeRole(u.uid, e.target.value)}
                            className={`text-[11px] font-black uppercase tracking-wider px-2 py-1 rounded border outline-none cursor-pointer ${roleBadge(u.role)}`}>
                            <option value="staff">staff</option>
                            <option value="admin">admin</option>
                            <option value="super_admin">super_admin</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Migrate */}
              <Card className="p-6">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><Database size={18} className="text-indigo-500" /> 資料匯入 (Migrate Data In)</h4>
                <p className="text-xs text-slate-500 mb-4">將另一個來源租戶的資料（設定、活動、用戶、日曆）複製進 <b>{selectedTenant.id}</b>。來源資料不會被更動。</p>
                <div className="flex items-center gap-3 mb-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">來源</label>
                  <select value={migrateSource} onChange={e => setMigrateSource(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-violet-500/20">
                    <option value="">— 選擇來源租戶 —</option>
                    <option value="my-venue-crm">my-venue-crm (default)</option>
                    {tenants.filter(t => t.id !== selectedTenant.id).map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                    ))}
                  </select>
                </div>
                {migrateSource && migrateSource !== selectedTenant.id && (
                  <DataMigrationTool key={`${migrateSource}->${selectedTenant.id}`} sourceId={migrateSource} targetId={selectedTenant.id} />
                )}
              </Card>

              {/* Danger zone */}
              <Card className="p-6 border-l-4 border-l-rose-500">
                <h4 className="font-bold text-rose-600 flex items-center gap-2 mb-2"><AlertTriangle size={18} /> 危險區域 (Danger Zone)</h4>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs text-slate-500">永久刪除此租戶及其所有資料、設定與檔案。此操作無法復原。</p>
                  <button onClick={() => { setDeleteConfirm(''); setIsDeleteOpen(true); }}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-all"><Trash2 size={14} /> 刪除租戶</button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* CREATE MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => !isCreating && setIsCreateOpen(false)} title="建立新租戶 (New Tenant)">
        <form onSubmit={handleCreate} className="space-y-6 p-6 bg-slate-50">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">租戶名稱 (Tenant Name)</label>
            <input type="text" required value={newTenant.name} onChange={e => setNewTenant(p => ({ ...p, name: e.target.value }))}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500/20 font-bold shadow-sm" placeholder="例如: 璟瓏軒 (King Lung Heen)" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">租戶代碼 (Subdomain ID)</label>
            <div className="flex items-center gap-2">
              <input type="text" required value={newTenant.id} onChange={e => setNewTenant(p => ({ ...p, id: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500/20 font-mono font-bold shadow-sm" placeholder="kinglungheen" />
              <span className="text-sm font-bold text-slate-400">.vowsos.com</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">分店授權數量 (Licensed Branches)</label>
            <input type="number" min="1" required value={newTenant.maxBranches} onChange={e => setNewTenant(p => ({ ...p, maxBranches: e.target.value }))}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500/20 font-bold shadow-sm" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 shadow-sm">取消</button>
            <button type="submit" disabled={isCreating} className="flex-[2] py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 shadow-lg shadow-violet-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
              {isCreating ? <Loader2 className="animate-spin" size={20} /> : '確認建立租戶'}
            </button>
          </div>
        </form>
      </Modal>

      {/* LICENSE MODAL */}
      <Modal isOpen={isLicenseOpen} onClose={() => !isSavingLicense && setIsLicenseOpen(false)} title="調整分店授權 (Adjust License)">
        <form onSubmit={handleSaveLicense} className="space-y-6 p-6 bg-slate-50">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">授權分店數量 (Max Branches)</label>
            <input type="number" min="1" required value={licenseValue} onChange={e => setLicenseValue(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500/20 font-bold shadow-sm" />
            <p className="text-[10px] text-slate-400 font-medium">目前使用中: <b>{selectedTenant ? (usageMap[selectedTenant.id] ?? '–') : '–'}</b> 個分店。調低至低於現有數量不會刪除既有分店，但該租戶將無法再新增。</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsLicenseOpen(false)} className="flex-1 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 shadow-sm">取消</button>
            <button type="submit" disabled={isSavingLicense} className="flex-[2] py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 shadow-lg shadow-violet-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
              {isSavingLicense ? <Loader2 className="animate-spin" size={20} /> : '儲存授權'}
            </button>
          </div>
        </form>
      </Modal>

      {/* INVITE MODAL */}
      <Modal isOpen={isInviteOpen} onClose={() => !isInviting && setIsInviteOpen(false)} title="邀請用戶 (Invite User)">
        <form onSubmit={handleInvite} className="space-y-6 p-6 bg-slate-50">
          <p className="text-xs text-slate-500 font-medium">邀請的用戶將被加入 <b>{selectedTenant?.name}</b> ({selectedTenant?.id})。</p>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Email</label>
            <input type="email" required value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500/20 font-bold shadow-sm" placeholder="user@example.com" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">名稱 (Display Name)</label>
            <input type="text" value={inviteForm.displayName} onChange={e => setInviteForm(p => ({ ...p, displayName: e.target.value }))}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500/20 font-bold shadow-sm" placeholder="王小明" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">權限 (Role)</label>
            <select value={inviteForm.role} onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500/20 font-bold shadow-sm">
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsInviteOpen(false)} className="flex-1 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 shadow-sm">取消</button>
            <button type="submit" disabled={isInviting} className="flex-[2] py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 shadow-lg shadow-violet-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
              {isInviting ? <Loader2 className="animate-spin" size={20} /> : '送出邀請'}
            </button>
          </div>
        </form>
      </Modal>

      {/* INVITE SUCCESS — share credentials */}
      <Modal isOpen={!!invitedCreds} onClose={() => setInvitedCreds(null)} title="帳戶已建立 (Account Created)">
        <div className="p-6 bg-slate-50 space-y-5">
          {invitedCreds?.tempPassword ? (
            <>
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <CheckCircle className="text-emerald-500 shrink-0" size={22} />
                <p className="text-sm font-bold text-emerald-800">帳戶已建立。請將以下登入資料交給對方。</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">登入 Email</label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-800 break-all">{invitedCreds.email}</code>
                    <button onClick={() => navigator.clipboard?.writeText(invitedCreds.email)} className="px-3 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50" title="複製 Email"><Copy size={16} /></button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">一次性密碼 (One-time Password)</label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 px-4 py-3 bg-white border border-violet-200 rounded-xl font-mono text-lg font-black text-violet-700 tracking-wider">{invitedCreds.tempPassword}</code>
                    <button onClick={() => navigator.clipboard?.writeText(invitedCreds.tempPassword)} className="px-3 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50" title="複製密碼"><Copy size={16} /></button>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed bg-amber-50 border border-amber-100 rounded-lg p-3">
                <b>提示：</b> 此密碼只會顯示這一次。對方首次登入後，系統會要求他們設定自己的新密碼。
              </p>
            </>
          ) : (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <AlertTriangle className="text-blue-500 shrink-0" size={22} />
              <p className="text-sm font-bold text-blue-800">此 Email 已有帳戶，已更新其角色與存取權限。對方沿用原有密碼登入。</p>
            </div>
          )}
          <button onClick={() => setInvitedCreds(null)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all">完成</button>
        </div>
      </Modal>

      {/* DELETE MODAL */}
      <Modal isOpen={isDeleteOpen} onClose={() => !isDeleting && setIsDeleteOpen(false)} title="刪除租戶 (Delete Tenant)">
        <form onSubmit={handleDelete} className="space-y-6 p-6 bg-slate-50">
          <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 flex gap-3 shadow-sm">
            <AlertTriangle className="text-rose-600 shrink-0" size={20} />
            <div>
              <p className="text-sm font-bold text-rose-800">警告：此操作不可復原</p>
              <p className="text-[10px] text-rose-700 leading-relaxed font-medium mt-1">您即將刪除租戶 <b>{selectedTenant?.name} ({selectedTenant?.id})</b>，將永久移除所有活動、設定、用戶與檔案。</p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">請輸入租戶 ID <span className="text-rose-600 font-mono">"{selectedTenant?.id}"</span> 以確認：</label>
            <input type="text" required value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 font-mono font-bold shadow-sm" placeholder={selectedTenant?.id} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsDeleteOpen(false)} className="flex-1 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 shadow-sm">取消</button>
            <button type="submit" disabled={isDeleting || deleteConfirm !== selectedTenant?.id}
              className="flex-[2] py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 shadow-lg shadow-rose-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
              {isDeleting ? <Loader2 className="animate-spin" size={20} /> : '確認永久刪除'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SuperAdminPortal;
