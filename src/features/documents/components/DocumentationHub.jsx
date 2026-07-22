import React, { useState } from 'react';
import {
  BookOpen, Search, Rocket, Building2, FileText, Users, CreditCard,
  Sparkles, MessageCircle, ChevronRight, ShieldCheck, X, Smartphone
} from 'lucide-react';
import { Card } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useLang } from '../../../i18n/language';

const HELP_ARTICLES = [
  {
    id: 'getting-started', category: 'basics', title: '快速開始 (Getting Started)',
    description: '登入後的第一步，以及如何在系統中移動。 (Your first steps after signing in, and how to move around the system.)', icon: Rocket, color: 'text-orange-500',
    content: `歡迎使用 VowsOS。
1. 使用左側導航列切換各個模組。
2.「儀表板」顯示今日活動與營收概覽。
3. 建議先完成三項基本設定：品牌與標誌、分店資料、以及新增團隊用戶（皆在「設定」中）。 (Welcome to VowsOS.
1. Use the left navigation bar to switch between modules.
2. The "Dashboard" shows an overview of today's events and revenue.
3. We recommend completing three basic setups first: brand and logo, branch details, and adding team users (all under "Settings").)`
  },
  {
    id: 'branches', category: 'settings', title: '分店管理 (Branches)',
    description: '新增與管理旗下場地／分店。 (Add and manage your venues / branches.)', icon: Building2, color: 'text-emerald-500',
    content: `在「設定 → 分店管理」中新增分店（門市）。
您可建立的分店數量受您方案的授權上限限制（畫面會顯示「已用 / 授權」）。
每個分店可各自設定專屬的場地資料、菜單與收款方式。 (Add branches (outlets) under "Settings → Branches".
The number of branches you can create is capped by your plan's license limit (the screen shows "Used / Licensed").
Each branch can have its own venue details, menus and payment methods.)`
  },
  {
    id: 'users', category: 'team', title: '團隊與用戶 (Users)',
    description: '登記員工帳戶，他們自行啟用並設定密碼。 (Register staff accounts; they activate and set their own password.)', icon: Users, color: 'text-blue-500',
    content: `在「設定 → 用戶管理」中，以 Email 或電話號碼登記新用戶並指定角色。
系統不會寄送密碼——請將啟用連結交給對方，他們前往啟用頁面自行設定密碼即可（無需驗證）。
可登記的用戶數量受方案授權上限限制。 (Under "Settings → Users", register a new user by email or phone number and assign a role.
The system does not send passwords — give the activation link to the user, and they set their own password on the activation page (no verification needed).
The number of users you can register is capped by your plan's license limit.)`
  },
  {
    id: 'events', category: 'events', title: '訂單管理 (Event Orders)',
    description: '建立活動、菜單、流程與備註。 (Create events, menus, rundowns and remarks.)', icon: FileText, color: 'text-indigo-500',
    content: `點擊「訂單管理 → 新增訂單」。填寫基本資料後，可接著設定菜單、場地佈置、物流與備註。
每張訂單皆可一鍵生成報價單、合約、宴會通知單 (EO) 與收據。 (Click "Event Orders → New Order". After filling in the basic details, you can set up menus, venue setup, logistics and remarks.
Every order can generate a quotation, contract, event order (EO) and receipt with one click.)`
  },
  {
    id: 'documents', category: 'finance', title: '單據與範本 (Documents)',
    description: '單據如何套用您的品牌與條款。 (How documents apply your branding and terms.)', icon: BookOpen, color: 'text-violet-500',
    content: `報價單、合約與收據會自動套用您在「設定 → 分店資料」中的資訊：
場地名稱、標誌、地址、電話、付款條款、收款方式與報價單保密聲明。
所有這些內容皆按分店獨立設定——不同分店的單據會顯示各自的品牌，不會互相混用。 (Quotations, contracts and receipts automatically apply the information from "Settings → Branch Details":
venue name, logo, address, phone, payment terms, payment methods and the quotation confidentiality notice.
All of this is configured per branch — documents for different branches show their own branding and are never mixed.)`
  },
  {
    id: 'billing', category: 'finance', title: '財務與收款 (Billing)',
    description: '訂金、餘額追蹤與收款方式。 (Deposits, balance tracking and payment methods.)', icon: CreditCard, color: 'text-rose-500',
    content: `系統會依菜單價格與人數自動計算總額。
在訂單的「財務」分頁記錄訂金與餘額支付，並生成 PDF 收據。
收款方式（銀行轉帳、FPS、支票等）於「設定 → 分店資料 → 付款方式設定」中維護。 (The system automatically calculates the total based on menu prices and headcount.
Record deposit and balance payments in the order's "Billing" tab, and generate PDF receipts.
Payment methods (bank transfer, FPS, cheque, etc.) are maintained under "Settings → Branch Details → Payment Method Settings".)`
  },
  {
    id: 'client-portal', category: 'basics', title: '客戶專屬平台 (Client Portal)',
    description: '讓客戶以電話號碼查看自己的活動。 (Let clients view their own event by phone number.)', icon: Smartphone, color: 'text-teal-500',
    content: `客戶可透過您的客戶平台，以其電話號碼登入，查看活動流程、確認細節、上傳付款證明並線上簽署文件——無需帳號密碼。 (Through your client portal, clients can log in with their phone number to view the event rundown, confirm details, upload payment proof and sign documents online — no account or password needed.)`
  },
  {
    id: 'ai-assistant', category: 'ai', title: 'AI 智慧助理 (AI Assistant)',
    description: '協助撰寫電郵草稿、分析數據與備註。 (Helps draft emails, analyze data and write remarks.)', icon: Sparkles, color: 'text-fuchsia-500',
    content: `在訂單編輯頁或數據分析中，點擊 AI 圖標即可呼叫助理，協助產生電郵草稿、撰寫備註或分析營運數據。 (On the order editing page or in data analysis, click the AI icon to call the assistant, which helps generate email drafts, write remarks or analyze operational data.)`
  }
];

