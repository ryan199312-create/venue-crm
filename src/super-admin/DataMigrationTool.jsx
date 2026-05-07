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
    setProgress(['開始資料同步程序 (Browser Sync Mode)...']);
    
    try {
      // 1. Migrate Settings
      addProgress('正在同步系統設定 (Settings)...');
      const settingsSnap = await getDocs(collection(db, 'artifacts', sourceId, 'private', 'data', 'settings'));
      
      for (const d of settingsSnap.docs) {
        await setDoc(doc(db, 'artifacts', targetId, 'private', 'data', 'settings', d.id), {
          ...d.data(),
          isSetupComplete: true 
        }, { merge: true });
      }
      addProgress('✅ 系統設定同步完成');

      // 2. Migrate Events (EOs)
      addProgress('正在同步訂單資料 (Events)...');
      const eventsSnap = await getDocs(collection(db, 'artifacts', sourceId, 'private', 'data', 'events'));
      addProgress(`發現 ${eventsSnap.size} 筆訂單，開始同步...`);
      
      const eventChunks = [];
      const tempEvents = [...eventsSnap.docs];
      while (tempEvents.length > 0) eventChunks.push(tempEvents.splice(0, 400));

      for (const chunk of eventChunks) {
        const batch = writeBatch(db);
        chunk.forEach(evDoc => {
          const newRef = doc(db, 'artifacts', targetId, 'private', 'data', 'events', evDoc.id);
          batch.set(newRef, evDoc.data(), { merge: true });
          
          const pubRef = doc(db, 'artifacts', targetId, 'public_calendar', evDoc.id);
          batch.set(pubRef, {
             eventName: evDoc.data().eventName,
             date: evDoc.data().date,
             venueLocation: evDoc.data().venueLocation,
             status: evDoc.data().status
          }, { merge: true });
        });
        await batch.commit();
      }
      addProgress('✅ 訂單與日曆同步完成');

      // 3. Migrate Users
      addProgress('正在同步用戶權限 (Users)...');
      const usersSnap = await getDocs(collection(db, 'artifacts', sourceId, 'private', 'data', 'users'));
      const userBatch = writeBatch(db);
      usersSnap.forEach(uDoc => {
        const newRef = doc(db, 'artifacts', targetId, 'private', 'data', 'users', uDoc.id);
        userBatch.set(newRef, uDoc.data(), { merge: true });
      });
      await userBatch.commit();
      addProgress('✅ 用戶資料同步完成');

      setStatus('success');
      addProgress('🎉 同步成功！King Lung Heen 已更新為最新資料。');
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
      setError(err.message);
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
