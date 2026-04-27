import React from 'react';
import { BookOpen, Settings, ShieldCheck } from 'lucide-react';

const DocsView = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <BookOpen className="text-blue-600" size={32} />
            使用指南 (User Guide)
          </h2>
          <p className="text-slate-500 mt-2 font-medium">璟瓏軒宴會管理系統使用指南與系統狀態。</p>
        </div>
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
