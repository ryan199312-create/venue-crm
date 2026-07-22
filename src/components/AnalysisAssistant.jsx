import React, { useState, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { X, Send, Bot, Loader2, Sparkles, BarChart3 } from 'lucide-react';
import { useAI } from '../hooks/useAI';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../i18n/language';

// Escape HTML first (so model output like <img onerror=…> becomes inert text),
// then apply simple **bold**, then sanitize as defense-in-depth.
function formatAiMessage(text) {
  const escaped = String(text ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const withBold = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  return DOMPurify.sanitize(withBold, { ALLOWED_TAGS: ['strong'], ALLOWED_ATTR: [] });
}

export default function AnalysisAssistant({ events, onClose }) {
  const { appSettings } = useAuth();
  const { L } = useLang();
  const venueProfile = appSettings?.venueProfile || {};
  const { generate, loading } = useAI();
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', text: `${L('你好！我是 (Hello! I am)')} ${venueProfile.nameZh || 'VowsOS'} ${L('的 AI 數據分析助理。你可以問我關於整個資料庫的任何問題！ (AI data analysis assistant. Ask me anything about the entire database!)')}` }
  ]);
  const chatEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

const handleDataChat = async () => {
    if (!chatInput.trim()) return;

    // 1. Add user message to UI
    const userMessage = { role: 'user', text: chatInput };
    setChatHistory(prev => [...prev, userMessage]);
    setChatInput("");

    // 2. Pass ABSOLUTELY EVERYTHING (No filters, raw database)
    const dbSummary = events || [];

    // 3. AI Prompts
    const systemPrompt = `You are a Senior Business Intelligence Data Analyst for {venueProfile.nameEn || 'Venue Management'} ({venueProfile.nameZh || 'VowsOS'}).
    I am providing you with a JSON array containing our COMPLETE, raw event database. It includes every single detail, timestamp, URL, and configuration.
    Analyze this deep data and answer the user's question accurately in Traditional Chinese (Cantonese context).
    You can cross-reference everything.
    Be concise, professional, and highlight key metrics using markdown bolding.`;

    const userPrompt = `
      USER QUESTION: ${userMessage.text}
      
      RAW DATABASE JSON:
      ${JSON.stringify(dbSummary)}
    `;

    // 4. Call AI
    const response = await generate(userPrompt, systemPrompt);
    
    if (response) {
      setChatHistory(prev => [...prev, { role: 'ai', text: response }]);
    } else {
      setChatHistory(prev => [...prev, { role: 'ai', text: L('抱歉，分析數據時發生錯誤。請再試一次。 (Sorry, an error occurred while analyzing the data. Please try again.)') }]);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in print:hidden">
      <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0 shadow-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-lg shadow-sm">
              <BarChart3 size={20} className="text-white"/>
            </div>
            <div>
              <h3 className="font-bold text-lg">{L('AI 數據分析助理 (Database Query)')}</h3>
              <p className="text-[10px] text-emerald-300 font-mono flex items-center gap-1">
                <Sparkles size={10}/> DeepSeek V3 Core • {events?.length || 0} Records Loaded
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* CHAT HISTORY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-emerald-600 text-white rounded-br-none' 
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
              }`}>
                {msg.role === 'ai' && <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-1 text-xs font-bold text-emerald-600"><Bot size={14}/> {L('數據助理 (Data Assistant)')}</div>}
                
                {/* Safe markdown parsing for simple bolding */}
                <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatAiMessage(msg.text) }} />
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-5 py-3 shadow-sm flex items-center gap-2 text-emerald-600 text-sm font-bold">
                <Loader2 size={16} className="animate-spin"/> {L('正在運算與分析數據庫... (Computing and analyzing the database...)')}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* INPUT AREA */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0">
           <div className="relative max-w-3xl mx-auto flex items-center shadow-sm rounded-full bg-slate-50 border border-slate-200 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all">
              <input 
                type="text" 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder={L('問我關於營業額、預訂情況的問題... (Ask me about revenue or booking status...)')}
                className="w-full bg-transparent pl-5 pr-12 py-3.5 text-sm outline-none text-slate-700 font-medium"
                onKeyDown={(e) => {
                  if(e.key === 'Enter' && chatInput) handleDataChat();
                }}
              />
              <button 
                onClick={handleDataChat}
                disabled={!chatInput || loading}
                className="absolute right-2 p-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Send size={16} className="ml-0.5" />
              </button>
           </div>
           <div className="text-center mt-2 text-[10px] text-slate-400">
              {L('AI 根據目前已同步的訂單數據進行計算，結果僅供參考。 (AI calculates based on currently synced order data; results are for reference only.)')}
           </div>
        </div>

      </div>
    </div>
  );
}