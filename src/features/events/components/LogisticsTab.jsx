import React from 'react';
import { Clock, Truck, Trash2, Plus, MapPin, Info, PenTool } from 'lucide-react';
import { FormTextArea, TimeInput } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useLang } from '../../../i18n/language';

const LogisticsTab = ({ formData, setFormData, handleInputChange, DocumentVisibilityToggles }) => {
  const { appSettings } = useAuth();
  const { L } = useLang();
  const venueName = appSettings?.venueProfile?.nameZh || '場地';

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* 0. Event Rundown */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Clock size={20} /></div>
            <div>
              <h3 className="font-bold text-slate-800">{L('活動流程 (Event Rundown)')}</h3>
              <p className="text-xs text-slate-500">{L('時間表：恭候、入席、證婚、敬酒等。留空則不顯示於單據。 (Timeline: reception, seating, ceremony, toast… Leave empty to hide it from documents.)')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, rundown: [...(prev.rundown || []), { id: Date.now(), time: '', activity: '' }] }))}
            className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-bold transition-colors shrink-0"
          >
            <Plus size={14} /> {L('新增項目 (Add Item)')}
          </button>
        </div>

        {(formData.rundown || []).length === 0 ? (
          <p className="text-sm text-slate-400 italic text-center py-4">{L('未設定活動流程 (No rundown set)')}</p>
        ) : (
          <div className="space-y-2">
            {(formData.rundown || []).map((item, idx) => (
              <div key={item.id ?? idx} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-3">
                  <TimeInput
                    name={`rundown_${idx}`}
                    value={item.time}
                    onChange={e => { const arr = [...formData.rundown]; arr[idx] = { ...arr[idx], time: e.target.value }; setFormData(prev => ({ ...prev, rundown: arr })); }}
                    className="w-full"
                    inputClassName="h-9 py-1 px-3"
                  />
                </div>
                <div className="col-span-8 flex items-center bg-white border border-slate-300 rounded px-2">
                  <input
                    type="text"
                    value={item.activity}
                    onChange={e => { const arr = [...formData.rundown]; arr[idx] = { ...arr[idx], activity: e.target.value }; setFormData(prev => ({ ...prev, rundown: arr })); }}
                    className="w-full bg-transparent text-sm outline-none py-2"
                    placeholder={L('項目內容，例如：恭候 (Activity, e.g. Reception)')}
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, rundown: prev.rundown.filter((_, i) => i !== idx) }))}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 1. Bus Arrangement */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Truck size={20} /></div>
            <div>
              <h3 className="font-bold text-slate-800">{L('接送巴士安排 (Bus Arrangement)')}</h3>
              <p className="text-xs text-slate-500">{L('設置時間、地點與車牌資訊 (Set times, locations, and vehicle plates)')}</p>
            </div>
          </div>
          <label className="flex items-center cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={formData.busInfo?.enabled || false}
                onChange={e => setFormData(prev => ({ ...prev, busInfo: { ...(prev.busInfo || {}), enabled: e.target.checked } }))}
              />
              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </div>
            <span className="ml-3 text-sm font-bold text-slate-700">{L('已啟用 (Enabled)')}</span>
          </label>
        </div>

        {formData.busInfo?.enabled && (
          <div className="space-y-6 animate-in slide-in-from-top-2">
            {/* Arrivals */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-slate-700">{L('去程 (Arrival)')}: {L('各區接送 (Pickup from districts)')} {'>'} {venueName}</span>
                <button 
                  type="button" 
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    busInfo: { 
                      ...prev.busInfo, 
                      arrivals: [...(prev.busInfo.arrivals || []), { id: Date.now(), time: '18:00', location: '', plate: '', price: '' }] 
                    } 
                  }))} 
                  className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 font-bold"
                >
                  {L('+ 新增去程 (+ Add Arrival)')}
                </button>
              </div>
              <div className="space-y-2">
                {(formData.busInfo?.arrivals || []).map((bus, idx) => (
                  <div key={bus.id} className="grid grid-cols-12 gap-2">
                    <div className="col-span-3">
                      <TimeInput 
                        name={`bus_arrival_${idx}`}
                        value={bus.time} 
                        onChange={e => { 
                          const newArr = [...formData.busInfo.arrivals]; 
                          newArr[idx].time = e.target.value; 
                          setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, arrivals: newArr } })); 
                        }} 
                        className="w-full"
                        inputClassName="h-9 py-1 px-3"
                      />
                    </div>
                    <div className="col-span-6 flex items-center bg-white border border-slate-300 rounded px-2">
                      <MapPin size={14} className="text-slate-400 mr-2"/>
                      <input 
                        type="text" 
                        value={bus.location} 
                        onChange={e => { 
                          const newArr = [...formData.busInfo.arrivals]; 
                          newArr[idx].location = e.target.value; 
                          setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, arrivals: newArr } })); 
                        }} 
                        className="w-full bg-transparent text-sm outline-none"
                        placeholder={L('接送地點 (Pickup Location)')}
                      />
                    </div>
                    <div className="col-span-2 flex items-center bg-white border border-slate-300 rounded px-2">
                      <input 
                        type="text" 
                        value={bus.plate} 
                        onChange={e => { 
                          const newArr = [...formData.busInfo.arrivals]; 
                          newArr[idx].plate = e.target.value; 
                          setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, arrivals: newArr } })); 
                        }} 
                        className="w-full bg-transparent text-sm outline-none"
                        placeholder={L('車牌 (Plate)')}
                      />
                    </div>
                    <div className="col-span-1 flex justify-center items-center">
                      <button 
                        type="button" 
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          busInfo: { ...prev.busInfo, arrivals: prev.busInfo.arrivals.filter(a => a.id !== bus.id) } 
                        }))} 
                        className="text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Departures */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-slate-700">{L('回程 (Departure)')}: {venueName} {'>'} {L('各區回程 (Dropoff to districts)')}</span>
                <button 
                  type="button" 
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    busInfo: { 
                      ...prev.busInfo, 
                      departures: [...(prev.busInfo.departures || []), { id: Date.now(), time: '22:30', location: '', plate: '', price: '' }] 
                    } 
                  }))} 
                  className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 font-bold"
                >
                  {L('+ 新增回程 (+ Add Departure)')}
                </button>
              </div>
              <div className="space-y-2">
                {(formData.busInfo?.departures || []).map((bus, idx) => (
                  <div key={bus.id} className="grid grid-cols-12 gap-2">
                    <div className="col-span-3">
                      <TimeInput 
                        name={`bus_departure_${idx}`}
                        value={bus.time} 
                        onChange={e => { 
                          const newDep = [...formData.busInfo.departures]; 
                          newDep[idx].time = e.target.value; 
                          setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, departures: newDep } })); 
                        }} 
                        className="w-full"
                        inputClassName="h-9 py-1 px-3"
                      />
                    </div>
                    <div className="col-span-6 flex items-center bg-white border border-slate-300 rounded px-2">
                      <MapPin size={14} className="text-slate-400 mr-2"/>
                      <input 
                        type="text" 
                        value={bus.location} 
                        onChange={e => { 
                          const newDep = [...formData.busInfo.departures]; 
                          newDep[idx].location = e.target.value; 
                          setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, departures: newDep } })); 
                        }} 
                        className="w-full bg-transparent text-sm outline-none"
                        placeholder={L('回程地點 (Dropoff Location)')}
                      />
                    </div>
                    <div className="col-span-2 flex items-center bg-white border border-slate-300 rounded px-2">
                      <input 
                        type="text" 
                        value={bus.plate} 
                        onChange={e => { 
                          const newDep = [...formData.busInfo.departures]; 
                          newDep[idx].plate = e.target.value; 
                          setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, departures: newDep } })); 
                        }} 
                        className="w-full bg-transparent text-sm outline-none"
                        placeholder={L('車牌 (Plate)')}
                      />
                    </div>
                    <div className="col-span-1 flex justify-center items-center">
                      <button 
                        type="button" 
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          busInfo: { ...prev.busInfo, departures: prev.busInfo.departures.filter(a => a.id !== bus.id) } 
                        }))} 
                        className="text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-start">
               <div className="flex-1 w-full">
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{L('接送備註 (Bus/Truck Notes)')}</label>
                 <FormTextArea
                    name="busNotes"
                    rows={3}
                    value={formData.busNotes}
                    onChange={handleInputChange}
                    placeholder={L('例如: 司機資料、特殊要求、貨車入倉安排... (e.g. Driver details, special requests, truck loading arrangements...)')}
                 />
               </div>
               <div className="w-full md:w-48 pt-6 flex flex-col items-center p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                 <span className="text-[10px] font-bold text-indigo-700 uppercase mb-1">{L('接送總費用 (Total Transport Fee)')}</span>
                 <div className="flex items-center gap-1">
                   <span className="text-xs text-slate-400 font-bold">$</span>
                   <input 
                    type="number" 
                    name="busCharge" 
                    value={formData.busCharge} 
                    onChange={handleInputChange} 
                    className="w-24 text-right bg-white border border-slate-200 rounded px-2 py-1 font-mono font-bold text-slate-800" 
                    placeholder="0" 
                   />
                 </div>
                 <p className="text-[9px] text-slate-400 mt-2 text-center">{L('手動填寫總計費用，會自動計入訂單總額與餘額中。 (Enter the total fee manually; it is automatically added to the order total and balance.)')}</p>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Parking */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><MapPin size={20} /></div>
          <div>
            <h3 className="font-bold text-slate-800">{L('泊車安排 (Parking)')}</h3>
            <p className="text-xs text-slate-500">{L('設置免費泊車與車牌記錄 (Set free parking and plate records)')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase">{L('泊車券數量 (Parking Tickets)')}</label>
                <input 
                  type="number" 
                  value={formData.parkingInfo?.ticketQty || ''} 
                  onChange={e => setFormData(prev => ({ 
                    ...prev, 
                    parkingInfo: { ...(prev.parkingInfo || {}), ticketQty: e.target.value } 
                  }))} 
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                  placeholder="0" 
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase">{L('每張時數 (Hours per Ticket)')}</label>
                <input 
                  type="number" 
                  value={formData.parkingInfo?.ticketHours || ''} 
                  onChange={e => setFormData(prev => ({ 
                    ...prev, 
                    parkingInfo: { ...(prev.parkingInfo || {}), ticketHours: e.target.value } 
                  }))} 
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                  placeholder="0" 
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase">{L('車牌記錄 (License Plates)')}</label>
              <textarea
                value={formData.parkingInfo?.plates || ''}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  parkingInfo: { ...(prev.parkingInfo || {}), plates: e.target.value }
                }))}
                rows={4}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                placeholder={L('輸入車牌號碼... (Enter license plate numbers...)')}
              />
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
             <div className="flex gap-2 text-indigo-700 mb-2">
               <Info size={16} className="mt-0.5" />
               <span className="text-xs font-bold uppercase tracking-wider">{L('泊車須知 (Notice)')}</span>
             </div>
             <p className="text-xs text-slate-600 leading-relaxed">
               {L('1. 泊車券僅限當日於場地停泊時使用。 (1. Parking tickets are valid only for same-day parking at the venue.)')}<br/>
               {L('2. 免費泊車時數若超過，需按時付費。 (2. Parking beyond the free hours is charged by the hour.)')}<br/>
               {L('3. 具體泊車位置與車牌資訊，請依場地同事現場指引為準。 (3. Actual parking location and plate details are subject to on-site staff guidance.)')}
             </p>
             <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">{L('總計免費小時： (Total Free Hours:)')}</span>
                <span className="text-sm font-black text-indigo-700">{(formData.parkingInfo?.ticketQty || 0) * (formData.parkingInfo?.ticketHours || 0)} {L('小時 (hrs)')}</span>
             </div>
          </div>
        </div>
      </div>

      {/* 3. Operational Notes */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><PenTool size={20} /></div>
          <div>
            <h3 className="font-bold text-slate-800">{L('營運備註 (Operational Notes)')}</h3>
            <p className="text-xs text-slate-500">{L('活動執行细節與特殊要求提醒 (Event execution details and special-request reminders)')}</p>
          </div>
        </div>
        <div className="space-y-4">
          <FormTextArea
            label={L('特殊提醒 (Special Reminders)')}
            name="otherNotes"
            rows={5}
            value={formData.otherNotes} onChange={handleInputChange}
          />
          <DocumentVisibilityToggles 
            field="otherNotes" 
            defaultClient={true} 
            defaultInternal={true} 
            clientDocs={L('報價單、合約、附加協議 (Quotation, Contract, Addendum)')}
            internalDocs={L('宴會通知單 (EO)')}
          />
        </div>
      </div>
    </div>
  );
};

export default LogisticsTab;
