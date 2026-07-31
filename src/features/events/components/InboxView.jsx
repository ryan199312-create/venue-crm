import React, { useEffect, useMemo, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../core/firebase';
import { useAuth } from '../../../context/AuthContext';
import { useLang } from '../../../i18n/language';
import { getScopedSettings } from '../../../services/helpers';
import { MessageSquare, Search, ChevronLeft, ExternalLink, Mail, Inbox, FileText, Loader2 } from 'lucide-react';
import MessagesTab from './MessagesTab';

// Global staff inbox: every event that has a chat thread, newest first, plus an
// "Unassigned" bucket for inbound emails we couldn't route to an event automatically.
const millis = (t) => (t && t.toMillis ? t.toMillis() : (t && t.seconds ? t.seconds * 1000 : 0));
const UNASSIGNED = '__unassigned__';

const InboxView = ({ events = [], openEditModal }) => {
  const { appId, appSettings } = useAuth();
  const { L } = useLang();
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [unassigned, setUnassigned] = useState([]);
  const [assignTo, setAssignTo] = useState({}); // { [unassignedId]: eventId }
  const [assigning, setAssigning] = useState('');

  useEffect(() => {
    if (!appId) return;
    const col = collection(db, 'artifacts', appId, 'private', 'data', 'unassigned_inbound');
    const unsub = onSnapshot(query(col, orderBy('createdAt', 'desc'), limit(100)),
      (snap) => setUnassigned(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => setUnassigned([]));
    return () => unsub();
  }, [appId]);

  const convos = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? events.filter(e => `${e.clientName || ''} ${e.eventName || ''} ${e.orderId || ''}`.toLowerCase().includes(q))
      : events.filter(e => e.lastMessageAt);
    return [...base].sort((a, b) => millis(b.lastMessageAt) - millis(a.lastMessageAt));
  }, [events, search]);

  // Events sorted for the "assign to" picker.
  const eventOptions = useMemo(() =>
    [...events].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)), [events]);

  const selected = events.find(e => e.id === selectedId) || null;

  const relTime = (t) => {
    const m = millis(t);
    if (!m) return '';
    const d = new Date(m);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const assign = async (u) => {
    const eventId = assignTo[u.id];
    if (!eventId) { alert(L('請先選擇要歸入的活動 (Pick an event to assign to first)')); return; }
    setAssigning(u.id);
    try {
      await httpsCallable(functions, 'assignInboundEmail')({ appId, unassignedId: u.id, eventId });
      // onSnapshot removes it automatically once the function deletes it.
    } catch (e) {
      alert(`${L('歸類失敗 (Assign failed)')}: ${e.message}`);
    } finally { setAssigning(''); }
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
          {/* Unassigned bucket (only when there's something to review) */}
          {unassigned.length > 0 && (
            <button onClick={() => setSelectedId(UNASSIGNED)} className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-amber-50 transition-colors ${selectedId === UNASSIGNED ? 'bg-amber-50' : 'bg-amber-50/40'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-amber-800 text-sm flex items-center gap-1.5"><Inbox size={14} /> {L('未認領郵件 (Unassigned)')}</span>
                <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shrink-0">{unassigned.length}</span>
              </div>
              <p className="text-[11px] text-amber-700/70 truncate mt-0.5">{L('無法自動歸類的來郵，請人手指派 (Emails we couldn\'t auto-route — assign manually)')}</p>
            </button>
          )}
          {convos.length === 0 && unassigned.length === 0 && <p className="text-center text-slate-400 italic text-sm py-10">{search ? L('沒有符合的客戶 (No matching clients)') : L('尚無對話 (No conversations yet)')}</p>}
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

      {/* Right pane */}
      <div className={`flex-1 min-w-0 flex-col ${selectedId ? 'flex' : 'hidden md:flex'}`}>
        {selectedId === UNASSIGNED ? (
          <>
            <div className="p-3 border-b border-slate-200 flex items-center gap-2">
              <button onClick={() => setSelectedId(null)} className="md:hidden text-slate-500 shrink-0"><ChevronLeft size={20} /></button>
              <p className="font-bold text-slate-800 flex items-center gap-2"><Inbox size={16} className="text-amber-600" /> {L('未認領郵件 (Unassigned emails)')}</p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 bg-slate-50/50">
              {unassigned.length === 0 && <p className="text-center text-slate-400 italic text-sm py-10">{L('沒有未認領的郵件 (No unassigned emails)')}</p>}
              {unassigned.map(u => (
                <div key={u.id} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700 truncate"><Mail size={11} className="inline mr-1 text-sky-500" />{u.authorName || u.fromEmail}</span>
                    <span className="text-[10px] text-slate-300 shrink-0">{relTime(u.createdAt)}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{u.fromEmail}</p>
                  {u.subject && <p className="text-xs font-semibold text-slate-600 mt-1">{L('主旨 (Subject)')}: {u.subject}</p>}
                  <p className="text-sm text-slate-800 whitespace-pre-wrap break-words mt-1 max-h-40 overflow-y-auto">{u.body}</p>
                  {Array.isArray(u.attachments) && u.attachments.map((a, i) => (
                    <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1.5 mr-2 rounded-lg px-2 py-1 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200"><FileText size={12} /> {a.name}</a>
                  ))}
                  <div className="flex gap-2 mt-3 pt-2 border-t border-slate-100">
                    <select value={assignTo[u.id] || ''} onChange={e => setAssignTo(m => ({ ...m, [u.id]: e.target.value }))} className="flex-1 min-w-0 p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500">
                      <option value="">{L('選擇活動… (Assign to event…)')}</option>
                      {eventOptions.map(ev => <option key={ev.id} value={ev.id}>{(ev.clientName || ev.eventName || 'Unnamed')} · {ev.eventName || ''} · {ev.date || ''}</option>)}
                    </select>
                    <button onClick={() => assign(u)} disabled={assigning === u.id || !assignTo[u.id]} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1">
                      {assigning === u.id ? <Loader2 size={13} className="animate-spin" /> : null} {L('歸類 (Assign)')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : selected ? (
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
              <MessagesTab key={selected.id} eventId={selected.id} clientEmail={selected.clientEmail} clientPhone={selected.clientPhone} eventData={selected} appSettings={getScopedSettings(appSettings, selected.venueId)} heightClass="h-full" />
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
