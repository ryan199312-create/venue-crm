import React from 'react';
import { Building2, CalendarCheck, FileText, Users, ArrowRight, Sparkles, ShieldCheck, Mail } from 'lucide-react';

// Light editorial palette — warm ivory canvas, deep emerald + antique-gold accents.
const GOLD = '#b8942f';

const FEATURES = [
  { icon: Building2, title: '多分店管理', sub: 'Multi-branch', desc: '一個帳戶集中管理旗下所有場地與分店，權限與數據各自獨立。' },
  { icon: CalendarCheck, title: '宴會訂單與流程', sub: 'Event orders', desc: '從落訂、菜單、場地佈置到當日流程，一站式生成宴會通知單 (EO)。' },
  { icon: FileText, title: '文件與電子簽署', sub: 'Documents & e-sign', desc: '自動生成合約、報價與收據 PDF，客戶可線上簽署與上傳付款證明。' },
  { icon: Users, title: '客戶專屬平台', sub: 'Client portal', desc: '客戶以電話號碼登入專屬頁面，查看流程、確認細節、提交需求。' }
];

const LandingPage = () => {
  return (
    <div className="relative min-h-screen bg-[#faf8f3] text-stone-800 font-sans overflow-hidden">
      {/* Soft ambient wash */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/4 w-[42rem] h-[42rem] rounded-full blur-3xl opacity-40" style={{ background: 'radial-gradient(circle, #d1fae5, transparent 60%)' }} />
        <div className="absolute top-1/3 -right-40 w-[36rem] h-[36rem] rounded-full blur-3xl opacity-30" style={{ background: `radial-gradient(circle, ${GOLD}33, transparent 60%)` }} />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-30 bg-[#faf8f3]/80 backdrop-blur border-b border-stone-200/70">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-black tracking-[0.2em] uppercase text-stone-900">Vows<span style={{ color: GOLD }}>OS</span></span>
          <a href="#contact" className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border border-stone-300 text-stone-700 hover:bg-white transition-all">
            預約示範 (Request Demo)
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="max-w-5xl mx-auto px-6 pt-24 pb-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-8 border bg-white/60" style={{ borderColor: `${GOLD}55`, color: GOLD }}>
            <Sparkles size={13} /> 婚宴 · 宴會場地管理系統
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.12] mb-8 text-stone-900">
            從洽詢到謝幕，<br className="hidden md:block" />
            <span style={{ color: GOLD }}>整場宴會盡在掌握。</span>
          </h1>
          <p className="text-lg text-stone-500 max-w-2xl mx-auto mb-4 font-medium leading-relaxed">
            VowsOS 是專為婚宴及宴會場地打造的一站式營運平台 — 訂單、菜單、場地佈置、合約、收款與客戶溝通，全部整合於一個優雅的系統。
          </p>
          <p className="text-sm text-stone-400 max-w-xl mx-auto mb-10 tracking-wide">The all-in-one operating system for wedding &amp; banquet venues.</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#contact" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-black text-base text-white bg-emerald-800 hover:bg-emerald-900 transition-all active:scale-95 shadow-lg shadow-emerald-900/15">
              預約示範 (Request a Demo)
            </a>
            <a href="#features" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-base text-stone-700 bg-white border border-stone-300 hover:border-stone-400 transition-all">
              了解功能 <ArrowRight size={18} />
            </a>
          </div>

          <p className="text-xs text-stone-400 mt-8 leading-relaxed">
            已是客戶？請前往您場地的專屬網址登入
            <span className="text-stone-500 font-medium"> (例如 yourvenue.vowsos.com)</span>。
            <br className="hidden sm:block" />
            <span className="text-stone-400">Already a client? Sign in at your venue&apos;s own address.</span>
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative border-t border-stone-200/70">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: GOLD }}>All in one place</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-stone-900">一個平台，管理整場宴會</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-emerald-50 text-emerald-800">
                  <f.icon size={22} />
                </div>
                <h3 className="font-black text-stone-900">{f.title}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: GOLD }}>{f.sub}</p>
                <p className="text-sm text-stone-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA — a single rich emerald band for contrast */}
      <section id="contact" className="relative">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="relative overflow-hidden rounded-3xl px-8 py-16 text-center bg-emerald-900 text-white">
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl opacity-25" style={{ background: `radial-gradient(circle, ${GOLD}, transparent 60%)` }} />
            <ShieldCheck size={28} className="mx-auto mb-5" style={{ color: GOLD }} />
            <h2 className="relative text-3xl md:text-4xl font-black mb-4">準備好升級您的宴會營運了嗎？</h2>
            <p className="relative text-emerald-100/80 mb-9 max-w-xl mx-auto font-medium">親眼看看 VowsOS 如何為您的場地簡化每一場宴會。我們樂意為您安排一次示範。</p>
            <a href="mailto:hello@vowsos.com" className="relative inline-flex items-center gap-2 px-8 py-4 rounded-full font-black text-emerald-950 transition-all hover:brightness-110 active:scale-95 shadow-lg" style={{ backgroundColor: GOLD }}>
              <Mail size={18} /> 預約示範 (Request a Demo)
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-stone-200/70">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-stone-400">
          <div className="font-black tracking-[0.2em] uppercase text-stone-700">Vows<span style={{ color: GOLD }}>OS</span></div>
          <p>© {new Date().getFullYear()} VowsOS · 婚宴 · 宴會場地管理系統</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
