import React, { useState } from 'react';
import { 
  BookOpen, Search, HelpCircle, Rocket, Palette, 
  FileText, Users, CreditCard, Sparkles, MessageCircle,
  ChevronRight, ExternalLink, ShieldCheck, Clock
} from 'lucide-react';
import { Card } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';

const HELP_ARTICLES = [
  {
    id: 'getting-started',
    category: 'basics',
    title: '快速開始 (Getting Started)',
    description: '了解 VowsOS 的基礎架構與初次設定。',
    icon: Rocket,
    color: 'text-orange-500',
    content: `
      歡迎使用 VowsOS！您的系統已經初始化完成。
      1. 透過左側導航進入各個模組。
      2. 「儀表板」提供今日活動與營收概覽。
      3. 首次使用建議先完成「品牌設定」。
    `
  },
  {
    id: 'branding-guide',
    category: 'settings',
    title: '品牌視覺自訂 (Branding)',
    description: '如何更換標誌、調整顏色並建立專屬客戶門戶。',
    icon: Palette,
    color: 'text-indigo-500',
    content: '在 設定 -> 視覺風格 中，您可以調整主色調、上傳 Favicon 與公司標誌。'
  },
  {
    id: 'eo-management',
    category: 'events',
    title: '訂單管理 (EO Creation)',
    description: '建立活動、編輯流程與管理菜單的詳細步驟。',
    icon: FileText,
    color: 'text-blue-500',
    content: '點擊「訂單管理」->「新增訂單」。填寫基本資料後，您可以接著設定菜單、物流與備註。'
  },
  {
    id: 'team-invite',
    category: 'team',
    title: '邀請團隊成員 (Staff Management)',
    description: '如何邀請員工並分配不同權限等級。',
    icon: Users,
    color: 'text-emerald-500',
    content: '管理員可以在 設定 -> 用戶管理 中，透過 Email 邀請新成員並設定其角色（如：業務、操作員、管理員）。'
  },
  {
    id: 'billing-logic',
    category: 'finance',
    title: '財務與帳單 (Billing)',
    description: '了解訂金計算、餘額追蹤與發票產生邏輯。',
    icon: CreditCard,
    color: 'text-rose-500',
    content: '系統會自動根據菜單價格與人數計算總額。在「財務設定」分頁中可以記錄訂金支付與產生 PDF 收據。'
  },
  {
    id: 'ai-assistant',
    category: 'ai',
    title: 'AI 智慧助理',
    description: '利用 AI 自動產生電郵草稿、分析數據或撰寫備註。',
    icon: Sparkles,
    color: 'text-violet-500',
    content: '在訂單編輯頁面，點擊右上角的星星圖標即可呼叫 AI 助理。'
  }
];

const CATEGORIES = [
  { id: 'all', label: '全部文章', icon: BookOpen },
  { id: 'basics', label: '基礎教學', icon: Rocket },
  { id: 'events', label: '訂單與活動', icon: FileText },
  { id: 'finance', label: '財務與列印', icon: CreditCard },
  { id: 'team', label: '團隊管理', icon: Users },
  { id: 'ai', label: 'AI 功能', icon: Sparkles },
];

