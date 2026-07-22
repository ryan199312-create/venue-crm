import React from 'react';
import { Monitor, Layout, Users, Info, Tv, Palette, Image as ImageIcon, X, MapPin } from 'lucide-react';
import { FormSelect, FormCheckbox } from '../../components/ui';
import { DECOR_COLORS } from '../../services/billingService';
import { getItemOptions } from '../../core/constants';
import FloorplanEditor from '../../components/FloorplanEditor';
import { useLang } from '../../i18n/language';

const VenueTab = ({
  formData, setFormData, handleInputChange, onUploadProof, addToast,
  appSettings, events, onMultiImageUpload, DocumentVisibilityToggles
}) => {
  const { L } = useLang();
  const itemOptions = getItemOptions(appSettings);

  // Render one configurable option: checkbox + optional note / quantity input.
  // `bucket` is the event-data object the option's key lives in ('equipment' or 'decoration').
  const renderOption = (o, bucket) => {
    const checked = !!formData[bucket]?.[o.key];
    const toggle = (v) => setFormData(prev => ({ ...prev, [bucket]: { ...(prev[bucket] || {}), [o.key]: v } }));
    return (
      <div key={o.key} className="flex items-center gap-2">
        <FormCheckbox label={L(o.label)} name={`${bucket}.${o.key}`} checked={checked} onChange={(e) => toggle(e.target.checked)} />
        {o.noteField && checked && (
          <input
            className="flex-1 min-w-0 text-[10px] border rounded px-2 py-1 bg-white outline-none focus:border-indigo-400 transition-all"
            placeholder={L(o.notePlaceholder || '') + '...'}
            value={formData[o.noteField] || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, [o.noteField]: e.target.value }))}
          />
        )}
        {o.qtyField && checked && (
          <div className="flex items-center bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
            <input
              type="number"
              className="w-10 text-xs bg-transparent text-slate-700 font-bold outline-none text-center"
              placeholder="0"
              value={formData[o.qtyField] || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, [o.qtyField]: e.target.value }))}
            />
            <span className="text-[9px] text-slate-400 font-bold ml-1">{L(o.qtyUnit || '')}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <Monitor size={18} className="text-indigo-600" />
          <h4 className="font-bold text-slate-800">{L('場地佈置 (Main Setup)')}</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormSelect
            label={L('檯布顏色 (Table Cloth)')}
            name="tableClothColor"
            options={DECOR_COLORS}
            value={formData.tableClothColor}
            onChange={handleInputChange}
          />
          <FormSelect
            label={L('椅套顏色 (Chair Cover)')}
            name="chairCoverColor"
            options={DECOR_COLORS}
            value={formData.chairCoverColor}
            onChange={handleInputChange}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{L('主家席顏色 (Head Table Color)')}</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center space-x-2 text-sm cursor-pointer">
                <input 
                  type="radio" 
                  name="headTableColorType" 
                  value="same" 
                  checked={formData.headTableColorType === 'same'} 
                  onChange={handleInputChange} 
                  className="text-indigo-600 focus:ring-indigo-500" 
                />
                <span>{L('同客席 (Same as Guest)')}</span>
              </label>
              <label className="flex items-center space-x-2 text-sm cursor-pointer">
                <input 
                  type="radio" 
                  name="headTableColorType" 
                  value="custom" 
                  checked={formData.headTableColorType === 'custom'} 
                  onChange={handleInputChange} 
                  className="text-indigo-600 focus:ring-indigo-500" 
                />
                <span>{L('自訂 (Custom)')}</span>
              </label>
            </div>
            {formData.headTableColorType === 'custom' && (
              <input 
                type="text" 
                name="headTableCustomColor" 
                value={formData.headTableCustomColor} 
                onChange={handleInputChange} 
                placeholder={L('請輸入主家席顏色 (Enter head table color)')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
              />
            )}
          </div>
          <div className="bg-pink-50 p-4 rounded-lg border border-pink-100">
            <div className="flex justify-between items-center mb-2">
              <label className="font-bold text-slate-700 text-sm">{L('新娘房 / 更衣室 (Bridal Room / Changing Room)')}</label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  name="bridalRoom" 
                  checked={formData.bridalRoom} 
                  onChange={e => setFormData(prev => ({ ...prev, bridalRoom: e.target.checked }))} 
                  className="rounded text-pink-500" 
                />
                <span className="text-xs text-slate-500">{L('使用 (Enable)')}</span>
              </label>
            </div>
            {formData.bridalRoom && (
              <input 
                type="text" 
                name="bridalRoomHours" 
                value={formData.bridalRoomHours} 
                onChange={handleInputChange} 
                placeholder={L('使用時間 (Usage time)') + ' e.g. 17:00 - 23:00'}
                className="w-full px-3 py-2 border border-pink-200 rounded-lg text-sm bg-white" 
              />
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <Layout size={18} className="text-indigo-600" />
          <h4 className="font-bold text-slate-800">{L('設備與佈置清單 (Equipment & Packages)')}</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-widest border-b border-indigo-200 pb-1 mb-2 flex items-center gap-1"><Users size={14} /> {L('舞台與接待設備 (Stage & Reception)')}</h4>
            <div className="grid grid-cols-1 gap-2">
              {itemOptions.setup.map(o => renderOption(o, 'equipment'))}
            </div>
          </div>
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-widest border-b border-indigo-200 pb-1 mb-2 flex items-center gap-1"><Tv size={14} /> {L('影音設備 (AV)')}</h4>
            <div className="grid grid-cols-1 gap-1.5">
              {itemOptions.av.map(o => renderOption(o, 'equipment'))}
            </div>
            <input type="text" placeholder={L('其他 AV 補充 (Other AV notes)')} className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs mt-2" value={formData.avOther || ''} onChange={e => setFormData(prev => ({ ...prev, avOther: e.target.value }))} />
          </div>
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-rose-800 uppercase tracking-widest border-b border-rose-200 pb-1 mb-2 flex items-center gap-1"><Palette size={14} /> {L('場地佈置與細項 (Decoration & Details)')}</h4>
            <div className="grid grid-cols-1 gap-2">
              {itemOptions.decor.map(o => renderOption(o, 'decoration'))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <MapPin size={18} className="text-indigo-600" />
          <h4 className="font-bold text-slate-800">{L('互動平面圖 (Interactive Floorplan)')}</h4>
        </div>
        <FloorplanEditor 
          formData={formData} 
          setFormData={setFormData} 
          onUploadProof={onUploadProof} 
          addToast={addToast} 
          defaultBgImage={formData.venueId ? appSettings?.defaultFloorplan?.bgImage : undefined} 
          defaultItemScale={formData.venueId ? appSettings?.defaultFloorplan?.itemScale : undefined} 
          defaultZones={formData.venueId ? appSettings?.zonesConfig : []}
          events={events}
          liteMode={true}
        />
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <ImageIcon size={18} className="text-indigo-600" />
          <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
            {L('佈置參考圖與備註 (Decor References & Notes)')}
            <Info size={16} className="text-indigo-400 cursor-help hover:text-indigo-600 transition-colors" title={L('顯示於 (Displayed in)') + ':\n' + L('• 內部單據 (Internal EO, Briefing)') + '\n' + L('• 客戶合約 (Contract)') + ' - ' + L('若勾選 (if checked)')} />
          </h4>
        </div>
        <textarea rows={2} placeholder={L('文字描述 (Description)') + '...'} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-none mb-1" value={formData.venueDecor || ''} onChange={(e) => setFormData(prev => ({ ...prev, venueDecor: e.target.value }))} />
        <DocumentVisibilityToggles 
          field="venueDecor" 
          defaultClient={false} 
          defaultInternal={true} 
          clientDocs={L('合約、附加協議 (Contract, Addendum)')}
          internalDocs={L('宴會通知單 (EO)')}
        />
        <div className="flex flex-wrap gap-3 mt-3">
          {(formData.venueDecorPhotos || []).map((url, idx) => (<div key={idx} className="relative w-24 h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group"><a href={url} target="_blank" rel="noreferrer" className="block w-full h-full cursor-zoom-in" title={L('點擊放大 (Click to enlarge)')}><img src={url} alt="Venue Decor" className="w-full h-full object-cover" /></a><button type="button" onClick={() => setFormData(prev => ({ ...prev, venueDecorPhotos: prev.venueDecorPhotos.filter((_, i) => i !== idx) }))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"><X size={12} /></button></div>))}
          <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors"><ImageIcon size={20} className="mb-1" /><span className="text-[10px] font-bold">{L('新增照片 (Add Photos)')}</span><input type="file" multiple className="hidden" accept="image/*" onChange={(e) => onMultiImageUpload(e.target.files, 'venueDecorPhotos')} /></label>
        </div>
      </div>
    </div>
  );
};

export default VenueTab;
