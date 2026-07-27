import React from 'react';
import { Users, Plus, X } from 'lucide-react';
import { useLang } from '../../../i18n/language';

const SIDES = [
  { v: '', zh: '男/女家', en: 'Side' },
  { v: 'groom', zh: '男家', en: 'Groom' },
  { v: 'bride', zh: '女家', en: 'Bride' },
  { v: 'shared', zh: '共同', en: 'Shared' },
];
const RSVPS = [
  { v: 'pending', zh: '待回覆', en: 'Pending' },
  { v: 'yes', zh: '出席', en: 'Attending' },
  { v: 'no', zh: '缺席', en: 'Declined' },
  { v: 'maybe', zh: '未定', en: 'Maybe' },
];

// Admin-side guest list. Edits formData.guests directly; the form's Save persists it.
// Same data shape as the client portal's Guests tab, so both stay in sync.
const GuestsTab = ({ formData, setFormData }) => {
  const { L } = useLang();
  const guests = formData.guests || [];
  const setGuests = (updater) => setFormData(prev => ({ ...prev, guests: typeof updater === 'function' ? updater(prev.guests || []) : updater }));
  const pax = (pred) => guests.filter(pred).reduce((n, g) => n + (Number(g.partySize) || 1), 0);
  const stats = {
    parties: guests.length,
    invited: pax(() => true),
    confirmed: pax(g => g.rsvp === 'yes'),
    declined: pax(g => g.rsvp === 'no'),
    pending: pax(g => !g.rsvp || g.rsvp === 'pending' || g.rsvp === 'maybe'),
  };
  const update = (idx, patch) => setGuests(prev => prev.map((g, i) => i === idx ? { ...g, ...patch } : g));
  const addGuest = () => setGuests(prev => [...prev, { id: Date.now().toString() + Math.random().toString(36).slice(2, 7), name: '', side: '', relation: '', partySize: 1, rsvp: 'pending', dietary: '' }]);

  const cards = [
    { n: stats.confirmed, label: L('已確認 (Confirmed)'), c: 'text-emerald-600' },
    { n: stats.invited, label: L('已邀請 (Invited)'), c: 'text-slate-700' },
    { n: stats.pending, label: L('待回覆 (Pending)'), c: 'text-amber-500' },
    { n: stats.declined, label: L('婉拒 (Declined)'), c: 'text-rose-400' },
  ];

  return (
    <div className="space-y-5 animate-in fade-in">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 text-center">
            <p className={`text-3xl font-black font-mono ${c.c}`}>{c.n}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold text-slate-800 flex items-center gap-2"><Users size={16} /> {L('賓客名單 (Guest List)')} <span className="text-xs font-normal text-slate-400">({stats.parties})</span></h4>
        </div>
        <div className="space-y-2">
          {guests.length === 0 && <p className="text-center text-slate-400 italic text-sm py-4">{L('尚未新增賓客 (No guests yet)')}</p>}
          {guests.map((g, idx) => (
            <div key={g.id || idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex gap-2 items-center">
                <input value={g.name || ''} onChange={e => update(idx, { name: e.target.value })} placeholder={L('賓客姓名 (Guest name)')} className="flex-1 p-2 border border-slate-200 rounded bg-white text-sm focus:border-indigo-500 outline-none" />
                <button type="button" onClick={() => setGuests(prev => prev.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 p-1"><X size={16} /></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <select value={g.side || ''} onChange={e => update(idx, { side: e.target.value })} className="p-2 border border-slate-200 rounded bg-white text-xs focus:border-indigo-500 outline-none">
                  {SIDES.map(s => <option key={s.v} value={s.v}>{L(`${s.zh} (${s.en})`)}</option>)}
                </select>
                <input value={g.relation || ''} onChange={e => update(idx, { relation: e.target.value })} placeholder={L('關係/組別 (Group)')} className="p-2 border border-slate-200 rounded bg-white text-xs focus:border-indigo-500 outline-none" />
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 shrink-0">{L('人數 (Pax)')}</span>
                  <input type="number" min="1" value={g.partySize ?? 1} onChange={e => update(idx, { partySize: Math.max(1, Number(e.target.value) || 1) })} className="w-full p-2 border border-slate-200 rounded bg-white text-xs focus:border-indigo-500 outline-none" />
                </div>
                <select value={g.rsvp || 'pending'} onChange={e => update(idx, { rsvp: e.target.value })} className="p-2 border border-slate-200 rounded bg-white text-xs focus:border-indigo-500 outline-none">
                  {RSVPS.map(s => <option key={s.v} value={s.v}>{L(`${s.zh} (${s.en})`)}</option>)}
                </select>
              </div>
              <input value={g.dietary || ''} onChange={e => update(idx, { dietary: e.target.value })} placeholder={L('特殊餐飲/過敏 (Dietary / allergies)')} className="w-full p-2 border border-slate-200 rounded bg-white text-xs focus:border-indigo-500 outline-none" />
            </div>
          ))}
          <button type="button" onClick={addGuest} className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-200 transition-colors flex items-center justify-center mt-2">
            <Plus size={14} className="mr-1" /> {L('新增賓客 (Add Guest)')}
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-3">{L('賓客名單與客戶門戶同步；儲存活動即會套用。 (Synced with the client portal; saving the event applies changes.)')}</p>
      </div>
    </div>
  );
};

export default GuestsTab;
