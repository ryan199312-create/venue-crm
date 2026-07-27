import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Heart, CheckCircle, CalendarDays, MapPin, PartyPopper, XCircle } from 'lucide-react';
import { functions } from '../core/firebase';
import { httpsCallable } from 'firebase/functions';
import { getTenantId } from '../core/tenantResolver';
import { useLang } from '../i18n/language';

// Public, no-login page where a wedding guest RSVPs via a shareable token link.
// Styling is self-contained (this page renders outside the authed app, so it does not
// rely on the tenant's --brand-primary CSS var).
const ACCENT = '#b08d57'; // warm gold default

export default function RsvpPortal() {
  const { L } = useLang();
  const { token } = useParams();
  const appId = getTenantId() || 'vowsos-central';

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null); // null | 'yes' | 'no'

  const [form, setForm] = useState({ name: '', attending: 'yes', partySize: 1, mealChoice: '', dietary: '', message: '' });
  const setF = (patch) => setForm(prev => ({ ...prev, ...patch }));

  useEffect(() => {
    (async () => {
      try {
        const res = await httpsCallable(functions, 'getRsvpInfo')({ appId, token });
        setInfo(res.data);
      } catch (e) {
        setError(e?.message || L('連結無效 (Invalid link)'));
      } finally {
        setLoading(false);
      }
    })();
  }, [token, appId, L]);

  const submit = async (e) => {
    if (e) e.preventDefault();
    if (!form.name.trim()) { setError(L('請輸入您的姓名 (Please enter your name)')); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await httpsCallable(functions, 'submitRsvp')({
        appId, token,
        name: form.name,
        attending: form.attending,
        partySize: form.attending === 'yes' ? form.partySize : 0,
        mealChoice: form.mealChoice,
        dietary: form.dietary,
        message: form.message,
      });
      setDone(res.data.rsvp);
    } catch (err) {
      setError(err?.message || L('提交失敗，請稍後再試。 (Submission failed, please try again.)'));
    } finally {
      setSubmitting(false);
    }
  };

  const Shell = ({ children }) => (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-5 font-sans">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-stone-100 overflow-hidden">
        <div className="h-2" style={{ background: ACCENT }} />
        <div className="p-7">{children}</div>
      </div>
    </div>
  );

  if (loading) {
    return <Shell><div className="py-10 flex justify-center text-stone-400"><Loader2 className="animate-spin" size={28} /></div></Shell>;
  }

  if (error && !info) {
    return (
      <Shell>
        <div className="text-center py-6">
          <XCircle size={40} className="mx-auto text-stone-300 mb-3" />
          <h1 className="text-lg font-bold text-stone-700">{L('連結無效 (This link is not valid)')}</h1>
          <p className="text-sm text-stone-400 mt-2">{L('請向新人確認回覆連結。 (Please check the RSVP link with the couple.)')}</p>
        </div>
      </Shell>
    );
  }

  const header = (
    <div className="text-center mb-6">
      <Heart size={26} className="mx-auto mb-2" style={{ color: ACCENT }} />
      {info?.venueName && <p className="text-[11px] font-bold tracking-widest text-stone-400 uppercase">{info.venueName}{info.venueNameEn ? ` · ${info.venueNameEn}` : ''}</p>}
      <h1 className="text-2xl font-black text-stone-800 mt-1">{info?.eventName || info?.clientName || L('婚禮邀請 (Wedding Invitation)')}</h1>
      <div className="flex items-center justify-center gap-3 text-xs text-stone-500 mt-2">
        {info?.date && <span className="flex items-center gap-1"><CalendarDays size={13} style={{ color: ACCENT }} /> {info.date}</span>}
        {info?.venueLocation && <span className="flex items-center gap-1"><MapPin size={13} style={{ color: ACCENT }} /> {info.venueLocation}</span>}
      </div>
    </div>
  );

  if (done) {
    return (
      <Shell>
        {header}
        <div className="text-center py-4">
          {done === 'yes'
            ? <PartyPopper size={44} className="mx-auto mb-3" style={{ color: ACCENT }} />
            : <CheckCircle size={44} className="mx-auto mb-3 text-stone-300" />}
          <h2 className="text-xl font-black text-stone-800">{L('多謝您的回覆！ (Thank you for your reply!)')}</h2>
          <p className="text-sm text-stone-500 mt-2">
            {done === 'yes'
              ? L('我們期待與您相聚。 (We look forward to celebrating with you.)')
              : L('很遺憾未能與您相見，感謝告知。 (Sorry we will miss you — thank you for letting us know.)')}
          </p>
          <button onClick={() => { setDone(null); setForm({ name: '', attending: 'yes', partySize: 1, mealChoice: '', dietary: '', message: '' }); }} className="mt-6 text-xs text-stone-400 underline hover:text-stone-600">
            {L('提交另一位賓客的回覆 (Submit another RSVP)')}
          </button>
        </div>
      </Shell>
    );
  }

  if (info && !info.open) {
    return (
      <Shell>
        {header}
        <div className="text-center py-4">
          <XCircle size={40} className="mx-auto text-stone-300 mb-3" />
          <h2 className="text-lg font-bold text-stone-700">{L('回覆已截止 (RSVP is now closed)')}</h2>
          <p className="text-sm text-stone-400 mt-2">{L('如有查詢，請直接聯絡新人。 (Please contact the couple directly for any changes.)')}</p>
        </div>
      </Shell>
    );
  }

  const field = "w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all";
  const ringStyle = { boxShadow: 'none' };

  return (
    <Shell>
      {header}
      <form onSubmit={submit} className="space-y-3">
        <input autoFocus placeholder={L('您的姓名 (Your name)')} value={form.name} onChange={e => setF({ name: e.target.value })} className={field} style={ringStyle} />

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setF({ attending: 'yes' })} className={`py-3 rounded-xl text-sm font-bold border transition-all ${form.attending === 'yes' ? 'text-white border-transparent' : 'bg-stone-50 text-stone-500 border-stone-200'}`} style={form.attending === 'yes' ? { background: ACCENT } : {}}>
            {L('出席 (Attending)')}
          </button>
          <button type="button" onClick={() => setF({ attending: 'no' })} className={`py-3 rounded-xl text-sm font-bold border transition-all ${form.attending === 'no' ? 'bg-stone-700 text-white border-transparent' : 'bg-stone-50 text-stone-500 border-stone-200'}`}>
            {L('未能出席 (Cannot attend)')}
          </button>
        </div>

        {form.attending === 'yes' && (
          <>
            <div className="flex items-center gap-3">
              <label className="text-sm text-stone-500 font-medium shrink-0">{L('出席人數 (Party size)')}</label>
              <input type="number" min="1" max="50" value={form.partySize} onChange={e => setF({ partySize: Math.max(1, Number(e.target.value) || 1) })} className={`${field} w-24`} style={ringStyle} />
            </div>
            <input placeholder={L('餐飲偏好（可選）(Meal preference, optional)')} value={form.mealChoice} onChange={e => setF({ mealChoice: e.target.value })} className={field} style={ringStyle} />
            <input placeholder={L('特殊飲食/過敏（可選）(Dietary / allergies, optional)')} value={form.dietary} onChange={e => setF({ dietary: e.target.value })} className={field} style={ringStyle} />
          </>
        )}

        <textarea rows="2" placeholder={L('給新人的祝福（可選）(A message to the couple, optional)')} value={form.message} onChange={e => setF({ message: e.target.value })} className={`${field} resize-none`} style={ringStyle} />

        {error && <p className="text-center text-rose-500 text-xs font-bold">{error}</p>}

        <button type="submit" disabled={submitting} className="w-full py-3.5 rounded-xl text-white font-bold tracking-wide shadow-lg flex justify-center items-center disabled:opacity-60" style={{ background: ACCENT }}>
          {submitting ? <Loader2 className="animate-spin" size={20} /> : L('提交回覆 (Submit RSVP)')}
        </button>
        {info?.deadline && <p className="text-center text-[11px] text-stone-400">{L('回覆截止日期 (RSVP by)')}: {info.deadline}</p>}
      </form>
    </Shell>
  );
}
