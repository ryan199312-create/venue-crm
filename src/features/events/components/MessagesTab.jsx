import React, { useEffect, useRef, useState } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../core/firebase';
import { useAuth } from '../../../context/AuthContext';
import { useLang } from '../../../i18n/language';
import { Send, Loader2, MessageCircle, StickyNote, Mail } from 'lucide-react';

// Chat thread for an event (events/{id}/messages). Real-time via onSnapshot (staff are
// Firebase-authed). Channels: portal (in-app, shown to the couple), email (sent + logged
// via sendEventMessage), internal note (staff-only). Used both in the event form and the
// global inbox (InboxView), so height is a prop.
const MessagesTab = ({ eventId, clientEmail, heightClass = 'h-[62vh]' }) => {
  const { appId, userProfile, user } = useAuth();
  const { L } = useLang();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [mode, setMode] = useState('client'); // 'client' | 'email' | 'note'
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const eventRef = () => doc(db, 'artifacts', appId, 'private', 'data', 'events', eventId);

  useEffect(() => {
    if (!eventId) { setLoading(false); return; }
    const col = collection(db, 'artifacts', appId, 'private', 'data', 'events', eventId, 'messages');
    const unsub = onSnapshot(query(col, orderBy('createdAt', 'asc'), limit(500)), (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [appId, eventId]);

  // Staff is viewing this thread — clear the unread badge.
  useEffect(() => {
    if (eventId) updateDoc(eventRef(), { unreadForStaff: 0 }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, eventId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || !eventId || sending) return;
    setSending(true);
    try {
      if (mode === 'email') {
        await httpsCallable(functions, 'sendEventMessage')({ appId, eventId, body, channel: 'email' });
      } else {
        const col = collection(db, 'artifacts', appId, 'private', 'data', 'events', eventId, 'messages');
        await addDoc(col, {
          channel: mode === 'note' ? 'note' : 'portal',
          direction: 'out', body,
          author: user?.uid || 'staff',
          authorName: userProfile?.displayName || userProfile?.email || 'Staff',
          status: 'sent', internal: mode === 'note',
          createdAt: serverTimestamp(),
        });
        if (mode === 'client') {
          await updateDoc(eventRef(), { lastMessageAt: serverTimestamp(), lastMessageBody: body.slice(0, 140), lastMessageDirection: 'out' }).catch(() => {});
        }
      }
      setText('');
    } catch (e) {
      alert(`${L('傳送失敗 (Send failed)')}: ${e.message}`);
    } finally { setSending(false); }
  };

  if (!eventId) {
    return <div className="text-center text-slate-400 italic text-sm py-12">{L('請先儲存活動才能開始對話。 (Save the event first to start a conversation.)')}</div>;
  }

  const channelTag = (m) => {
    if (m.channel === 'email') return { icon: Mail, label: L('電郵 (Email)'), cls: 'text-sky-500' };
    if (m.channel === 'note') return { icon: StickyNote, label: L('內部備註 (Internal note)'), cls: 'text-amber-600' };
    return null;
  };

  return (
    <div className={`flex flex-col ${heightClass} bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
        {loading && <div className="flex justify-center py-8 text-slate-400"><Loader2 className="animate-spin" /></div>}
        {!loading && messages.length === 0 && <p className="text-center text-slate-400 italic text-sm py-8">{L('尚無訊息。傳送第一則訊息給客戶。 (No messages yet — send the first message to the client.)')}</p>}
        {messages.map(m => {
          const mine = m.direction === 'out';
          const note = m.channel === 'note' || m.internal;
          const tag = channelTag(m);
          const ts = m.createdAt && m.createdAt.toDate ? m.createdAt.toDate().toLocaleString() : '';
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${note ? 'bg-amber-50 border border-amber-200 text-amber-900' : mine ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
                {tag && <p className={`text-[10px] font-bold uppercase tracking-wide mb-0.5 flex items-center gap-1 ${mine && !note ? 'text-indigo-200' : tag.cls}`}><tag.icon size={10} /> {tag.label}{m.status === 'failed' ? ` · ${L('傳送失敗 (failed)')}` : ''}</p>}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`text-[10px] mt-1 ${mine && !note ? 'text-indigo-200' : 'text-slate-400'}`}>{m.authorName}{ts ? ` · ${ts}` : ''}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="border-t border-slate-200 p-3 bg-white">
        <div className="flex items-center gap-2 mb-2">
          <button type="button" onClick={() => setMode('client')} className={`text-xs px-2.5 py-1 rounded-full font-bold transition-colors ${mode === 'client' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}><MessageCircle size={11} className="inline mr-1" />{L('傳給客戶 (To client)')}</button>
          {clientEmail && <button type="button" onClick={() => setMode('email')} className={`text-xs px-2.5 py-1 rounded-full font-bold transition-colors ${mode === 'email' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'}`}><Mail size={11} className="inline mr-1" />{L('電郵 (Email)')}</button>}
          <button type="button" onClick={() => setMode('note')} className={`text-xs px-2.5 py-1 rounded-full font-bold transition-colors ${mode === 'note' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}><StickyNote size={11} className="inline mr-1" />{L('內部備註 (Internal note)')}</button>
        </div>
        <div className="flex gap-2">
          <textarea rows="1" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={mode === 'email' ? `${L('以電郵傳送給 (Email to)')} ${clientEmail}` : mode === 'note' ? L('輸入內部備註...(Internal note...)') : L('輸入訊息...(Type a message...)')} className="flex-1 resize-none p-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none" />
          <button type="button" onClick={send} disabled={sending || !text.trim()} className="px-4 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessagesTab;
