import React, { useState } from 'react';
import { db } from '../core/firebase';
import { collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';
import { Loader2, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';

const DataMigrationTool = ({ sourceId = 'my-venue-crm', targetId = 'kinglungheen', onComplete }) => {
  const [status, setStatus] = useState('idle'); // idle, migrating, success, error
  const [progress, setProgress] = useState([]);
  const [error, setError] = useState(null);

  const addProgress = (msg) => setProgress(prev => [...prev, msg]);

  const runMigration = async () => {
    setStatus('migrating');
    setProgress(['正在初始化雲端同步程序 (Cloud Sync Mode)...']);
    
    try {
      const migrateApi = httpsCallable(functions, 'migrateTenantData');
      
      addProgress(`正在從 ${sourceId} 搬運資料至 ${targetId}...`);
      addProgress('這可能需要 10-30 秒，請稍候...');

      const result = await migrateApi({ sourceId, targetId });

      if (result.data.success) {
        addProgress('✅ 所有集合同步完成 (Settings, Events, Users, Calendar)');
        setStatus('success');
        addProgress(`🎉 同步成功！${targetId} 已準備就緒。`);
        if (onComplete) onComplete();
      } else {
        throw new Error("同步回傳結果異常");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "雲端同步失敗");
      setStatus('error');
    }
  };

  return (
    <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <div>
           <h3 className="text-lg font-black text-slate-800">資料同步工具 (Sync to Branded Tenant)</h3>
           <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
             FROM {sourceId} <ArrowRight size={12} className="inline mx-1"/> TO {targetId}
           </p>
        </div>
        {status === 'idle' && (
          <button 
            onClick={runMigration}
            className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
          >
            立即同步資料 (Sync Now)
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 min-h-[200px] max-h-[400px] overflow-y-auto space-y-2 font-mono">
        {progress.map((msg, i) => (
          <div key={i} className="text-xs font-bold text-slate-600 flex items-center gap-2">
            {msg.includes('✅') || msg.includes('🎉') ? <CheckCircle size={14} className="text-emerald-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse"/>}
            {msg}
          </div>
        ))}
        {status === 'migrating' && (
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
            <Loader2 className="animate-spin" size={16} /> 正在同步中，請勿關閉分頁...
          </div>
        )}
        {status === 'error' && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-start gap-2 text-xs font-bold border border-red-100 mt-4 font-sans">
            <AlertTriangle size={18} className="shrink-0" />
            <div>
              <p>同步失敗 (Sync Error):</p>
              <p className="font-mono text-[10px] mt-1 break-all">{error}</p>
              <p className="mt-2 text-slate-500 font-normal italic">提示：請確認您具備 Super Admin 權限。</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataMigrationTool;