const DocumentationHub = () => {
  const { appSettings } = useAuth();
  const [activeCategory, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);

  const filteredArticles = HELP_ARTICLES.filter(art => {
    const matchesTab = activeCategory === 'all' || art.category === activeCategory;
    const matchesSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         art.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 rounded-xl">
              <BookOpen className="text-brand-primary" size={28} />
            </div>
            使用指南 (Support Hub)
          </h2>
          <p className="text-slate-500 mt-2 font-medium">歡迎來到 {appSettings?.venueProfile?.nameZh || 'VowsOS'} 幫助中心。我們將協助您快速掌握系統操作。</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="搜尋教學文章..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary transition-all shadow-sm font-medium"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
              activeCategory === cat.id 
                ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-105' 
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <cat.icon size={16} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredArticles.map(art => (
          <Card 
            key={art.id} 
            className="p-6 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group border-slate-200"
            onClick={() => setSelectedArticle(art)}
          >
            <div className={`p-3 rounded-2xl bg-slate-50 group-hover:bg-brand-primary/5 transition-colors inline-block mb-4`}>
               <art.icon size={24} className={art.color} />
            </div>
            <h4 className="text-lg font-black text-slate-800 mb-2 group-hover:text-brand-primary transition-colors">{art.title}</h4>
            <p className="text-sm text-slate-500 leading-relaxed font-medium mb-6">
              {art.description}
            </p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock size={12} /> 閱讀時間 2 分鐘
               </span>
               <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 group-hover:text-brand-primary transition-all" />
            </div>
          </Card>
        ))}
      </div>

      {/* System Status Banner */}
      <div className="bg-slate-900 rounded-3xl p-10 text-white relative overflow-hidden shadow-2xl shadow-slate-200">
        <div className="absolute top-0 right-0 p-8 opacity-5 -rotate-12 translate-x-1/4 -translate-y-1/4">
          <ShieldCheck size={280} />
        </div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
               系統運行狀態：正常 (Normal)
            </div>
            <h3 className="text-3xl font-black tracking-tight leading-tight">
              需要更多協助？<br />
              <span className="text-indigo-400">我們的技術團隊隨時待命。</span>
            </h3>
            <p className="text-slate-400 font-medium leading-relaxed">
              如果您在系統使用過程中遇到任何異常，或希望開發特定的自動化流程，請直接透過 WhatsApp 或 Email 聯繫 VowsOS 專屬經理。
            </p>
            <div className="flex flex-wrap gap-4">
               <button className="bg-white text-slate-900 px-8 py-3 rounded-2xl font-black flex items-center gap-2 hover:scale-105 transition-all active:scale-95 shadow-xl shadow-indigo-900/50">
                  <MessageCircle size={18} /> 即時技術支援
               </button>
               <button className="bg-slate-800 text-white border border-white/10 px-8 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-slate-700 transition-all">
                  <ExternalLink size={18} /> 開啟教學影片
               </button>
            </div>
          </div>

          <div className="hidden lg:grid grid-cols-2 gap-4">
             {[
               { label: 'Cloud API', value: 'Connected', color: 'text-emerald-400' },
               { label: 'PDF Worker', value: 'Ready', color: 'text-indigo-400' },
               { label: 'Encryption', value: 'Active', color: 'text-blue-400' },
               { label: 'Backups', value: 'Daily', color: 'text-orange-400' },
             ].map((stat, i) => (
               <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-5 backdrop-blur-sm">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* ARTICLE MODAL (Simple for now) */}
      {selectedArticle && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
           <Card className="max-w-2xl w-full p-10 bg-white max-h-[80vh] overflow-y-auto relative animate-in zoom-in-95">
              <button 
                onClick={() => setSelectedArticle(null)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                 <HelpCircle size={24} className="rotate-45" />
              </button>
              <div className="flex items-center gap-4 mb-8">
                 <div className="p-4 bg-slate-50 rounded-2xl">
                    <selectedArticle.icon size={32} className={selectedArticle.color} />
                 </div>
                 <div>
                    <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">{selectedArticle.category}</span>
                    <h3 className="text-3xl font-black text-slate-800">{selectedArticle.title}</h3>
                 </div>
              </div>
              <div className="prose prose-slate max-w-none">
                 <p className="text-lg text-slate-600 leading-relaxed font-medium whitespace-pre-line">
                   {selectedArticle.content}
                 </p>
              </div>
              <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center">
                 <p className="text-xs text-slate-400 font-medium italic">此篇文章對您有幫助嗎？</p>
                 <button 
                   onClick={() => setSelectedArticle(null)}
                   className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold"
                 >
                    完成閱讀 (Close)
                 </button>
              </div>
           </Card>
        </div>
      )}
    </div>
  );
};

export default DocumentationHub;
