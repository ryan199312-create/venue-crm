import React from 'react';
import { Building2, CalendarCheck, FileText, Users, ArrowRight, Sparkles, ShieldCheck, Mail } from 'lucide-react';

// Modern Noir palette — deep charcoal/emerald with an antique-gold accent.
const GOLD = '#d4af37';

const FEATURES = [
  { icon: Building2, title: '多分店管理', sub: 'Multi-branch', desc: '一個帳戶集中管理旗下所有場地與分店，權限與數據各自獨立。' },
  { icon: CalendarCheck, title: '宴會訂單與流程', sub: 'Event orders', desc: '從落訂、菜單、場地佈置到當日流程，一站式生成宴會通知單 (EO)。' },
  { icon: FileText, title: '文件與電子簽署', sub: 'Documents & e-sign', desc: '自動生成合約、報價與收據 PDF，客戶可線上簽署與上傳付款證明。' },
  { icon: Users, title: '客戶專屬平台', sub: 'Client portal', desc: '客戶以電話號碼登入專屬頁面，查看流程、確認細節、提交需求。' }
];

const LandingPage = () => {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/4 w-[42rem] h-[42rem] rounded-full blur-3xl opacity-30" style={{ background: 'radial-gradient(circle, #065f46, transparent 60%)' }} />
        <div className="absolute top-1/3 -right-40 w-[36rem] h-[36rem] rounded-full blur-3xl opacity-20" style={{ background: `radial-gradient(circle, ${GOLD}, transparent 60%)` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/0 via-slate-950/40 to-slate-950" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-30 bg-slate-950/70 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-lg font-black tracking-[0.2em] uppercase">Vows<span style={{ color: GOLD }}>OS</span></span>
          </div>
          <a href="#contact" className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border transition-all hover:bg-white/5" style={{ borderColor: `${GOLD}66`, color: GOLD }}>
            預約示範 (Request Demo)
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="max-w-5xl mx-auto px-6 pt-24 pb-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-8 border" style={{ borderColor: `${GOLD}40`, color: GOLD }}>
            <Sparkles size={13} /> 婚宴 · 宴會場地管理系統
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.12] mb-8">
            從洽詢到謝幕，<br className="hidden md:block" />
            <span style={{ color: GOLD }}>整場宴會盡在掌握。</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-4 font-medium leading-relaxed">
            VowsOS 是專為婚宴及宴會場地打造的一站式營運平台 — 訂單、菜單、場地佈置、合約、收款與客戶溝通，全部整合於一個優雅的系統。
          </p>
          <p className="text-sm text-slate-500 max-w-xl mx-auto mb-10 tracking-wide">The all-in-one operating system for wedding &amp; banquet venues.</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#contact" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-black text-base text-slate-950 transition-all hover:brightness-110 active:scale-95 shadow-[0_8px_30px_-6px_rgba(212,175,55,0.5)]" style={{ backgroundColor: GOLD }}>
              預約示範 (Request a Demo)
            </a>
            <a href="#features" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-base text-white border border-white/15 hover:bg-white/5 transition-all">
              了解功能 <ArrowRight size={18} />
            </a>
          </div>

          <p className="text-xs text-slate-500 mt-8 leading-relaxed">
            已是客戶？請前往您場地的專屬網址登入
            <span className="text-slate-400 font-medium"> (例如 yourvenue.vowsos.com)</span>。
            <br className="hidden sm:block" />
            <span className="text-slate-600">Already a client? Sign in at your venue&apos;s own address.</span>
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: GOLD }}>All in one place</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">一個平台，管理整場宴會</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="group bg-white/[0.03] border border-white/10 rounded-2xl p-6 transition-all hover:bg-white/[0.06] hover:-translate-y-1" style={{ transitionProperty: 'transform, background-color, border-color' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 border" style={{ borderColor: `${GOLD}30`, backgroundColor: `${GOLD}12`, color: GOLD }}>
                  <f.icon size={22} />
                </div>
                <h3 className="font-black text-white">{f.title}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-slate-500">{f.sub}</p>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section id="contact" className="relative">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="relative overflow-hidden rounded-3xl px-8 py-16 text-center border" style={{ borderColor: `${GOLD}33`, background: 'linear-gradient(160deg, rgba(6,95,70,0.25), rgba(2,6,23,0.6))' }}>
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: `radial-gradient(circle, ${GOLD}, transparent 60%)` }} />
            <ShieldCheck size={28} className="mx-auto mb-5" style={{ color: GOLD }} />
            <h2 className="relative text-3xl md:text-4xl font-black mb-4">準備好升級您的宴會營運了嗎？</h2>
            <p className="relative text-slate-400 mb-9 max-w-xl mx-auto font-medium">親眼看看 VowsOS 如何為您的場地簡化每一場宴會。我們樂意為您安排一次示範。</p>
            <a href="mailto:hello@vowsos.com" className="relative inline-flex items-center gap-2 px-8 py-4 rounded-full font-black text-slate-950 transition-all hover:brightness-110 active:scale-95 shadow-[0_8px_30px_-6px_rgba(212,175,55,0.5)]" style={{ backgroundColor: GOLD }}>
              <Mail size={18} /> 預約示範 (Request a Demo)
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <div className="font-black tracking-[0.2em] uppercase text-slate-300">Vows<span style={{ color: GOLD }}>OS</span></div>
          <p>© {new Date().getFullYear()} VowsOS · 婚宴 · 宴會場地管理系統</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
