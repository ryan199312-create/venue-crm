import React from 'react';
import { AlertTriangle, Coffee } from 'lucide-react';
import { 
  cleanLocation, 
  formatDateWithDay, 
  onlyChinese, 
  shouldShowField 
} from './DocumentShared';
import { FloorplanAppendix } from './FloorplanRenderer';

export const BriefingRenderer = ({ data, printMode, appSettings }) => {
  return (
    <div className="font-sans text-slate-900 w-full max-w-[210mm] print:max-w-none mx-auto bg-white p-[10mm] print:p-0 min-h-[297mm] print:min-h-0 shadow-sm print:shadow-none relative flex flex-col">
      <style>{`@media print { @page { margin: 10mm; size: A4; } body { -webkit-print-color-adjust: exact; } }`}</style>
      <div className="border-b-2 border-slate-800 pb-4 mb-6">
        <div className="flex justify-between items-end">
          <div className="w-[70%]">
            <h1 className="text-4xl font-black uppercase leading-none tracking-tight mb-1">{data.eventName}</h1>
            <div className="text-xl font-bold text-slate-600 flex items-center gap-2">
              <span>{cleanLocation(data.venueLocation)}</span><span className="text-slate-300">|</span><span>{formatDateWithDay(data.date)}</span>
            </div>
          </div>
          <div className="w-[30%] text-right">
            <div className="bg-black text-white text-center p-2 rounded-lg shadow-sm">
              <div className="text-xs uppercase font-bold text-slate-400">Time</div><div className="text-2xl font-black leading-none">{data.startTime} - {data.endTime}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 mb-4 text-center">
        <div className="bg-slate-100 p-2 rounded border-l-4 border-slate-800"><span className="block text-[10px] font-bold text-slate-500 uppercase">Tables (席數)</span><span className="block text-3xl font-black">{data.tableCount}</span></div>
        <div className="bg-slate-100 p-2 rounded border-l-4 border-slate-600"><span className="block text-[10px] font-bold text-slate-500 uppercase">Guests (人數)</span><span className="block text-3xl font-black">{data.guestCount}</span></div>
        <div className="bg-slate-100 p-2 rounded border-l-4 border-indigo-600"><span className="block text-[10px] font-bold text-slate-500 uppercase">Style (上菜)</span><span className="block text-xl font-bold mt-1">{data.servingStyle || 'Standard'}</span></div>
        <div className="bg-slate-100 p-2 rounded border-l-4 border-amber-600"><span className="block text-[10px] font-bold text-slate-500 uppercase">Serving (起菜)</span><span className="block text-xl font-bold mt-1">{data.servingTime || 'TBC'}</span></div>
      </div>
      {( (data.specialMenuReq && shouldShowField(data, printMode, 'specialMenuReq', false, true)) || (data.allergies && shouldShowField(data, printMode, 'allergies', false, true)) ) && (
        <div className="mb-4 p-3 border-4 border-red-600 bg-red-50 rounded-lg flex items-start gap-3">
          <div className="bg-red-600 text-white p-2 rounded font-black text-xl"><AlertTriangle size={24} /></div>
          <div>
            <h3 className="text-red-700 font-bold text-sm uppercase underline">Allergy / Special Diet Alert</h3>
            <p className="text-2xl font-black text-red-900 leading-tight">{data.specialMenuReq && shouldShowField(data, printMode, 'specialMenuReq', false, true) ? data.specialMenuReq + ' ' : ''}{data.allergies && shouldShowField(data, printMode, 'allergies', false, true) ? data.allergies : ''}</p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-6 flex-1 items-start">
        <div className="border-2 border-slate-800 rounded-xl overflow-hidden h-full flex flex-col">
          <div className="bg-slate-800 text-white px-3 py-1.5 font-bold text-sm uppercase">🍽️ Menu (菜單)</div>
          <div className="p-4 bg-slate-50 flex-1"><div className="space-y-4">{data.menus && data.menus.map((m, i) => (<div key={i}>{m.title && <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{m.title}</div>}<p className="text-sm font-bold text-slate-900 leading-relaxed whitespace-pre-wrap font-serif border-l-2 border-slate-300 pl-3">{onlyChinese(m.content)}</p></div>))}</div></div>
          <div className="bg-blue-50 p-4 border-t border-blue-100"><div className="flex items-start gap-3"><Coffee size={20} className="text-blue-600 mt-0.5" /><div><span className="block text-xs font-bold text-blue-800 uppercase">Beverage Package</span><span className="block text-base font-bold text-slate-800">{data.drinksPackage || 'None'}</span></div></div></div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-800 text-white px-3 py-1.5 font-bold text-sm uppercase flex justify-between items-center"><span>📋 Rundown (流程)</span></div>
            <div className="p-3">{(!data.rundown || data.rundown.length === 0) ? <p className="text-center text-slate-400 italic py-2">No Rundown Provided</p> : (<table className="w-full text-xs"><tbody className="divide-y divide-slate-100">{data.rundown.map((item, i) => (<tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}><td className="py-2 pl-2 w-14 font-mono font-bold text-slate-900 align-top">{item.time}</td><td className="py-2 pr-2 font-bold text-slate-700">{item.activity}</td></tr>))}</tbody></table>)}</div>
          </div>
          <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-3 py-1.5 font-bold text-sm text-slate-700 uppercase border-b border-slate-200">🚍 Logistics (物流)</div>
            <div className="p-3 space-y-3">
              {data.busInfo && data.busInfo.enabled ? (<div className="grid grid-cols-2 gap-2 text-xs"><div className="bg-indigo-50 p-2 rounded border border-indigo-100"><span className="block font-bold text-indigo-800 mb-1">Arrival (接載)</span>{data.busInfo.arrivals && data.busInfo.arrivals.length > 0 ? data.busInfo.arrivals.map((b, i) => (<div key={i} className="font-mono font-bold">{b.time} <span className="font-sans font-normal text-[10px]">({b.location})</span></div>)) : <span className="text-slate-400">-</span>}</div><div className="bg-indigo-50 p-2 rounded border border-indigo-100"><span className="block font-bold text-indigo-800 mb-1">Departure (散席)</span>{data.busInfo.departures && data.busInfo.departures.length > 0 ? data.busInfo.departures.map((b, i) => (<div key={i} className="font-mono font-bold">{b.time} <span className="font-sans font-normal text-[10px]">({b.location})</span></div>)) : <span className="text-slate-400">-</span>}</div></div>) : <div className="text-xs text-slate-400 text-center italic">No Bus Arrangement</div>}
              <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-xs"><span className="font-bold text-slate-600">Parking:</span><span className="font-bold bg-slate-100 px-2 py-0.5 rounded">{data.parkingInfo && data.parkingInfo.ticketQty || 0} Tickets ({data.parkingInfo && data.parkingInfo.ticketHours || 0} hrs)</span></div>
            </div>
          </div>
          <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-3 py-1.5 font-bold text-sm text-slate-700 uppercase border-b border-slate-200">🛠️ Setup (場地)</div>
            <div className="p-3 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-white border border-slate-200 rounded text-center"><span className="block text-[9px] text-slate-400 uppercase">Table Cloth</span><span className="block font-bold text-slate-900">{data.tableClothColor || 'Std'}</span></div>
              <div className="p-2 bg-white border border-slate-200 rounded text-center"><span className="block text-[9px] text-slate-400 uppercase">Chair Cover</span><span className="block font-bold text-slate-900">{data.chairCoverColor || 'Std'}</span></div>
              {data.otherNotes && shouldShowField(data, printMode, 'otherNotes', true, true) && (<div className="col-span-2 mt-2 pt-2 border-t border-slate-100"><span className="block text-[9px] text-red-500 font-bold uppercase mb-1">Remarks / Attention</span><p className="font-bold text-slate-900">{data.otherNotes}</p></div>)}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-auto pt-4 border-t-2 border-slate-100 text-[10px] text-slate-400 flex justify-between">
        <span>Generated: {new Date().toLocaleDateString()}</span>
        <span>Ref: {data.orderId}</span>
      </div>
      <div className="page-break"></div>
      <FloorplanAppendix data={data} appSettings={appSettings} />
    </div>
  );
};

export default BriefingRenderer;