import React, { useState } from 'react';
import { Plus, Trash2, Save, Layout } from 'lucide-react';
import { Card } from '../../components/ui';
import { useLang } from '../../i18n/language';

const GROUPS = [
  { key: 'setup', label: '舞台與接待設備 (Stage & Reception)' },
  { key: 'av', label: '影音設備 (AV Equipment)' },
  { key: 'decor', label: '場地佈置與細項 (Decoration & Details)' },
];

// Manage the configurable Setup / AV / Decoration checkbox options (per venue).
// `options` is the merged { setup, av, decor } list; onSave receives the edited lists.
const ItemOptionsTab = ({ options, onSave, addToast }) => {
  const { L } = useLang();
  const [opts, setOpts] = useState({
    setup: [...(options.setup || [])],
    av: [...(options.av || [])],
    decor: [...(options.decor || [])],
  });
  const [dirty, setDirty] = useState(false);

  const update = (g, next) => { setOpts(p => ({ ...p, [g]: next })); setDirty(true); };
  const addItem = (g) => update(g, [...(opts[g] || []), { key: `custom_${Date.now()}`, label: '' }]);
  const setLabel = (g, i, label) => update(g, opts[g].map((o, idx) => idx === i ? { ...o, label } : o));
  const removeItem = (g, i) => update(g, opts[g].filter((_, idx) => idx !== i));

  const save = () => {
    const cleaned = {};
    GROUPS.forEach(gr => { cleaned[gr.key] = (opts[gr.key] || []).filter(o => (o.label || '').trim()); });
    onSave(cleaned);
    setDirty(false);
    addToast(L('選項已儲存 (Options saved)'), 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Layout className="text-indigo-600" size={22} /> {L('設備與佈置選項 (Setup / AV / Decor Options)')}
          </h2>
          <p className="text-sm text-slate-500">{L('管理活動表格中的勾選項目。格式：中文 (English)。 (Manage the checkbox items shown in the event form. Use the format 中文 (English).)')}</p>
        </div>
        {dirty && (
          <button onClick={save} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 active:scale-95 transition-all shrink-0">
            <Save size={18} /> {L('儲存變更 (Save Changes)')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {GROUPS.map(gr => (
          <Card key={gr.key} className="p-5 border-t-4 border-t-indigo-500 h-fit">
            <h3 className="font-black text-slate-800 mb-4">{L(gr.label)}</h3>
            <div className="space-y-2">
              {(opts[gr.key] || []).map((o, i) => (
                <div key={o.key || i} className="flex items-center gap-2">
                  <input
                    value={o.label}
                    onChange={e => setLabel(gr.key, i, e.target.value)}
                    placeholder="中文 (English)"
                    className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                  />
                  {(o.qtyField || o.noteField) && (
                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-1 shrink-0" title={L('此項目含數量／文字輸入 (Has a quantity/text input)')}>
                      {o.qtyField ? '#' : 'T'}
                    </span>
                  )}
                  <button type="button" onClick={() => removeItem(gr.key, i)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0"><Trash2 size={16} /></button>
                </div>
              ))}
              {(opts[gr.key] || []).length === 0 && <p className="text-xs text-slate-400 italic py-2">{L('沒有選項 (No options)')}</p>}
            </div>
            <button
              type="button"
              onClick={() => addItem(gr.key)}
              className="mt-3 w-full flex items-center justify-center gap-1 py-2 text-xs font-bold text-indigo-600 border border-dashed border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <Plus size={14} /> {L('新增選項 (Add Option)')}
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ItemOptionsTab;
