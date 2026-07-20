import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, CalendarCheck, FileText, Users, Globe, ArrowRight, LogIn, Sparkles, ShieldCheck } from 'lucide-react';

const FEATURES = [
  { icon: Building2, title: '多分店管理', sub: 'Multi-branch', desc: '一個帳戶集中管理旗下所有場地與分店，權限與數據各自獨立。' },
  { icon: CalendarCheck, title: '宴會訂單與流程', sub: 'Event orders', desc: '從落訂、菜單、場地佈置到當日流程，一站式生成宴會通知單 (EO)。' },
  { icon: FileText, title: '文件與合約', sub: 'Documents & e-sign', desc: '自動生成合約、報價、收據 PDF，客戶可線上簽署與上傳付款證明。' },
  { icon: Users, title: '客戶專屬平台', sub: 'Client portal', desc: '客戶以電話號碼登入專屬頁面，查看流程、確認細節、提交需求。' }
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-violet-600 text-white p-2 rounded-lg shadow-lg shadow-violet-200"><Globe size={18} /></div>
            <span className="text-lg font-black tracking-tight">VowsOS</span>
          </div>
          <Link to="/admin" className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition-all active:scale-95">
            <LogIn size={16} /> 客戶登入 (Customer Login)
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-violet-200/40 rounded-full blur-3xl" />
          <div className="absolute top-40 -left-24 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl" />
        </div>
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 px-3 py-1 rounded-full text-xs font-bold mb-6 border border-violet-100">
            <Sparkles size={13} /> 專為婚宴 · 宴會場地打造
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] mb-6">
            專注經營場地，<br className="hidden md:block" />
            <span className="text-violet-600">文書工作交給我們。</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10 font-medium">
            VowsOS 是專為婚宴及宴會場地打造的一站式管理系統 — 訂單、菜單、場地佈置、合約、收款與客戶溝通，全部整合於一個平台。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/admin" className="inline-flex items-center gap-2 bg-violet-600 text-white px-6 py-3.5 rounded-xl font-bold text-base hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 active:scale-95">
              <LogIn size={18} /> 客戶登入 (Customer Login)
            </Link>
            <a href="#features" className="inline-flex items-center gap-2 bg-white text-slate-700 px-6 py-3.5 rounded-xl font-bold text-base border border-slate-200 hover:bg-slate-50 transition-all">
              了解功能 <ArrowRight size={18} />
            </a>
          </div>
          <p className="text-xs text-slate-400 mt-6 flex items-center justify-center gap-1.5">
            <ShieldCheck size={13} /> 資料隔離 · 多分店授權 · 安全雲端託管
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black tracking-tight mb-3">一個平台，管理整場宴會</h2>
            <p className="text-slate-500 font-medium">From enquiry to the last dance — all in one place.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4"><f.icon size={22} /></div>
                <h3 className="font-black text-slate-800">{f.title}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{f.sub}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="relative overflow-hidden bg-slate-900 rounded-3xl px-8 py-14 text-center text-white shadow-xl">
          <div className="absolute -top-16 -right-16 w-72 h-72 bg-violet-600/30 rounded-full blur-3xl" />
          <h2 className="relative text-3xl font-black mb-4">準備好升級您的宴會營運了嗎？</h2>
          <p className="relative text-slate-300 mb-8 max-w-xl mx-auto font-medium">已經是我們的客戶？立即登入您的專屬工作台。想成為客戶？歡迎與我們聯絡。</p>
          <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/admin" className="inline-flex items-center gap-2 bg-violet-600 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-violet-500 transition-all shadow-lg active:scale-95">
              <LogIn size={18} /> 客戶登入 (Customer Login)
            </Link>
            <a href="mailto:hello@vowsos.com" className="inline-flex items-center gap-2 bg-white/10 text-white px-6 py-3.5 rounded-xl font-bold border border-white/20 hover:bg-white/20 transition-all">
              聯絡我們 (Contact)
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-400">
          <div className="flex items-center gap-2 font-bold text-slate-500">
            <Globe size={16} className="text-violet-500" /> VowsOS
          </div>
          <p>© {new Date().getFullYear()} VowsOS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
