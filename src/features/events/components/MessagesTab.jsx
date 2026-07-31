import React, { useEffect, useRef, useState } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, functions, storage } from '../../../core/firebase';
import { useAuth } from '../../../context/AuthContext';
import { useLang } from '../../../i18n/language';
import { usePdfGenerator } from '../../documents/hooks/usePdfGenerator';
import { useAI } from '../../../hooks/useAI';
import { Send, Loader2, StickyNote, Mail, MessageCircle, Paperclip, X, FileText, Download, Files, Languages, Sparkles } from 'lucide-react';

// Quick starting points for the AI draft assistant. Labels are bilingual so L() can pick.
const AI_PRESETS = [
  { key: 'reply', label: '回覆最新訊息 (Reply to latest)', prompt: "Write a helpful, professional reply to the client's most recent message." },
  { key: 'followup', label: '跟進 (Follow up)', prompt: 'Politely follow up on the outstanding quotation/booking and invite the client to confirm the next step.' },
  { key: 'payment', label: '提醒付款 (Payment reminder)', prompt: 'Write a courteous reminder about the next outstanding payment/deposit for this event, referencing what has already been paid.' },
  { key: 'confirm', label: '確認細節 (Confirm details)', prompt: 'Summarise and confirm the key event details (date, time, tables, menu) and ask the client to confirm they are correct.' },
  { key: 'thanks', label: '答謝 (Thank you)', prompt: 'Write a warm thank-you message to the client for choosing the venue; reassure them we look forward to hosting their event.' },
];

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
// (InboxView), so height is a prop. eventData + appSettings (optional) enable the
// one-tap "attach a system document" picker (generates the PDF on the fly).
const MessagesTab = ({ eventId, clientEmail, clientPhone, heightClass = 'h-[62vh]', eventData = null, appSettings = null }) => {
  const { appId, userProfile, user } = useAuth();
  const { L } = useLang();
  const { generatePdf } = usePdfGenerator();
  const { generate } = useAI();
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
  const [subject, setSubject] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [showTpl, setShowTpl] = useState(false);
  const [templates, setTemplates] = useState(null); // null = not loaded
  const [loadingTpl, setLoadingTpl] = useState(false);
  const [selTpl, setSelTpl] = useState(null);
  const [tplParams, setTplParams] = useState([]);
  // Document picker (generate a system PDF and attach it)
  const [showDocs, setShowDocs] = useState(false);
  const [docLang, setDocLang] = useState('zh'); // 'zh' | 'en'
  const [genDoc, setGenDoc] = useState(''); // docType currently generating
  // Translation state
  const [msgTx, setMsgTx] = useState({});      // { [msgId]: translatedText }
  const [txLoading, setTxLoading] = useState({}); // { [msgId]: bool }
  const [draftTx, setDraftTx] = useState(false);  // composer translating
  const [preTx, setPreTx] = useState(null);       // pre-translation draft, for revert
  // AI draft assistant
  const [showAi, setShowAi] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiLang, setAiLang] = useState('auto'); // 'auto' | 'zh' | 'en'
  const endRef = useRef(null);
  const fileRef = useRef(null);

  const venueName = (appSettings?.venueProfiles?.[eventData?.venueId]?.nameEn)
    || (appSettings?.outlets || []).find(o => o.id === eventData?.venueId)?.name
    || eventData?.venueLocation || '';

  // System documents we can generate + attach on the fly. Menu confirmations are one per
  // menu on the event. printMode strings match DocumentRouter.
  const docChoices = React.useMemo(() => {
    if (!eventData) return [];
    const list = [
      { docType: 'QUOTATION', label: L('報價單 (Quotation)') },
      { docType: 'CONTRACT', label: L('合約 (Contract)') },
      { docType: 'INVOICE', label: L('發票 (Invoice)') },
      { docType: 'RECEIPT', label: L('收據 (Receipt)') },
    ];
    (eventData.menus || []).forEach(m => {
      list.push({ docType: `MENU_CONFIRM_BILINGUAL_${m.id}`, label: `${L('菜單確認 (Menu)')}: ${m.title || m.type || m.id}` });
    });
    return list;
  }, [eventData, L]);

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

  // Generate a system document PDF and add it as a pending attachment.
  const attachDoc = async (choice) => {
    if (!eventData || genDoc) return;
    setGenDoc(choice.docType);
    try {
      const { url, fileName } = await generatePdf({
        docType: choice.docType,
        data: eventData,
        appSettings: appSettings || {},
        lang: docLang,
        silent: true, // don't pop the PDF open — we're attaching it
      });
      setPendingAtts(prev => [...prev, { url, name: fileName || `${choice.label}.pdf`, type: 'application/pdf' }]);
      setShowDocs(false);
    } catch (e) {
      alert(`${L('產生文件失敗 (Failed to generate document)')}: ${e.message}`);
    } finally { setGenDoc(''); }
  };

  // Translate one message bubble (toggle). Direction auto-detected server-side.
  const translateMsg = async (m) => {
    if (msgTx[m.id]) { setMsgTx(p => { const n = { ...p }; delete n[m.id]; return n; }); return; }
    if (!m.body || txLoading[m.id]) return;
    setTxLoading(p => ({ ...p, [m.id]: true }));
    try {
      const r = await httpsCallable(functions, 'translateText')({ text: m.body });
      setMsgTx(p => ({ ...p, [m.id]: r.data.translated }));
    } catch (e) {
      alert(`${L('翻譯失敗 (Translate failed)')}: ${e.message}`);
    } finally { setTxLoading(p => ({ ...p, [m.id]: false })); }
  };

  // Translate the composer draft in place; a second tap reverts to the original.
  const translateDraft = async () => {
    if (draftTx) return;
    if (preTx !== null) { setText(preTx); setPreTx(null); return; }
    const orig = text.trim();
    if (!orig) return;
    setDraftTx(true);
    try {
      const r = await httpsCallable(functions, 'translateText')({ text: orig });
      setPreTx(text);
      setText(r.data.translated);
    } catch (e) {
      alert(`${L('翻譯失敗 (Translate failed)')}: ${e.message}`);
    } finally { setDraftTx(false); }
  };

  // Build a compact, factual brief of THIS event for the AI (never invents data).
  const buildEventBrief = () => {
    const e = eventData || {};
    const lines = [];
    const push = (k, v) => { if (v !== undefined && v !== null && String(v).trim() !== '') lines.push(`- ${k}: ${v}`); };
    push('Client', e.clientName);
    push('Company', e.companyName);
    push('Contact', [e.clientPhone, e.clientEmail].filter(Boolean).join(' / '));
    push('Event name', e.eventName);
    push('Event type', e.customEventType || e.eventType);
    push('Date', e.date);
    push('Time', [e.startTime, e.endTime].filter(Boolean).join('–') || e.servingTime);
    push('Venue', venueName || e.venueId);
    push('Tables', e.tableCount);
    push('Guests', e.guestCount);
    push('Serving style', e.servingStyle);
    push('Drinks package', e.drinksPackage);
    if (Array.isArray(e.menus) && e.menus.length) push('Menus', e.menus.map(m => `${m.title || m.type || 'Menu'}${m.price ? ` ($${m.price})` : ''}`).join('; '));
    const pay = [];
    [1, 2, 3].forEach(n => { if (e[`deposit${n}Received`]) pay.push(`Deposit ${n}: ${e[`deposit${n}Received`]}${e[`deposit${n}Date`] ? ` on ${e[`deposit${n}Date`]}` : ''}`); });
    if (e.balanceReceived) pay.push(`Balance received: ${e.balanceReceived}`);
    if (pay.length) push('Payments', pay.join(' | '));
    push('Special menu request', e.specialMenuReq);
    push('Allergies', e.allergies);
    push('Remarks', e.remarks || e.generalRemarks || e.otherNotes);
    return lines.join('\n') || '(no details on file)';
  };

  // A pruned JSON of the rest of the event so the AI can reference anything else, minus
  // heavy/irrelevant fields (photos, floor plan, signatures, guest lists, note log).
  const prunedEventJson = () => {
    const drop = /photo|image|bgimage|signature|floor|guests|notelog|decor|base64|thumb/i;
    const e = eventData || {};
    const out = {};
    Object.keys(e).forEach(k => {
      if (drop.test(k)) return;
      const v = e[k];
      if (v == null) return;
      out[k] = (typeof v === 'string' && v.length > 400) ? v.slice(0, 400) : v;
    });
    try { return JSON.stringify(out).slice(0, 6000); } catch { return ''; }
  };

  const runAiDraft = async (presetPrompt) => {
    if (aiBusy) return;
    const instruction = (presetPrompt || aiInstruction || '').trim()
      || "Write a helpful, professional reply to the client's most recent message.";
    const channelName = mode === 'whatsapp' ? 'WhatsApp' : 'email';
    const langLine = aiLang === 'zh' ? 'Write the reply in Traditional Chinese (Hong Kong).'
      : aiLang === 'en' ? 'Write the reply in English.'
        : "Write the reply in the same language as the client's most recent message; if unclear, use Traditional Chinese (Hong Kong).";
    const sys = `You are an experienced wedding & banquet coordinator at ${venueName || 'the venue'}, writing to a client on the venue's behalf. Write a warm, professional ${channelName} message. Use ONLY the event details provided — dates, tables, menu, payments — and never invent facts that are not given; if a detail is missing, leave it out rather than guessing. ${langLine} Output ONLY the message body, ready to send: no subject line, no "[placeholders]", no explanations.`;
    const transcript = messages.slice(-12).map(m => `${m.direction === 'in' ? 'CLIENT' : 'STAFF'} (${m.channel}): ${m.body || (Array.isArray(m.attachments) && m.attachments.length ? '[attachment]' : '')}`).join('\n') || '(no messages yet)';
    const userPrompt = `EVENT BRIEF:\n${buildEventBrief()}\n\nADDITIONAL STRUCTURED DATA (JSON):\n${prunedEventJson()}\n\nCONVERSATION (oldest to newest):\n${transcript}\n\nTASK: ${instruction}`;
    setAiBusy(true);
    try {
      const out = await generate(userPrompt, sys);
      if (out && out.trim()) {
        setPreTx(null);
        setText(out.trim());
        setShowAi(false);
      } else {
        alert(L('AI 產生失敗，請重試。 (AI draft failed — please try again.)'));
      }
    } finally { setAiBusy(false); }
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
        await httpsCallable(functions, 'sendEventMessage')({ appId, eventId, body, channel: 'email', attachments, cc, bcc, subject });
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
      setPreTx(null);
      setPendingAtts([]);
      setCc(''); setBcc(''); setSubject('');
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
                {m.channel === 'email' && m.subject && <p className={`text-[10px] italic mb-0.5 ${mine && !note ? 'text-indigo-200' : 'text-slate-500'}`}>{L('主旨 (Subject)')}: {m.subject}</p>}
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                {m.body && (
                  <>
                    <button type="button" onClick={() => translateMsg(m)} className={`mt-1 text-[10px] font-semibold inline-flex items-center gap-1 ${mine && !note ? 'text-indigo-200 hover:text-white' : 'text-slate-400 hover:text-indigo-600'}`}>
                      {txLoading[m.id] ? <Loader2 size={10} className="animate-spin" /> : <Languages size={10} />}
                      {msgTx[m.id] ? L('隱藏翻譯 (Hide)') : L('翻譯 (Translate)')}
                    </button>
                    {msgTx[m.id] && (
                      <p className={`mt-1 pt-1 border-t whitespace-pre-wrap break-words ${mine && !note ? 'border-white/20 text-indigo-50' : 'border-slate-200 text-slate-600'}`}>{msgTx[m.id]}</p>
                    )}
                  </>
                )}
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
        <div className="flex items-center flex-wrap gap-2 mb-2">
          {clientEmail && <button type="button" onClick={() => setMode('email')} className={`text-xs px-2.5 py-1 rounded-full font-bold transition-colors ${mode === 'email' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'}`}><Mail size={11} className="inline mr-1" />{L('電郵 (Email)')}</button>}
          {waConfigured && clientPhone && <button type="button" onClick={() => setMode('whatsapp')} className={`text-xs px-2.5 py-1 rounded-full font-bold transition-colors ${mode === 'whatsapp' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}><MessageCircle size={11} className="inline mr-1" />WhatsApp</button>}
          <button type="button" onClick={() => setMode('note')} className={`text-xs px-2.5 py-1 rounded-full font-bold transition-colors ${mode === 'note' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}><StickyNote size={11} className="inline mr-1" />{L('內部備註 (Internal note)')}</button>
          <div className="ml-auto flex items-center gap-1.5">
            {mode === 'whatsapp' && <button type="button" onClick={openTemplates} className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">{L('範本 (Templates)')}</button>}
            <button type="button" onClick={() => setShowAi(v => !v)} className={`text-xs px-2.5 py-1 rounded-full font-bold border inline-flex items-center gap-1 ${showAi ? 'bg-violet-600 text-white border-violet-600' : 'bg-violet-50 text-violet-600 border-violet-200'}`}><Sparkles size={11} /> {L('AI 草擬 (AI)')}</button>
          </div>
          {!clientEmail && !(waConfigured && clientPhone) && <span className="text-[11px] text-slate-400 italic w-full">{L('此客戶未設定電郵/電話 (No client email or phone on file)')}</span>}
        </div>
        {showAi && (
          <div className="mb-2 p-3 bg-violet-50 border border-violet-200 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-violet-800 flex items-center gap-1"><Sparkles size={13} /> {L('AI 協助草擬 (AI draft assistant)')}</span>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg overflow-hidden border border-violet-200 text-[11px] font-bold">
                  <button type="button" onClick={() => setAiLang('auto')} className={`px-2 py-0.5 ${aiLang === 'auto' ? 'bg-violet-600 text-white' : 'bg-white text-violet-600'}`}>{L('自動 (Auto)')}</button>
                  <button type="button" onClick={() => setAiLang('zh')} className={`px-2 py-0.5 ${aiLang === 'zh' ? 'bg-violet-600 text-white' : 'bg-white text-violet-600'}`}>中</button>
                  <button type="button" onClick={() => setAiLang('en')} className={`px-2 py-0.5 ${aiLang === 'en' ? 'bg-violet-600 text-white' : 'bg-white text-violet-600'}`}>EN</button>
                </div>
                <button type="button" onClick={() => setShowAi(false)} className="text-violet-600"><X size={14} /></button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {AI_PRESETS.map(p => (
                <button key={p.key} type="button" disabled={aiBusy} onClick={() => runAiDraft(p.prompt)} className="text-[11px] px-2 py-1 rounded-full bg-white border border-violet-200 text-violet-700 hover:border-violet-400 disabled:opacity-50">{L(p.label)}</button>
              ))}
            </div>
            <textarea value={aiInstruction} onChange={e => setAiInstruction(e.target.value)} rows="2" placeholder={L('給 AI 的指示（例如：確認日期並提醒第二期訂金）。留空＝回覆客戶最新訊息。 (Tell the AI what to write — e.g. confirm the date and remind about the 2nd deposit. Blank = reply to the latest client message.)')} className="w-full p-2 border border-violet-200 rounded-lg text-xs outline-none focus:border-violet-500 resize-y" />
            <button type="button" onClick={() => runAiDraft()} disabled={aiBusy} className="mt-2 w-full py-2 bg-violet-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1.5">
              {aiBusy ? <><Loader2 size={13} className="animate-spin" /> {L('產生中… (Generating…)')}</> : <><Sparkles size={13} /> {L('產生草稿 (Generate draft)')}</>}
            </button>
            <p className="text-[10px] text-violet-500/70 mt-1.5">{L('草稿會填入輸入框，你可修改後再傳送。AI 只會使用此活動的資料。 (The draft fills the message box — edit before sending. The AI uses only this event\'s details.)')}</p>
          </div>
        )}
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
        {showDocs && eventData && (
          <div className="mb-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-800 flex items-center gap-1"><Files size={13} /> {L('附上系統文件 (Attach a document)')}</span>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg overflow-hidden border border-indigo-200 text-[11px] font-bold">
                  <button type="button" onClick={() => setDocLang('zh')} className={`px-2 py-0.5 ${docLang === 'zh' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600'}`}>中文</button>
                  <button type="button" onClick={() => setDocLang('en')} className={`px-2 py-0.5 ${docLang === 'en' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600'}`}>EN</button>
                </div>
                <button type="button" onClick={() => setShowDocs(false)} className="text-indigo-600"><X size={14} /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto">
              {docChoices.map(c => (
                <button key={c.docType} type="button" onClick={() => attachDoc(c)} disabled={!!genDoc} className="flex items-center gap-1.5 p-2 rounded-lg bg-white border border-indigo-100 hover:border-indigo-300 text-xs text-left disabled:opacity-50">
                  {genDoc === c.docType ? <Loader2 size={13} className="animate-spin text-indigo-500 shrink-0" /> : <FileText size={13} className="text-indigo-500 shrink-0" />}
                  <span className="truncate">{c.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-indigo-500/70 mt-1.5">{L('產生 PDF 後加入附件，隨訊息一同傳送。 (Generates a PDF and adds it as an attachment.)')}</p>
          </div>
        )}
        {mode === 'email' && (
          <div className="mb-2">
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder={L('主旨（留空則用活動名稱）(Subject — blank uses the event name)')} className="w-full mb-1 p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500" />
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
          {eventData && docChoices.length > 0 && (
            <button type="button" onClick={() => setShowDocs(v => !v)} className={`p-2.5 hover:text-indigo-600 ${showDocs ? 'text-indigo-600' : 'text-slate-400'}`} title={L('附上系統文件 (Attach a document)')}>
              <Files size={18} />
            </button>
          )}
          <textarea rows="1" value={text} onChange={e => { setText(e.target.value); if (preTx !== null) setPreTx(null); }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={mode === 'email' ? `${L('以電郵傳送給 (Email to)')} ${clientEmail}` : mode === 'whatsapp' ? `${L('以 WhatsApp 傳送給 (WhatsApp to)')} ${clientPhone}` : L('輸入內部備註...(Internal note...)')} className="flex-1 resize-none p-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none" />
          <button type="button" onClick={translateDraft} disabled={draftTx || (!text.trim() && preTx === null)} className={`px-2.5 py-2.5 rounded-xl text-xs font-bold border flex items-center gap-1 disabled:opacity-40 ${preTx !== null ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'}`} title={L('一鍵翻譯 (Translate draft)')}>
            {draftTx ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
            <span className="hidden sm:inline">{preTx !== null ? L('還原 (Undo)') : L('一鍵翻譯 (Translate)')}</span>
          </button>
          <button type="button" onClick={send} disabled={sending || (!text.trim() && pendingAtts.length === 0)} className="px-4 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessagesTab;
