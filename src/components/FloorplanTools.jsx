import React from 'react';

export const TOOL_GROUPS = [
  {
    name: "桌椅 (Tables & Chairs)",
    items: [
      { type: 'round', label: '圓枱 (6ft)', w_m: 2.2, h_m: 2.2, style: 'bg-transparent', content: <div className="relative w-full h-full flex items-center justify-center"><svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-sm">{Array.from({length: 12}).map((_, i) => <circle key={i} cx={50 + 40 * Math.cos((i * 30 * Math.PI) / 180)} cy={50 + 40 * Math.sin((i * 30 * Math.PI) / 180)} r="7" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />)}<circle cx="50" cy="50" r="32" fill="#ffffff" stroke="#1e293b" strokeWidth="2" /></svg></div> },
      { type: 'round_12', label: '12人圓枱 (6ft)', w_m: 2.2, h_m: 2.2, style: 'bg-transparent', content: <div className="relative w-full h-full flex items-center justify-center"><svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-sm">{Array.from({length: 12}).map((_, i) => <circle key={i} cx={50 + 40 * Math.cos((i * 30 * Math.PI) / 180)} cy={50 + 40 * Math.sin((i * 30 * Math.PI) / 180)} r="7" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />)}<circle cx="50" cy="50" r="32" fill="#ffffff" stroke="#1e293b" strokeWidth="2" /></svg></div> },
      { type: 'round_10', label: '10人圓枱 (6ft)', w_m: 2.2, h_m: 2.2, style: 'bg-transparent', content: <div className="relative w-full h-full flex items-center justify-center"><svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-sm">{Array.from({length: 10}).map((_, i) => <circle key={i} cx={50 + 40 * Math.cos((i * 36 * Math.PI) / 180)} cy={50 + 40 * Math.sin((i * 36 * Math.PI) / 180)} r="8" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />)}<circle cx="50" cy="50" r="30" fill="#ffffff" stroke="#1e293b" strokeWidth="2" /></svg></div> },
      { type: 'round_4ft', label: '4ft 圓枱 (1.2m)', w_m: 1.2, h_m: 1.2, style: 'bg-slate-50 border-2 border-slate-500 rounded-full shadow-sm' },
      { type: 'round_6ft', label: '6ft 圓枱 (1.8m)', w_m: 1.8, h_m: 1.8, style: 'bg-slate-50 border-2 border-slate-500 rounded-full shadow-sm' },
      { type: 'ibm', label: '長枱 (1.8x0.6m)', w_m: 1.8, h_m: 0.6, style: 'bg-slate-50 border-2 border-slate-500 rounded-sm shadow-sm' },
      { type: 'table_4ft', label: '4ft 長枱 (1.2x0.6m)', w_m: 1.2, h_m: 0.6, style: 'bg-slate-50 border-2 border-slate-500 rounded-sm shadow-sm' },
      { type: 'table_6ft', label: '6ft 長枱 (1.8x0.6m)', w_m: 1.8, h_m: 0.6, style: 'bg-slate-50 border-2 border-slate-500 rounded-sm shadow-sm' },
      { type: 'buffet_8x4', label: '自助餐枱 (2.4x1.2m)', w_m: 2.44, h_m: 1.22, style: 'bg-orange-50 border-2 border-orange-400 text-orange-600 rounded shadow-sm flex items-center justify-center text-[10px] font-bold tracking-widest', content: 'BUFFET' },
      { type: 'bar', label: '水吧 (2.4x1.2m)', w_m: 2.40, h_m: 1.20, style: 'bg-cyan-50 border-2 border-cyan-400 text-cyan-600 rounded shadow-sm flex items-center justify-center text-[10px] font-bold tracking-widest', content: 'BAR' },
      { type: 'mahjong', label: '麻雀枱 (0.9m)', w_m: 1.3, h_m: 1.3, style: 'bg-transparent', content: <div className="relative w-full h-full flex items-center justify-center"><div className="absolute inset-0 border-[6px] border-dashed border-slate-500 opacity-60 rounded"></div><div className="absolute inset-[15%] bg-green-50 border-2 border-green-600 rounded shadow-sm flex items-center justify-center text-[10px] font-bold text-green-700">MJ</div></div> },
      { type: 'cocktail', label: '雞尾酒枱 (0.6m)', w_m: 0.6, h_m: 0.6, style: 'bg-slate-50 border-2 border-slate-500 rounded-full shadow-sm' },
      { type: 'chair', label: '椅子 (0.5m)', w_m: 0.5, h_m: 0.5, style: 'bg-slate-50 border-2 border-slate-400 rounded-sm shadow-sm' },
    ]
  },
  {
    name: "舞台與接待 (Stage & Rec)",
    items: [
      { type: 'stage', label: '舞台 (7.2x2.5)', w_m: 7.2, h_m: 2.5, style: 'bg-slate-800 text-slate-100 border-2 border-slate-900 rounded flex items-center justify-center font-bold tracking-widest text-[10px] shadow-md', content: 'STAGE' },
      { type: 'podium', label: '講台 (0.6x0.5)', w_m: 0.6, h_m: 0.5, style: 'bg-amber-50 border-2 border-amber-500 text-amber-700 rounded flex items-center justify-center text-[8px] font-bold tracking-widest', content: 'PODIUM' },
      { type: 'reception', label: '接待桌 (1.8x0.6)', w_m: 1.8, h_m: 0.6, style: 'bg-indigo-50 border-2 border-indigo-400 text-indigo-700 rounded shadow-sm flex items-center justify-center text-[8px] font-bold tracking-widest', content: 'RECEPTION' },
      { type: 'signage', label: '標示牌 (0.7m)', w_m: 0.69, h_m: 0.2, style: 'bg-slate-100 border-2 border-slate-400 rounded-sm text-slate-500 flex items-center justify-center text-[6px] font-bold', content: 'SIGN' },
      { type: 'cake', label: '婚宴蛋糕 (0.8m)', w_m: 0.8, h_m: 0.8, style: 'bg-pink-50 border-2 border-pink-400 text-pink-600 rounded-full flex items-center justify-center text-[8px] font-bold', content: 'CAKE' },
    ]
  },
  {
    name: "影音設備 (AV)",
    items: [
      { type: 'tv_v', label: '60"電視(直)', w_m: 0.2, h_m: 1.3, style: 'bg-slate-900 border-2 border-slate-700 text-slate-100 rounded-sm shadow-md flex items-center justify-center text-[8px] font-bold', content: 'TV' },
      { type: 'tv_h', label: '60"電視(橫)', w_m: 1.3, h_m: 0.2, style: 'bg-slate-900 border-2 border-slate-700 text-slate-100 rounded-sm shadow-md flex items-center justify-center text-[8px] font-bold', content: 'TV' },
    ]
  },
  {
    name: "佈置 (Decoration)",
    items: [
      { type: 'backdrop', label: '背景佈置 (4.8m)', w_m: 4.8, h_m: 0.3, style: 'bg-fuchsia-50 border-2 border-fuchsia-400 text-fuchsia-600 rounded flex items-center justify-center text-[8px] font-bold tracking-widest', content: 'BACKDROP' },
      { type: 'ceremony_table', label: '證婚桌 (1.2m)', w_m: 1.2, h_m: 0.6, style: 'bg-rose-50 border-2 border-rose-400 text-rose-600 rounded shadow-sm flex items-center justify-center text-[8px] font-bold', content: 'CEREMONY' },
      { type: 'flower_pillar', label: '花柱 (0.4m)', w_m: 0.4, h_m: 0.4, style: 'bg-emerald-50 border-2 border-emerald-400 text-emerald-600 rounded-full flex items-center justify-center text-[8px] font-bold', content: 'FLORAL' },
      { type: 'easel', label: '畫架 (0.5m)', w_m: 0.5, h_m: 0.5, style: 'bg-amber-50 border-2 border-amber-400 text-amber-600 rounded-sm flex items-center justify-center text-[8px] font-bold', content: 'EASEL' },
      { type: 'decor', label: '佈置 (0.5m)', w_m: 0.5, h_m: 0.5, style: 'bg-pink-50 border-2 border-pink-400 text-pink-600 rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm', content: 'DECOR' },
      { type: 'text', label: '文字 (Text)', w_m: 2.0, h_m: 0.5, style: 'bg-white/80 backdrop-blur-sm border-2 border-dashed border-slate-400 text-slate-700 flex items-center justify-center shadow-sm font-bold', content: 'T' }
    ]
  }
];