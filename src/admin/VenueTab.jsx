import React from 'react';
import {
  Monitor, Layout, Users, Mic2, Coffee, Info, Type, Cake, Tv, Video,
  Maximize, Smartphone, Sun, RotateCw, Zap, Mic, Palette, Image as ImageIcon,
  Star, Flower2, FileText, PenTool, Wind, Frame, Columns, Grid, Mail, Armchair, X, MapPin
} from 'lucide-react';
import { FormSelect, FormCheckbox } from '../components/ui';
import { DECOR_COLORS } from '../utils/vmsUtils';
import FloorplanEditor from '../components/FloorplanEditor';

const VenueTab = ({
  formData, setFormData, handleInputChange, onUploadProof, addToast,
  appSettings, events, onMultiImageUpload, DocumentVisibilityToggles
}) => {
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <Monitor size={18} className="text-blue-600" />
          <h4 className="font-bold text-slate-800">場地佈置 (Main Setup)</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><FormSelect label="檯布顏色 (Table Cloth)" name="tableClothColor" options={DECOR_COLORS} value={formData.tableClothColor} onChange={handleInputChange} /><FormSelect label="椅套顏色 (Chair Cover)" name="chairCoverColor" options={DECOR_COLORS} value={formData.chairCoverColor} onChange={handleInputChange} /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 pt-4 border-t border-slate-100">
          <div><label className="block text-sm font-medium text-slate-700 mb-1.5">主家席顏色 (Head Table Color)</label><div className="flex gap-4 mb-2"><label className="flex items-center space-x-2 text-sm cursor-pointer"><input type="radio" name="headTableColorType" value="same" checked={formData.headTableColorType === 'same'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" /><span>同客席 (Same as Guest)</span></label><label className="flex items-center space-x-2 text-sm cursor-pointer"><input type="radio" name="headTableColorType" value="custom" checked={formData.headTableColorType === 'custom'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" /><span>自訂 (Custom)</span></label></div>{formData.headTableColorType === 'custom' && (<input type="text" name="headTableCustomColor" value={formData.headTableCustomColor} onChange={handleInputChange} placeholder="請輸入主家席顏色" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />)}</div>
          <div className="bg-pink-50 p-4 rounded-lg border border-pink-100"><div className="flex justify-between items-center mb-2"><label className="font-bold text-slate-700 text-sm">新娘房 / 更衣室</label><label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="bridalRoom" checked={formData.bridalRoom} onChange={e => setFormData(prev => ({ ...prev, bridalRoom: e.target.checked }))} className="rounded text-pink-500" /><span className="text-xs text-slate-500">使用</span></label></div>{formData.bridalRoom && (<input type="text" name="bridalRoomHours" value={formData.bridalRoomHours} onChange={handleInputChange} placeholder="使用時間 e.g. 17:00 - 23:00" className="w-full px-3 py-2 border border-pink-200 rounded-lg text-sm bg-white" />)}</div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <Layout size={18} className="text-blue-600" />
          <h4 className="font-bold text-slate-800">設備與佈置清單 (Equipment & Packages)</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest border-b border-blue-200 pb-1 mb-2 flex items-center gap-1"><Users size={14} /> 舞台與接待設備</h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2"><div className="text-slate-400"><Monitor size={14} /></div><FormCheckbox label="禮堂舞台 (7.2x2.5m)" name="equipment.stage" checked={formData.equipment?.stage} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, stage: e.target.checked } }))} /></div>
              <div className="flex items-center gap-2"><div className="text-slate-400"><Mic2 size={14} /></div><FormCheckbox label="講台" name="equipment.podium" checked={formData.equipment?.podium} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, podium: e.target.checked } }))} /></div>
              <div className="flex items-center gap-2"><div className="text-slate-400"><Coffee size={14} /></div><FormCheckbox label="接待桌 (180x60cm)" name="equipment.receptionTable" checked={formData.equipment?.receptionTable} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, receptionTable: e.target.checked } }))} /></div>
              <div className="flex items-center gap-2"><div className="text-slate-400"><Info size={14} /></div><FormCheckbox label="標示牌 (2個)" name="equipment.signage" checked={formData.equipment?.signage} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, signage: e.target.checked } }))} /></div>
              <div className="flex items-center gap-2 mt-1"><div className="text-slate-400"><Type size={14} /></div><FormCheckbox label="禮堂字牌" name="equipment.nameSign" checked={formData.equipment?.nameSign} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, nameSign: e.target.checked } }))} />{formData.equipment?.nameSign && (<input className="flex-1 text-[10px] border rounded px-2 py-1 bg-white outline-none focus:border-blue-400 transition-all" placeholder="輸入字牌內容..." value={formData.nameSignText || ''} onChange={(e) => setFormData(prev => ({ ...prev, nameSignText: e.target.value }))} />)}</div>
              <div className="flex items-center gap-2 mt-1"><div className="text-slate-400"><Cake size={14} /></div><FormCheckbox label="婚宴蛋糕" name="equipment.hasCake" checked={formData.equipment?.hasCake} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, hasCake: e.target.checked } }))} />{formData.equipment?.hasCake && (<div className="flex items-center bg-white px-2 py-0.5 rounded border border-slate-200"><input type="number" className="w-10 text-xs bg-transparent text-slate-700 font-bold outline-none text-center" placeholder="0" value={formData.cakePounds || ''} onChange={(e) => setFormData(prev => ({ ...prev, cakePounds: e.target.value }))} /><span className="text-[9px] text-slate-400 font-bold ml-1">Lbs</span></div>)}</div>
            </div>
          </div>
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-widest border-b border-indigo-200 pb-1 mb-2 flex items-center gap-1"><Tv size={14} /> 影音設備 (AV)</h4>
            <div className="grid grid-cols-1 gap-1.5">
              <div className="flex items-center gap-2"><div className="text-slate-400"><Video size={14} /></div><FormCheckbox label="大禮堂投影機" name="equipment.grandHallProjector" checked={formData.equipment?.grandHallProjector} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, grandHallProjector: e.target.checked } }))} /></div>
              <div className="flex items-center gap-2"><div className="text-slate-400"><Monitor size={14} /></div><FormCheckbox label="小禮堂 LED Screen" name="equipment.smallHallLED" checked={formData.equipment?.smallHallLED} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, smallHallLED: e.target.checked } }))} /></div>
              <div className="flex items-center gap-2"><div className="text-slate-400"><Maximize size={14} /></div><FormCheckbox label="LED 顯示屏 W6.4 x H4m" name="equipment.ledScreen" checked={formData.equipment?.ledScreen} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, ledScreen: e.target.checked } }))} /></div>
              <div className="flex items-center gap-2"><div className="text-slate-400"><Smartphone size={14} className="rotate-90" /></div><FormCheckbox label="60寸電視 (直)" name="equipment.tvVertical" checked={formData.equipment?.tvVertical} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, tvVertical: e.target.checked } }))} /></div>
              <div className="flex items-center gap-2"><div className="text-slate-400"><Smartphone size={14} /></div><FormCheckbox label="60寸電視 (橫)" name="equipment.tvHorizontal" checked={formData.equipment?.tvHorizontal} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, tvHorizontal: e.target.checked } }))} /></div>
              <div className="flex items-center gap-2"><div className="text-slate-400"><Sun size={14} /></div><FormCheckbox label="聚光燈" name="equipment.spotlight" checked={formData.equipment?.spotlight} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, spotlight: e.target.checked } }))} /></div>
              <div className="flex items-center gap-2"><div className="text-slate-400"><RotateCw size={14} /></div><FormCheckbox label="電腦燈" name="equipment.movingHead" checked={formData.equipment?.movingHead} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, movingHead: e.target.checked } }))} /></div>
              <div className="flex items-center gap-2"><div className="text-slate-400"><Zap size={14} /></div><FormCheckbox label="進場燈" name="equipment.entranceLight" checked={formData.equipment?.entranceLight} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, entranceLight: e.target.checked } }))} /></div>
              <div className="flex items-center gap-2"><div className="text-slate-400"><Mic size={14} /></div><FormCheckbox label="無線麥克風 (4支)" name="equipment.wirelessMic" checked={formData.equipment?.wirelessMic} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, wirelessMic: e.target.checked } }))} /></div>
            </div>
            <input type="text" placeholder="其他 AV 補充" className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs mt-2" value={formData.avOther || ''} onChange={e => setFormData(prev => ({ ...prev, avOther: e.target.value }))} />
          </div>
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-rose-800 uppercase tracking-widest border-b border-rose-200 pb-1 mb-2 flex items-center gap-1"><Palette size={14} /> 場地佈置與細項</h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2"><div className="text-slate-400"><ImageIcon size={14} /></div><FormCheckbox label="舞台背景佈置" name="decoration.backdrop" checked={formData.decoration?.backdrop} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, backdrop: e.target.checked } }))} /></div>
              <div className="flex items-center gap-2"><div className="text-slate-400"><Star size={14} /></div><FormCheckbox label="接待處佈置" name="decoration.receptionDecor" checked={formData.decoration?.receptionDecor} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, receptionDecor: e.target.checked } }))} /></div>
              <div className="flex items-center gap-2"><div className="text-slate-400"><Flower2 size={14} /></div><FormCheckbox label="絲花擺設" name="decoration.silkFlower" checked={formData.decoration?.silkFlower} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, silkFlower: e.target.checked } }))} /></div>
              <div className="flex items-center gap-2"><div className="text-slate-400"><FileText size={14} /></div><FormCheckbox label="證婚桌" name="decoration.ceremonyTable" checked={formData.decoration?.ceremonyTable} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, ceremonyTable: e.target.checked } }))} /></div>
              <div className="flex items-center gap-2"><div className="text-slate-400"><PenTool size={14} /></div><FormCheckbox label="簽名冊" name="decoration.signingBook" checked={formData.decoration?.signingBook} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, signingBook: e.target.checked } }))} /></div>
              <div className="flex items-center gap-2"><div className="text-slate-400"><Wind size={14} /></div><FormCheckbox label="花圈" name="decoration.flowerAisle" checked={formData.decoration?.flowerAisle} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, flowerAisle: e.target.checked } }))} /></div>
              <div className="flex items-center gap-2"><div className="text-slate-400"><Frame size={14} /></div><FormCheckbox label="畫架" name="decoration.easel" checked={formData.decoration?.easel} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, easel: e.target.checked } }))} /></div>
              <div className="flex items-center gap-2 mt-1"><div className="text-slate-400"><Columns size={14} /></div><FormCheckbox label="花柱佈置" name="decoration.hasFlowerPillar" checked={formData.decoration?.hasFlowerPillar} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, hasFlowerPillar: e.target.checked } }))} />{formData.decoration?.hasFlowerPillar && (<div className="flex items-center bg-white px-2 py-0.5 rounded border border-slate-200"><input type="number" className="w-8 text-xs bg-transparent text-slate-700 font-bold outline-none text-center" value={formData.flowerPillarQty || ''} onChange={(e) => setFormData(prev => ({ ...prev, flowerPillarQty: e.target.value }))} /><span className="text-[9px] text-slate-400 font-bold ml-1">支</span></div>)}</div>
              <div className="flex items-center gap-2 mt-1"><div className="text-slate-400"><Grid size={14} /></div><FormCheckbox label="麻雀枱" name="decoration.hasMahjong" checked={formData.decoration?.hasMahjong} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, hasMahjong: e.target.checked } }))} />{formData.decoration?.hasMahjong && (<div className="flex items-center bg-white px-2 py-0.5 rounded border border-slate-200"><input type="number" className="w-8 text-xs bg-transparent text-slate-700 font-bold outline-none text-center" value={formData.mahjongTableQty || ''} onChange={(e) => setFormData(prev => ({ ...prev, mahjongTableQty: e.target.value }))} /><span className="text-[9px] text-slate-400 font-bold ml-1">張</span></div>)}</div>
              <div className="flex items-center gap-2 mt-1"><div className="text-slate-400"><Mail size={14} /></div><FormCheckbox label="喜帖" name="decoration.hasInvitation" checked={formData.decoration?.hasInvitation} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, hasInvitation: e.target.checked } }))} />{formData.decoration?.hasInvitation && (<div className="flex items-center bg-white px-2 py-0.5 rounded border border-slate-200"><input type="number" className="w-8 text-xs bg-transparent text-slate-700 font-bold outline-none text-center" value={formData.invitationQty || ''} onChange={(e) => setFormData(prev => ({ ...prev, invitationQty: e.target.value }))} /><span className="text-[9px] text-slate-400 font-bold ml-1">套</span></div>)}</div>
              <div className="flex items-center gap-2 mt-1"><div className="text-slate-400"><Armchair size={14} /></div><FormCheckbox label="證婚椅子" name="decoration.hasCeremonyChair" checked={formData.decoration?.hasCeremonyChair} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, hasCeremonyChair: e.target.checked } }))} />{formData.decoration?.hasCeremonyChair && (<div className="flex items-center bg-white px-2 py-0.5 rounded border border-slate-200"><input type="number" className="w-8 text-xs bg-transparent text-slate-700 font-bold outline-none text-center" value={formData.ceremonyChairQty || ''} onChange={(e) => setFormData(prev => ({ ...prev, ceremonyChairQty: e.target.value }))} /><span className="text-[9px] text-slate-400 font-bold ml-1">張</span></div>)}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <MapPin size={18} className="text-blue-600" />
          <h4 className="font-bold text-slate-800">互動平面圖 (Interactive Floorplan)</h4>
        </div>
        <FloorplanEditor 
          formData={formData} 
          setFormData={setFormData} 
          onUploadProof={onUploadProof} 
          addToast={addToast} 
          defaultBgImage={appSettings?.defaultFloorplan?.bgImage} 
          defaultItemScale={appSettings?.defaultFloorplan?.itemScale} 
          defaultZones={appSettings?.defaultFloorplan?.zones}
          events={events}
        />
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <ImageIcon size={18} className="text-blue-600" />
          <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
            佈置參考圖與備註 (Decor References & Notes)
            <Info size={16} className="text-blue-400 cursor-help hover:text-blue-600 transition-colors" title="顯示於 (Displayed in):&#10;• 內部單據 (Internal EO, Briefing)&#10;• 客戶合約 (Contract) - 若勾選" />
          </h4>
        </div>
        <textarea rows={2} placeholder="文字描述 (Description)..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-none mb-1" value={formData.venueDecor || ''} onChange={(e) => setFormData(prev => ({ ...prev, venueDecor: e.target.value }))} />
        <DocumentVisibilityToggles field="venueDecor" defaultClient={false} defaultInternal={true} />
        <div className="flex flex-wrap gap-3 mt-3">
          {(formData.venueDecorPhotos || []).map((url, idx) => (<div key={idx} className="relative w-24 h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group"><a href={url} target="_blank" rel="noreferrer" className="block w-full h-full cursor-zoom-in" title="點擊放大"><img src={url} alt="Venue Decor" className="w-full h-full object-cover" /></a><button type="button" onClick={() => setFormData(prev => ({ ...prev, venueDecorPhotos: prev.venueDecorPhotos.filter((_, i) => i !== idx) }))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"><X size={12} /></button></div>))}
          <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-colors"><ImageIcon size={20} className="mb-1" /><span className="text-[10px] font-bold">新增照片 (多選)</span><input type="file" multiple className="hidden" accept="image/*" onChange={(e) => onMultiImageUpload(e.target.files, 'venueDecorPhotos')} /></label>
        </div>
      </div>
    </div>
  );
};

export default VenueTab;