import React, { useMemo, useState } from 'react';
import { useLang } from '../../../i18n/language';
import { MessageSquare, Search, ChevronLeft, ExternalLink, Mail } from 'lucide-react';
import MessagesTab from './MessagesTab';

// Global staff inbox: every event that has a chat thread, newest first, with a search
// across all clients so staff can open (or start) a conversation with anyone.
const millis = (t) => (t && t.toMillis ? t.toMillis() : (t && t.seconds ? t.seconds * 1000 : 0));

const InboxView = ({ events = [], openEditModal }) => {
  const { L } = useLang();
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');

  const convos = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? events.filter(e => `${e.clientName || ''} ${e.eventName || ''} ${e.orderId || ''}`.toLowerCase().includes(q))
      : events.filter(e => e.lastMessageAt);
    return [...base].sort((a, b) => millis(b.lastMessageAt) - millis(a.lastMessageAt));
  }, [events, search]);

  const selected = events.find(e => e.id === selectedId) || null;

  const relTime = (t) => {
    const m = millis(t);
    if (!m) return '';
    const d = new Date(m);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex h-[78vh]">
      {/* Conversation list */}
      <div className={`w-full md:w-80 md:shrink-0 border-r border-slate-200 flex-col ${selectedId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-3 border-b border-slate-200">
          <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><MessageSquare size={18} /> {L('對話 (Messages)')}</h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={L('搜尋客戶／訂單 (Search clients / EOs)')} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convos.length === 0 && <p className="text-center text-slate-400 italic text-sm py-10">{search ? L('沒有符合的客戶 (No matching clients)') : L('尚無對話 (No conversations yet)')}</p>}
          {convos.map(ev => (
            <button key={ev.id} onClick={() => setSelectedId(ev.id)} className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${selectedId === ev.id ? 'bg-indigo-50' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-800 text-sm truncate">{ev.clientName || ev.eventName || L('（未命名）(Unnamed)')}</span>
                {ev.unreadForStaff > 0 && <span className="bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shrink-0">{ev.unreadForStaff}</span>}
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">{ev.lastMessageDirection === 'out' ? '↩ ' : ''}{ev.lastMessageBody || L('（尚無訊息）(No messages)')}</p>
              <p className="text-[10px] text-slate-300 mt-0.5">{relTime(ev.lastMessageAt)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Thread */}
      <div className={`flex-1 min-w-0 flex-col ${selectedId ? 'flex' : 'hidden md:flex'}`}>
        {selected ? (
          <>
            <div className="p-3 border-b border-slate-200 flex items-center gap-2">
              <button onClick={() => setSelectedId(null)} className="md:hidden text-slate-500 shrink-0"><ChevronLeft size={20} /></button>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 truncate">{selected.clientName || selected.eventName}</p>
                <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">{selected.eventName} · {selected.date}{selected.clientEmail ? <> · <Mail size={10} /> {selected.clientEmail}</> : null}</p>
              </div>
              {openEditModal && <button onClick={() => openEditModal(selected)} className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:underline shrink-0"><ExternalLink size={12} /> {L('開啟訂單 (Open EO)')}</button>}
            </div>
            <div className="flex-1 min-h-0 p-3">
              <MessagesTab key={selected.id} eventId={selected.id} clientEmail={selected.clientEmail} heightClass="h-full" />
            </div>
          </>
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center text-slate-300 text-sm">{L('選擇一個對話開始 (Select a conversation)')}</div>
        )}
      </div>
    </div>
  );
};

export default InboxView;