const CATEGORIES = [
  { id: 'all', label: '全部文章 (All Articles)', icon: BookOpen },
  { id: 'basics', label: '基礎教學 (Basics)', icon: Rocket },
  { id: 'settings', label: '設定 (Settings)', icon: Building2 },
  { id: 'events', label: '訂單與活動 (Orders & Events)', icon: FileText },
  { id: 'finance', label: '財務與單據 (Finance & Documents)', icon: CreditCard },
  { id: 'team', label: '團隊管理 (Team)', icon: Users },
  { id: 'ai', label: 'AI 功能 (AI Features)', icon: Sparkles },
];

const DocumentationHub = () => {
  const { appSettings } = useAuth();
  const { L } = useLang();
  const [activeCategory, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);

  const filteredArticles = HELP_ARTICLES.filter(art => {
    const matchesTab = activeCategory === 'all' || art.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch = L(art.title).toLowerCase().includes(q) || L(art.description).toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-indigo-600/10 rounded-xl"><BookOpen className="text-indigo-600" size={28} /></div>
            {L('使用指南 (Help Center)')}
          </h2>
          <p className="text-slate-500 mt-2 font-medium">
            {appSettings?.venueProfile?.nameZh || 'VowsOS'} {L('幫助中心 — 快速掌握系統操作。 (Help Center — get up to speed quickly.)')}
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder={L('搜尋教學文章... (Search articles...)')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all shadow-sm font-medium" />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setActiveTab(cat.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${activeCategory === cat.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>
            <cat.icon size={16} /> {L(cat.label)}
          </button>
        ))}
      </div>

      {/* Article cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredArticles.map(art => (
          <Card key={art.id} className="p-6 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group border-slate-200" onClick={() => setSelectedArticle(art)}>
            <div className="p-3 rounded-2xl bg-slate-50 group-hover:bg-indigo-600/5 transition-colors inline-block mb-4">
              <art.icon size={24} className={art.color} />
            </div>
            <h4 className="text-lg font-black text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">{L(art.title)}</h4>
            <p className="text-sm text-slate-500 leading-relaxed font-medium mb-6">{L(art.description)}</p>
            <div className="flex items-center justify-end pt-4 border-t border-slate-50">
              <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 group-hover:gap-2 transition-all">{L('閱讀 (Read)')} <ChevronRight size={16} /></span>
            </div>
          </Card>
        ))}
        {filteredArticles.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-400 italic">{L('找不到相關文章。 (No matching articles found.)')}</div>
        )}
      </div>

      {/* Contact support */}
      <div className="bg-slate-900 rounded-3xl p-10 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-5 -rotate-12 translate-x-1/4 -translate-y-1/4"><ShieldCheck size={280} /></div>
        <div className="relative z-10 max-w-2xl space-y-5">
          <h3 className="text-3xl font-black tracking-tight leading-tight">{L('需要更多協助？ (Need more help?)')}<br /><span className="text-indigo-400">{L('我們的支援團隊隨時待命。 (Our support team is always on standby.)')}</span></h3>
          <p className="text-slate-400 font-medium leading-relaxed">
            {L('如在使用上遇到任何問題，或希望客製化流程，歡迎聯絡 VowsOS 支援團隊。 (If you run into any issues or want to customize your workflow, feel free to contact the VowsOS support team.)')}
          </p>
          <a href="mailto:hello@vowsos.com" className="inline-flex bg-white text-slate-900 px-8 py-3 rounded-2xl font-black items-center gap-2 hover:scale-105 transition-all active:scale-95 shadow-xl">
            <MessageCircle size={18} /> {L('聯絡支援 (Contact Support)')}
          </a>
        </div>
      </div>

      {/* Article modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setSelectedArticle(null)}>
          <Card className="max-w-2xl w-full p-10 bg-white max-h-[80vh] overflow-y-auto relative animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedArticle(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"><X size={22} /></button>
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-slate-50 rounded-2xl"><selectedArticle.icon size={32} className={selectedArticle.color} /></div>
              <div>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">{L(CATEGORIES.find(c => c.id === selectedArticle.category)?.label) || selectedArticle.category}</span>
                <h3 className="text-3xl font-black text-slate-800">{L(selectedArticle.title)}</h3>
              </div>
            </div>
            <p className="text-base text-slate-600 leading-relaxed font-medium whitespace-pre-line">{L(selectedArticle.content)}</p>
            <div className="mt-12 pt-8 border-t border-slate-100 flex justify-end">
              <button onClick={() => setSelectedArticle(null)} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold">{L('完成閱讀 (Close)')}</button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DocumentationHub;
