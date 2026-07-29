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
  const [pendingAtts, setPendingAtts] = useState([]); // [{ url, name, type }]
  const [uploading, setUploading] = useState(false);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [showTpl, setShowTpl] = useState(false);
  const [templates, setTemplates] = useState(null); // null = not loaded
  const [loadingTpl, setLoadingTpl] = useState(false);
  const [selTpl, setSelTpl] = useState(null);
  const [tplParams, setTplParams] = useState([]);
  const endRef = useRef(null);
  const fileRef = useRef(null);

  const openTemplates = async () => {
    setShowTpl(true);
    if (templates !== null) return;
    setLoadingTpl(true);
    try {
      const r = await httpsCallable(functions, 'getWhatsappTemplates')({ appId });
      setTemplates(r.data.templates || []);
    } catch (e) {
      alert(`${L('載入範本失敗 (Failed to load templates)')}: ${e.message}`);
      setTemplates([]);
    } finally { setLoadingTpl(false); }
  };
  const pickTemplate = (t) => { setSelTpl(t); setTplParams(Array(t.varCount).fill('')); };
  const sendTemplate = async () => {
    if (!selTpl || sending) return;
    let rendered = selTpl.bodyText || selTpl.name;
    tplParams.forEach((p, i) => { rendered = rendered.replace(new RegExp(`\\{\\{\\s*${i + 1}\\s*\\}\\}`, 'g'), p || `{{${i + 1}}}`); });
    setSending(true);
    try {
      await httpsCallable(functions, 'sendEventMessage')({ appId, eventId, body: rendered, channel: 'whatsapp', template: { name: selTpl.name, language: selTpl.language, params: tplParams } });
      setShowTpl(false); setSelTpl(null); setTplParams([]);
    } catch (e) {
      alert(`${L('傳送失敗 (Send failed)')}: ${e.message}`);
    } finally { setSending(false); }
  };

  const onPickFile = async (e) => {
    const files = Array.from(e.target.files || []);
    if (e.target) e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > 20 * 1024 * 1024) { alert(`${file.name}: ${L('檔案過大（上限 20MB）。 (File too large — max 20MB.)')}`); continue; }
        const r = storageRef(storage, `attachments/${appId}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${file.name}`);
        await uploadBytes(r, file);
        const url = await getDownloadURL(r);
        setPendingAtts(prev => [...prev, { url, name: file.name, type: file.type || '' }]);
      }
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
    if ((!body && pendingAtts.length === 0) || !eventId || sending) return;
    setSending(true);
    try {
      const attachments = pendingAtts;
      if (mode === 'email') {
        await httpsCallable(functions, 'sendEventMessage')({ appId, eventId, body, channel: 'email', attachments, cc, bcc });
      } else if (mode === 'whatsapp') {
        await httpsCallable(functions, 'sendEventMessage')({ appId, eventId, body, channel: 'whatsapp', attachments });
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
      setPendingAtts([]);
      setCc(''); setBcc('');
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
                {Array.isArray(m.cc) && m.cc.length > 0 && <p className={`text-[10px] mt-0.5 ${mine && !note ? 'text-indigo-200' : 'text-slate-400'}`}>CC: {m.cc.join(', ')}</p>}
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
          {mode === 'whatsapp' && <button type="button" onClick={openTemplates} className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 ml-auto">{L('範本 (Templates)')}</button>}
          {!clientEmail && !(waConfigured && clientPhone) && <span className="text-[11px] text-slate-400 italic">{L('此客戶未設定電郵/電話 (No client email or phone on file)')}</span>}
        </div>
        {showTpl && mode === 'whatsapp' && (
          <div className="mb-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-800">{L('訊息範本 — 開啟新對話 (Templates — start a conversation)')}</span>
              <button type="button" onClick={() => { setShowTpl(false); setSelTpl(null); }} className="text-emerald-600"><X size={14} /></button>
            </div>
            {loadingTpl ? <div className="text-center py-2 text-emerald-600"><Loader2 size={16} className="animate-spin inline" /></div>
              : !selTpl ? (
                (templates && templates.length)
                  ? <div className="space-y-1 max-h-40 overflow-y-auto">
                    {templates.map(t => (
                      <button key={t.name + t.language} type="button" onClick={() => pickTemplate(t)} className="w-full text-left p-2 rounded-lg bg-white border border-emerald-100 hover:border-emerald-300 text-xs">
                        <span className="font-bold text-slate-700">{t.name}</span> <span className="text-slate-400">({t.language})</span>
                        <p className="text-slate-500 truncate">{t.bodyText}</p>
                      </button>
                    ))}
                  </div>
                  : <p className="text-xs text-slate-400 italic text-center py-2">{L('沒有已批核的範本。 (No approved templates.)')}</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-600 bg-white p-2 rounded border border-emerald-100 whitespace-pre-wrap">{selTpl.bodyText}</p>
                  {tplParams.map((p, i) => (
                    <input key={i} value={p} onChange={e => setTplParams(prev => prev.map((x, xi) => xi === i ? e.target.value : x))} placeholder={`{{${i + 1}}}`} className="w-full p-2 border border-emerald-200 rounded text-xs outline-none" />
                  ))}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setSelTpl(null)} className="flex-1 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold">{L('返回 (Back)')}</button>
                    <button type="button" onClick={sendTemplate} disabled={sending} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold disabled:opacity-50">{sending ? '…' : L('傳送範本 (Send template)')}</button>
                  </div>
                </div>
              )}
          </div>
        )}
        {mode === 'email' && (
          <div className="mb-2">
            <button type="button" onClick={() => setShowCcBcc(v => !v)} className="text-[11px] font-bold text-slate-400 hover:text-slate-600">{showCcBcc ? L('隱藏 CC/BCC (Hide CC/BCC)') : L('CC / BCC')}</button>
            {showCcBcc && (
              <div className="mt-1 space-y-1">
                <input value={cc} onChange={e => setCc(e.target.value)} placeholder={L('CC（以逗號分隔）(CC, comma-separated)')} className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500" />
                <input value={bcc} onChange={e => setBcc(e.target.value)} placeholder={L('BCC（以逗號分隔）(BCC, comma-separated)')} className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500" />
              </div>
            )}
          </div>
        )}
        {pendingAtts.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {pendingAtts.map((a, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-100 rounded-lg px-2 py-1.5 text-xs max-w-full">
                {String(a.type || '').startsWith('image/') ? <img src={a.url} alt="" className="h-8 w-8 object-cover rounded" /> : <FileText size={14} className="text-slate-500" />}
                <span className="truncate max-w-[160px] font-medium text-slate-700">{a.name}</span>
                <button type="button" onClick={() => setPendingAtts(prev => prev.filter((_, xi) => xi !== i))} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end">
          <input ref={fileRef} type="file" multiple className="hidden" onChange={onPickFile} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="p-2.5 text-slate-400 hover:text-indigo-600 disabled:opacity-50" title={L('附件 (Attach files)')}>
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
          </button>
          <textarea rows="1" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={mode === 'email' ? `${L('以電郵傳送給 (Email to)')} ${clientEmail}` : mode === 'whatsapp' ? `${L('以 WhatsApp 傳送給 (WhatsApp to)')} ${clientPhone}` : L('輸入內部備註...(Internal note...)')} className="flex-1 resize-none p-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none" />
          <button type="button" onClick={send} disabled={sending || (!text.trim() && pendingAtts.length === 0)} className="px-4 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessagesTab;
