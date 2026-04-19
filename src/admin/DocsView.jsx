import React, { useEffect } from 'react';
import { BookOpen, CheckCircle2, Star, Settings, ShieldCheck, Zap } from 'lucide-react';

const DocsView = () => {
  useEffect(() => {
    localStorage.setItem('lastViewedVersion', '1.2.0');
  }, []);

  const updates = [
    {
      version: '1.2.0',
      date: '2024-04-19',
      title: '系統架構升級 & 更新日誌整合',
      items: [
        { type: 'added', text: '新增「指南與更新」介面，方便追蹤系統變更。' },
        { type: 'added', text: '整合 Changelog.md 至後端管理介面。' },
        { type: 'improved', text: '優化側邊欄導航，加入更新提醒小紅點。' }
      ]
    },
    {
      version: '1.1.0',
      date: '2024-04-18',
      title: '全新分頁式編輯介面 & PDF 引擎',
      items: [
        { type: 'added', text: '全新分頁式編輯介面：將訂單拆分為基本資料、餐飲、收費、物流、場地、打印配置及內部備註。' },
        { type: 'added', text: 'PDF 生成引擎：支援生成向量格式的合約、報價單、發票、收據。' },
        { type: 'added', text: '自動化計算：整合最低消費自動匹配功能。' },
        { type: 'improved', text: 'UI 組件庫統一化：提升介面一致性與載入速度。' }
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <BookOpen className="text-blue-600" size={32} />
            指南與更新 (Docs & Updates)
          </h2>
          <p className="text-slate-500 mt-2 font-medium">追蹤璟瓏軒宴會管理系統的最新功能與改進。</p>
        </div>
        <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-sm font-bold border border-blue-100 shadow-sm">
          Current Version: v1.2.0
        </div>
      </div>

      <div className="space-y-12">
        {updates.map((update, idx) => (
          <div key={update.version} className="relative pl-8 border-l-2 border-slate-100 last:border-0 pb-4">
            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-blue-500 shadow-sm" />
            
            <div className="mb-2">
              <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded mr-3">{update.version}</span>
              <span className="text-sm font-medium text-slate-400 font-mono">{update.date}</span>
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 mb-4">{update.title}</h3>
            
            <div className="grid grid-cols-1 gap-3">
              {update.items.map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  {item.type === 'added' && <div className="bg-emerald-50 p-1.5 rounded-lg text-emerald-600"><Star size={16} /></div>}
                  {item.type === 'improved' && <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600"><Zap size={16} /></div>}
                  {item.type === 'fixed' && <div className="bg-amber-50 p-1.5 rounded-lg text-amber-600"><CheckCircle2 size={16} /></div>}
                  <p className="text-slate-600 text-sm font-medium leading-relaxed pt-1">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-2xl shadow-blue-900/20">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
          <Settings size={120} />
        </div>
        <div className="relative z-10">
          <h4 className="text-xl font-bold mb-2 flex items-center gap-2">
            <ShieldCheck className="text-blue-400" />
            系統維護提示
          </h4>
          <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
            如果您在系統使用過程中遇到任何問題，或有新的功能建議，請隨時聯繫技術開發團隊。
            我們致力於提供最穩定、高效的宴會管理體驗。
          </p>
          <div className="mt-6 flex gap-4">
            <div className="bg-white/10 px-4 py-2 rounded-lg text-xs font-mono border border-white/10">
              System Status: <span className="text-emerald-400">Operational</span>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg text-xs font-mono border border-white/10">
              Last Backup: <span className="text-blue-400">Automated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocsView;
