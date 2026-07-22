import React from 'react';
import { Plus, Trash2, Clock } from 'lucide-react';
import { FormTextArea } from '../../../components/ui';
import { useLang } from '../../../i18n/language';
import { useAuth } from '../../../context/AuthContext';

const fmtTs = (ts, lang) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString(lang === 'zh' ? 'zh-HK' : 'en-GB', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const InternalNotesTab = ({ formData, setFormData, handleInputChange, DocumentVisibilityToggles }) => {
  const { L, lang } = useLang();
  const { userProfile } = useAuth();
  const notes = formData.noteLog || [];

  const addNote = () => setFormData(prev => ({
    ...prev,
    noteLog: [
      { id: Date.now(), text: '', author: userProfile?.displayName || L('職員 (Staff)'), ts: new Date().toISOString() },
      ...(prev.noteLog || [])
    ]
  }));
  const updateNote = (id, text) => setFormData(prev => ({
    ...prev,
    noteLog: (prev.noteLog || []).map(n => n.id === id ? { ...n, text } : n)
  }));
  const deleteNote = (id) => setFormData(prev => ({
    ...prev,
    noteLog: (prev.noteLog || []).filter(n => n.id !== id)
  }));

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-2 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <span className="font-black text-xs">LOG</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-800">{L('內部操作備註 (Internal Remarks)')}</h3>
              <p className="text-xs text-slate-500 italic">{L('僅限內部人員查看，不會顯示於客戶文件。 (Internal staff only — not shown on client documents.)')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={addNote}
            className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 font-bold transition-colors shrink-0 shadow-sm"
          >
            <Plus size={14} /> {L('新增備註 (Add Note)')}
          </button>
        </div>

        {notes.length === 0 && !(formData.remarks || '').trim() && (
          <p className="text-sm text-slate-400 italic text-center py-6">{L('尚無內部備註，按「新增備註」開始記錄。 (No internal notes yet — click "Add Note" to start.)')}</p>
        )}

        <div className="space-y-3">
          {notes.map(n => (
            <div key={n.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <Clock size={11} /> {fmtTs(n.ts, lang)}{n.author ? <span className="text-slate-500 normal-case"> · {n.author}</span> : null}
                </div>
                <button type="button" onClick={() => deleteNote(n.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
              <textarea
                value={n.text}
                onChange={e => updateNote(n.id, e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all resize-y"
                placeholder={L('輸入備註內容... (Enter note...)')}
              />
            </div>
          ))}

          {/* Legacy single-field remarks (preserved read-only so nothing is lost) */}
          {(formData.remarks || '').trim() && (
            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3">
              <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">{L('先前備註 (Earlier Note)')}</div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{formData.remarks}</p>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100">
          <FormTextArea
            label={L('通用備註 (General Remarks - Shown on EO)')}
            name="generalRemarks"
            rows={6}
            value={formData.generalRemarks}
            onChange={handleInputChange}
            placeholder={L('在此輸入會顯示在確認單上的通用條款或提醒... (Enter general terms or reminders that will appear on the confirmation here...)')}
          />
          <DocumentVisibilityToggles
            field="generalRemarks"
            defaultClient={true}
            defaultInternal={true}
            clientDocs={L('報價單、合約、附加協議 (Quotation, Contract, Addendum)')}
            internalDocs={L('宴會通知單、管理備註 (EO, Admin Notes)')}
          />
        </div>
      </div>
    </div>
  );
};

export default InternalNotesTab;
