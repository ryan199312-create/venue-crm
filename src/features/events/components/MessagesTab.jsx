import React, { useEffect, useRef, useState } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, functions, storage } from '../../../core/firebase';
import { useAuth } from '../../../context/AuthContext';
import { useLang } from '../../../i18n/language';
import { Send, Loader2, StickyNote, Mail, MessageCircle, Paperclip, X, FileText, Download } from 'lucide-react';

// Whether the tenant has WhatsApp configured — fetched once per appId per session.
const _waStatusCache = {};
const fetchWaStatus = (appId) => {
  if (!_waStatusCache[appId]) {
    _waStatusCache[appId] = httpsCallable(functions, 'getWhatsappStatus')({ appId })
      .then(r => r.data).catch(() => ({ configured: false }));
  }
  return _waStatusCache[appId];
};

// Chat thread for an event (events/{id}/messages). Real-time via onSnapshot (staff are
// Firebase-authed). Channels: email + WhatsApp (sent + logged via sendEventMessage) and
// internal note (staff-only). Used both in the event form and the global inbox
// (InboxView), so height is a prop.
const MessagesTab = ({ eventId, clientEmail, clientPhone, heightClass = 'h-[62vh]' }) => {
  const { appId, userProfile, user } = useAuth();
  const { L } = useLang();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [mode, setMode] = useState(clientEmail ? 'email' : 'note'); // 'email' | 'whatsapp' | 'note'
  const [sending, setSending] = useState(false);
  const [waConfigured, setWaConfigured] = useState(false);
  const [pendingAtt, setPendingAtt] = useState(null); // { url, name, type } | null
  const [uploading, setUploading] = useState(false);
  const endRef = useRef(null);
  const fileRef = useRef(null);

  const onPickFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert(L('檔案過大（上限 20MB）。 (File too large — max 20MB.)')); return; }
    setUploading(true);
    try {
      const r = storageRef(storage, `attachments/${appId}/${Date.now()}_${file.name}`);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      setPendingAtt({ url, name: file.name, type: file.type || '' });
    } catch (err) {
      alert(`${L('上傳失敗 (Upload failed)')}: ${err.message}`);
    } finally { setUploading(false); }
  };

  useEffect(() => {
    let alive = true;
    fetchWaStatus(appId).then(s => { if (alive) setWaConfigured(!!s.configured); });
    return () => { alive = false; };
  }, [appId]);

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
    if ((!body && !pendingAtt) || !eventId || sending) return;
    setSending(true);
    try {
      const attachments = pendingAtt ? [pendingAtt] : [];
      if (mode === 'email' || mode === 'whatsapp') {
        await httpsCallable(functions, 'sendEventMessage')({ appId, eventId, body, channel: mode, attachments });
      } else {
        // internal note — staff-only, never shown to the client
        const col = collection(db, 'artifacts', appId, 'private', 'data', 'events', eventId, 'messages');
        await addDoc(col, {
          channel: 'note', direction: 'out', body,
          author: user?.uid || 'staff',
          authorName: userProfile?.displayName || userProfile?.email || 'Staff',
          status: 'sent', internal: true,
          createdAt: serverTimestamp(),
          ...(attachments.length ? { attachments } : {}),
        });
      }
      setText('');
      setPendingAtt(null);
    } catch (e) {
      alert(`${L('傳送失敗 (Send failed)')}: ${e.message}`);
    } finally { setSending(false); }
  };

  if (!eventId) {
    return <div className="text-center text-slate-400 italic text-sm py-12">{L('請先儲存活動才能開始對話。 (Save the event first to start a conversation.)')}</div>;
  }

  const channelTag = (m) => {
    if (m.channel === 'email') return { icon: Mail, label: L('電郵 (Email)'), cls: 'text-sky-500' };
    if (m.channel === 'whatsapp') return { icon: MessageCircle, label: 'WhatsApp', cls: 'text-emerald-500' };
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
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                {Array.isArray(m.attachments) && m.attachments.map((a, i) => (
                  <div key={i} className="mt-1.5">
                    {String(a.type || '').startsWith('image/')
                      ? <a href={a.url} target="_blank" rel="noopener noreferrer"><img src={a.url} alt={a.name} className="max-h-44 rounded-lg border border-black/10" /></a>
                      : <a href={a.url} target="_blank" rel="noopener noreferrer" download className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium ${mine && !note ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}><FileText size={13} /> <span className="truncate max-w-[180px]">{a.name}</span> <Download size={12} /></a>}
                  </div>
                ))}
                <p className={`text-[10px] mt-1 ${mine && !note ? 'text-indigo-200' : 'text-slate-400'}`}>{m.authorName}{ts ? ` · ${ts}` : ''}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="border-t border-slate-200 p-3 bg-white">
        <div className="flex items-center gap-2 mb-2">
          {clientEmail && <button type="button" onClick={() => setMode('email')} className={`text-xs px-2.5 py-1 rounded-full font-bold transition-colors ${mode === 'email' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'}`}><Mail size={11} className="inline mr-1" />{L('電郵 (Email)')}</button>}
          {waConfigured && clientPhone && <button type="button" onClick={() => setMode('whatsapp')} className={`text-xs px-2.5 py-1 rounded-full font-bold transition-colors ${mode === 'whatsapp' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}><MessageCircle size={11} className="inline mr-1" />WhatsApp</button>}
          <button type="button" onClick={() => setMode('note')} className={`text-xs px-2.5 py-1 rounded-full font-bold transition-colors ${mode === 'note' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}><StickyNote size={11} className="inline mr-1" />{L('內部備註 (Internal note)')}</button>
          {!clientEmail && !(waConfigured && clientPhone) && <span className="text-[11px] text-slate-400 italic">{L('此客戶未設定電郵/電話 (No client email or phone on file)')}</span>}
        </div>
        {pendingAtt && (
          <div className="mb-2 flex items-center gap-2 bg-slate-100 rounded-lg px-2 py-1.5 text-xs w-fit max-w-full">
            {String(pendingAtt.type || '').startsWith('image/') ? <img src={pendingAtt.url} alt="" className="h-8 w-8 object-cover rounded" /> : <FileText size={14} className="text-slate-500" />}
            <span className="truncate max-w-[200px] font-medium text-slate-700">{pendingAtt.name}</span>
            <button type="button" onClick={() => setPendingAtt(null)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <input ref={fileRef} type="file" className="hidden" onChange={onPickFile} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="p-2.5 text-slate-400 hover:text-indigo-600 disabled:opacity-50" title={L('附件 (Attach file)')}>
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
          </button>
          <textarea rows="1" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={mode === 'email' ? `${L('以電郵傳送給 (Email to)')} ${clientEmail}` : mode === 'whatsapp' ? `${L('以 WhatsApp 傳送給 (WhatsApp to)')} ${clientPhone}` : L('輸入內部備註...(Internal note...)')} className="flex-1 resize-none p-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none" />
          <button type="button" onClick={send} disabled={sending || (!text.trim() && !pendingAtt)} className="px-4 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessagesTab;
