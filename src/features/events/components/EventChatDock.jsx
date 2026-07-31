import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { useAuth } from '../../../context/AuthContext';
import { useLang } from '../../../i18n/language';
import { MessageCircle, ChevronDown } from 'lucide-react';
import MessagesTab from './MessagesTab';

// Floating chat dock for the event editor. Portals to document.body so it stays mounted
// and usable on EVERY tab of the form (switching tabs never wipes an in-progress draft).
// Only shown once the event is saved (needs an eventId to have a thread). A live unread
// badge lights up the bubble when a client replies while you're editing.
const EventChatDock = ({ eventId, clientEmail, clientPhone, eventData, appSettings, clientName }) => {
  const { appId } = useAuth();
  const { L } = useLang();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!eventId || !appId) return;
    const ref = doc(db, 'artifacts', appId, 'private', 'data', 'events', eventId);
    const unsub = onSnapshot(ref, s => setUnread(s.data()?.unreadForStaff || 0), () => {});
    return () => unsub();
  }, [eventId, appId]);

  if (!eventId) return null;

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[80] flex flex-col items-end gap-3 print:hidden">
      {open && (
        <div className="w-[calc(100vw-3rem)] sm:w-[404px] h-[72vh] max-h-[620px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shrink-0">
            <div className="min-w-0">
              <p className="font-bold text-sm truncate flex items-center gap-1.5"><MessageCircle size={14} /> {clientName || L('對話 (Messages)')}</p>
              {(clientEmail || clientPhone) && <p className="text-[11px] text-indigo-100 truncate">{clientEmail || clientPhone}</p>}
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-indigo-100 hover:text-white shrink-0 ml-2" title={L('收起 (Minimise)')}><ChevronDown size={20} /></button>
          </div>
          <div className="flex-1 min-h-0 p-2 bg-slate-50">
            <MessagesTab eventId={eventId} clientEmail={clientEmail} clientPhone={clientPhone} eventData={eventData} appSettings={appSettings} heightClass="h-full" />
          </div>
        </div>
      )}
      <button type="button" onClick={() => setOpen(o => !o)} className="relative w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95" title={L('對話 (Messages)')}>
        {open ? <ChevronDown size={24} /> : <MessageCircle size={24} />}
        {!open && unread > 0 && <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] px-1 flex items-center justify-center ring-2 ring-white">{unread}</span>}
      </button>
    </div>,
    document.body
  );
};

export default EventChatDock;
