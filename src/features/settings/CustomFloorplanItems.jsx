import React, { useState } from 'react';
import { Plus, Trash2, Save, Shapes } from 'lucide-react';
import { Card } from '../../components/ui';
import { CUSTOM_SHAPE_OPTIONS, CUSTOM_COLOR_OPTIONS, buildCustomToolItem } from '../../components/FloorplanTools';
import { useLang } from '../../i18n/language';

// Manage tenant-defined floorplan items (custom shape + size). Saved to
// appSettings.customFloorplanItems (per venue); the event floorplan palette
// picks them up automatically.
const CustomFloorplanItems = ({ items, onSave, addToast }) => {
  const { L } = useLang();
  const [list, setList] = useState(items || []);
  const [dirty, setDirty] = useState(false);

  const update = (next) => { setList(next); setDirty(true); };
  const add = () => update([...list, { type: `custom_${Date.now()}`, label: '', w_m: 1, h_m: 1, shape: 'rect', color: 'slate', text: '' }]);
  const edit = (i, field, val) => update(list.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  const remove = (i) => update(list.filter((_, idx) => idx !== i));
  const save = () => {
    onSave(list.filter(it => (it.label || '').trim()));
    setDirty(false);
    addToast(L('自訂項目已儲存 (Custom items saved)'), 'success');
  };

  return (
    <Card className="p-6 border-l-4 border-l-violet-500">
      <div className="flex items-center justify-between mb-2 gap-3">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Shapes className="text-violet-600" size={18} /> {L('自訂平面圖項目 (Custom Floorplan Items)')}</h3>
        <div className="flex gap-2 shrink-0">
          {dirty && <button onClick={save} className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors"><Save size={14} /> {L('儲存 (Save)')}</button>}
          <button onClick={add} className="flex items-center gap-1 text-xs bg-violet-50 text-violet-700 px-3 py-1.5 rounded-lg font-bold hover:bg-violet-100 transition-colors"><Plus size={14} /> {L('新增項目 (Add Item)')}</button>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 mb-4">{L('自訂形狀與尺寸（米），會出現在活動平面圖的工具列。 (Define custom shapes and sizes in metres; they appear in the event floorplan palette.)')}</p>

      {list.length === 0 ? (
        <p className="text-sm text-slate-400 italic text-center py-4">{L('尚無自訂項目 (No custom items yet)')}</p>
      ) : (
        <div className="space-y-3">
          {list.map((it, i) => {
            const preview = buildCustomToolItem(it);
            return (
              <div key={it.type} className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className={`${preview.style} shrink-0`} style={{ width: Math.min((Number(it.w_m) || 1) * 22, 52), height: Math.min((Number(it.h_m) || 1) * 22, 52) }}>{it.text}</div>
                <input value={it.label} onChange={e => edit(i, 'label', e.target.value)} placeholder={L('名稱 (Name)')} className="flex-1 min-w-[120px] px-2 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-indigo-400" />
                <input value={it.text} onChange={e => edit(i, 'text', e.target.value)} placeholder={L('文字 (Label text)')} className="w-24 px-2 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-indigo-400" />
                <div className="flex items-center gap-1"><input type="number" step="0.1" min="0.1" value={it.w_m} onChange={e => edit(i, 'w_m', e.target.value)} className="w-14 px-2 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-indigo-400" /><span className="text-[9px] text-slate-400 font-bold">{L('闊 W(m)')}</span></div>
                <div className="flex items-center gap-1"><input type="number" step="0.1" min="0.1" value={it.h_m} onChange={e => edit(i, 'h_m', e.target.value)} className="w-14 px-2 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-indigo-400" /><span className="text-[9px] text-slate-400 font-bold">{L('高 H(m)')}</span></div>
                <select value={it.shape} onChange={e => edit(i, 'shape', e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded text-xs outline-none bg-white">{CUSTOM_SHAPE_OPTIONS.map(s => <option key={s.id} value={s.id}>{L(s.label)}</option>)}</select>
                <select value={it.color} onChange={e => edit(i, 'color', e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded text-xs outline-none bg-white">{CUSTOM_COLOR_OPTIONS.map(c => <option key={c.id} value={c.id}>{L(c.label)}</option>)}</select>
                <button onClick={() => remove(i)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0"><Trash2 size={16} /></button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default CustomFloorplanItems;
