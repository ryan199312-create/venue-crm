import React from 'react';
import { Clock, Truck, Trash2, Plus, MapPin, Info, PenTool } from 'lucide-react';
import { FormTextArea } from '../../../components/ui';

const LogisticsTab = ({ formData, setFormData, handleInputChange, DocumentVisibilityToggles }) => {
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-blue-600" />
            <h4 className="font-bold text-slate-800">活動流程 (Event Rundown)</h4>
          </div>
          <button type="button" onClick={() => setFormData(prev => ({ ...prev, rundown: [...(prev.rundown || []), { id: Date.now(), time: '18:30', activity: '' }] }))} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-bold shadow-sm">+ 新增流程</button>
        </div>
        <div className="space-y-2">
          {(!formData.rundown || formData.rundown.length === 0) && (<div className="text-center py-4 bg-slate-50 border border-slate-100 rounded-lg"><p className="text-sm text-slate-400 font-medium">暫無流程 (No Rundown)</p><p className="text-xs text-slate-400 mt-1">點擊上方按鈕新增活動流程</p></div>)}
          {(formData.rundown || []).map((item, idx) => (
            <div key={item.id} className="flex gap-3 items-center group">
              <input type="text" value={item.time} placeholder="18:30" maxLength={5} onChange={e => { const newList = [...formData.rundown]; newList[idx].time = e.target.value; setFormData(prev => ({ ...prev, rundown: newList })); }} className="w-20 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500 text-center font-mono placeholder:text-slate-300" />
              <input type="text" value={item.activity} placeholder="活動內容 (Activity)..." onChange={e => { const newList = [...formData.rundown]; newList[idx].activity = e.target.value; setFormData(prev => ({ ...prev, rundown: newList })); }} className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500" />
              <button type="button" onClick={() => setFormData(prev => ({ ...prev, rundown: prev.rundown.filter((_, i) => i !== idx) }))} className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-blue-600" />
            <h4 className="font-bold text-slate-800">旅遊巴安排 (Bus Arrangement)</h4>
          </div>
          <label className="flex items-center space-x-2 text-xs cursor-pointer select-none"><input type="checkbox" checked={formData.busInfo?.enabled || false} onChange={e => setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, enabled: e.target.checked, arrivals: prev.busInfo?.arrivals || [], departures: prev.busInfo?.departures || [] } }))} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" /><span className={formData.busInfo?.enabled ? "font-bold text-blue-600" : "text-slate-400"}>啟用 (Enable)</span></label>
        </div>
        {formData.busInfo?.enabled && (
          <div className="space-y-6 animate-in slide-in-from-top-2">
            <div>
              <div className="flex justify-between items-center mb-2"><span className="text-sm font-bold text-slate-700">接載 (Arrival): 出發地 {'>'} 璟瓏軒</span><button type="button" onClick={() => setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, arrivals: [...(prev.busInfo.arrivals || []), { id: Date.now(), time: '18:00', location: '', plate: '', price: '' }] } }))} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-bold">+ 新增接載</button></div>
              <div className="space-y-2">
                {(!formData.busInfo.arrivals || formData.busInfo.arrivals.length === 0) && (<p className="text-sm text-slate-400 italic py-1">暫無接載安排</p>)}
                {(formData.busInfo.arrivals || []).map((bus, idx) => (
                  <div key={bus.id} className="flex gap-3 items-center group">
                    <input type="text" value={bus.time} placeholder="18:00" maxLength={5} onChange={e => { const newList = [...formData.busInfo.arrivals]; newList[idx].time = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, arrivals: newList } })); }} className="w-20 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500 text-center font-mono placeholder:text-slate-300" />
                    <input type="text" value={bus.location} placeholder="接載地址 (Location)..." onChange={e => { const newList = [...formData.busInfo.arrivals]; newList[idx].location = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, arrivals: newList } })); }} className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500" />
                    <input type="text" value={bus.plate} placeholder="車牌 (Plate)" onChange={e => { const newList = [...formData.busInfo.arrivals]; newList[idx].plate = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, arrivals: newList } })); }} className="w-24 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500 placeholder:text-slate-300" />
                    <div className="flex items-center w-24 border border-slate-300 rounded px-2 py-1 bg-white focus-within:border-blue-500 overflow-hidden"><span className="text-slate-400 text-xs mr-1">$</span><input type="number" value={bus.price} placeholder="0" onChange={e => { const newList = [...formData.busInfo.arrivals]; newList[idx].price = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, arrivals: newList } })); }} className="w-full text-sm outline-none font-mono bg-transparent" /></div>
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, arrivals: prev.busInfo.arrivals.filter((_, i) => i !== idx) } }))} className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <div className="flex justify-between items-center mb-2"><span className="text-sm font-bold text-slate-700">散席 (Departure): 璟瓏軒 {'>'} 目的地</span><button type="button" onClick={() => setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, departures: [...(prev.busInfo.departures || []), { id: Date.now(), time: '22:30', location: '', plate: '', price: '' }] } }))} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-bold">+ 新增散席</button></div>
              <div className="space-y-2">
                {(!formData.busInfo.departures || formData.busInfo.departures.length === 0) && (<p className="text-sm text-slate-400 italic py-1">暫無散席安排</p>)}
                {(formData.busInfo.departures || []).map((bus, idx) => (
                  <div key={bus.id} className="flex gap-3 items-center group">
                    <input type="text" value={bus.time} placeholder="22:30" maxLength={5} onChange={e => { const newList = [...formData.busInfo.departures]; newList[idx].time = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, departures: newList } })); }} className="w-20 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500 text-center font-mono placeholder:text-slate-300" />
                    <input type="text" value={bus.location} placeholder="散席地址 (Location)..." onChange={e => { const newList = [...formData.busInfo.departures]; newList[idx].location = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, departures: newList } })); }} className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500" />
                    <input type="text" value={bus.plate} placeholder="車牌 (Plate)" onChange={e => { const newList = [...formData.busInfo.departures]; newList[idx].plate = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, departures: newList } })); }} className="w-24 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500 placeholder:text-slate-300" />
                    <div className="flex items-center w-24 border border-slate-300 rounded px-2 py-1 bg-white focus-within:border-blue-500 overflow-hidden"><span className="text-slate-400 text-xs mr-1">$</span><input type="number" value={bus.price} placeholder="0" onChange={e => { const newList = [...formData.busInfo.departures]; newList[idx].price = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, departures: newList } })); }} className="w-full text-sm outline-none font-mono bg-transparent" /></div>
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, departures: prev.busInfo.departures.filter((_, i) => i !== idx) } }))} className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 flex items-start"><Info size={12} className="mr-1 flex-shrink-0 mt-0.5" /><span>提示：如需向客戶收費，請至「Tab 3: 收費明細 (Billing)」頁面的「旅遊巴安排」總收費欄位手動輸入總費用。</span></div>
          </div>
        )}
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <MapPin size={18} className="text-blue-600" />
          <h4 className="font-bold text-slate-800">其他物流 (Other Logistics)</h4>
        </div>
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="flex justify-between items-center mb-3"><label className="text-sm font-bold text-slate-700 flex items-center"><Truck size={16} className="mr-2" /> 送貨/物資安排 (Deliveries)</label><button type="button" onClick={() => setFormData(prev => ({ ...prev, deliveries: [...(prev.deliveries || []), { id: Date.now(), unit: '', date: '', time: '18:30', items: '' }] }))} className="text-xs bg-white border border-slate-300 px-2 py-1 rounded hover:text-blue-600 flex items-center shadow-sm"><Plus size={12} className="mr-1" /> 新增單位</button></div>
          <div className="space-y-3">
            {(!formData.deliveries || formData.deliveries.length === 0) && <div className="text-center text-slate-400 text-xs py-2 italic">暫無送貨安排</div>}
            {(formData.deliveries || []).map((delivery, idx) => (
              <div key={delivery.id} className="bg-white p-3 rounded border border-slate-200 shadow-sm relative group">
                <div className="grid grid-cols-12 gap-2 mb-2">
                  <div className="col-span-4"><input type="text" placeholder="單位 (Unit)" className="w-full text-sm font-bold border-b border-slate-200 outline-none" value={delivery.unit} onChange={e => { const d = [...formData.deliveries]; d[idx].unit = e.target.value; setFormData(prev => ({ ...prev, deliveries: d })); }} /></div>
                  <div className="col-span-4"><input type="date" className="w-full text-sm border-b border-slate-200 outline-none" value={delivery.date} onChange={e => { const d = [...formData.deliveries]; d[idx].date = e.target.value; setFormData(prev => ({ ...prev, deliveries: d })); }} /></div>
                  <div className="col-span-3"><input type="text" placeholder="18:30" className="w-full text-sm border-b border-slate-200 outline-none focus:border-blue-500 text-slate-600 text-center font-mono" value={delivery.time} onChange={e => { const d = [...formData.deliveries]; d[idx].time = e.target.value; setFormData(prev => ({ ...prev, deliveries: d })); }} /></div>
                  <div className="col-span-1 text-right"><button type="button" onClick={() => setFormData(prev => ({ ...prev, deliveries: prev.deliveries.filter((_, i) => i !== idx) }))} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button></div>
                </div>
                <textarea rows={2} placeholder="物資清單..." className="w-full text-sm bg-slate-50 border border-slate-100 rounded p-2 outline-none resize-none" value={delivery.items} onChange={e => { const d = [...formData.deliveries]; d[idx].items = e.target.value; setFormData(prev => ({ ...prev, deliveries: d })); }} />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <label className="text-sm font-bold text-slate-700 flex items-center mb-3"><MapPin size={16} className="mr-2" /> 泊車安排 (Parking)</label>
          <div className="bg-white p-3 rounded border border-slate-200 mb-3"><span className="text-xs font-bold text-blue-600 uppercase mb-2 block">免費泊車券</span><div className="grid grid-cols-2 gap-4"><div className="flex items-center border rounded px-2 py-1 bg-slate-50"><span className="text-xs text-slate-500 mr-2">數量:</span><input type="number" className="flex-1 bg-transparent outline-none text-sm font-bold" value={formData.parkingInfo?.ticketQty || ''} onChange={e => setFormData(prev => ({ ...prev, parkingInfo: { ...prev.parkingInfo, ticketQty: e.target.value } }))} /><span className="text-xs text-slate-400 ml-1">張</span></div><div className="flex items-center border rounded px-2 py-1 bg-slate-50"><span className="text-xs text-slate-500 mr-2">時數:</span><input type="number" className="flex-1 bg-transparent outline-none text-sm font-bold" value={formData.parkingInfo?.ticketHours || ''} onChange={e => setFormData(prev => ({ ...prev, parkingInfo: { ...prev.parkingInfo, ticketHours: e.target.value } }))} /><span className="text-xs text-slate-400 ml-1">小時</span></div></div></div>
          <div className="mt-2"><label className="text-xs font-bold text-slate-500 mb-1 block">車牌登記</label><textarea rows={3} value={formData.parkingInfo?.plates || ''} onChange={e => setFormData(prev => ({ ...prev, parkingInfo: { ...prev.parkingInfo, plates: e.target.value } }))} placeholder="請輸入車牌..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-none" /></div>
        </div>
        <div>
          <FormTextArea 
            label={
              <span className="flex items-center gap-1.5">
                物流備註 (Logistics Notes)
                <Info size={14} className="text-blue-400 cursor-help hover:text-blue-600 transition-colors" title="顯示於 (Displayed in):&#10;• 內部單據 (Internal EO, Briefing)&#10;• 報價單 / 合約 / 發票 / 收據 (Client Docs) - 若勾選" />
              </span>
            } 
            name="otherNotes" rows={3} value={formData.otherNotes} onChange={handleInputChange} 
          />
          <DocumentVisibilityToggles field="otherNotes" defaultClient={true} defaultInternal={true} />
        </div>
      </div>
    </div>
  );
};

export default LogisticsTab;