import React, { useMemo } from 'react';
import { AlertTriangle, Coffee } from 'lucide-react';
import { 
  DEPARTMENTS,
  generateBillingSummary,
  formatMoney,
  cleanLocation, 
  formatDateWithDay, 
  onlyChinese, 
  shouldShowField,
  getPackageStrings,
  getIssueDate,
  formatDateEn,
  DocumentHeader
} from './DocumentShared';
import { FloorplanAppendix } from './FloorplanRenderer';

export const EventOrderRenderer = ({ data, printMode, appSettings }) => {
  const billing = useMemo(() => data ? generateBillingSummary(data, appSettings) : {}, [data, appSettings]);
  const { setupStr, avStr, decorStr } = data ? getPackageStrings(data, false) : { setupStr: '', avStr: '', decorStr: '' };

  const COPIES = [
    { name: '行政存檔 (Manager Copy)', type: 'STD', showBilling: false, showOps: true, showAllocation: false, color: 'bg-slate-800' },
    { name: '會計帳務單 (Finance Copy)', type: 'FIN', showBilling: true, showOps: false, showAllocation: true, color: 'bg-emerald-700' },
    { name: '樓面工作單 (Banquet Copy)', type: 'BQT', showBilling: false, showOps: true, showAllocation: false, color: 'bg-indigo-600' }
  ];

  // Unified Allocation Logic
  const displayAlloc = useMemo(() => {
    if (!data || !billing) return {};
    const allocation = {};
    DEPARTMENTS.forEach(dept => { 
      allocation[dept.key] = { label: dept.label, total: 0, items: [] }; 
    });
    allocation['other'] = { label: '其他 (Other)', total: 0, items: [] };
    allocation['unallocated'] = { label: '⚠️ 未分拆 (Unallocated)', total: 0, items: [], isError: true };

    const addItem = (key, name, subLabel, qty, unitPrice, totalAmount) => {
      if (Math.abs(totalAmount) < 0.01) return;
      let group = allocation[key] ? key : 'other';
      allocation[group].total += totalAmount;
      allocation[group].items.push({ name, subLabel, qty: parseFloat(qty), unit: parseFloat(unitPrice), amount: totalAmount });
    };

    // 1. Menu Allocation
    (data.menus || []).forEach(m => {
      const qty = parseFloat(m.qty) || 1;
      const price = parseFloat(m.price) || 0;
      const totalLineAmount = price * qty;

      if (m.allocation && Object.keys(m.allocation).length > 0) {
        let allocatedTotal = 0;
        Object.entries(m.allocation).forEach(([dept, unitVal]) => {
          const val = parseFloat(unitVal) || 0;
          if (val !== 0) {
            const lineAmt = val * qty;
            allocatedTotal += lineAmt;
            const deptLabel = DEPARTMENTS.find(d => d.key === dept)?.label.split(' ')[0] || dept;
            addItem(dept, m.title, deptLabel, qty, val, lineAmt);
          }
        });
        const remainder = totalLineAmount - allocatedTotal;
        if (Math.abs(remainder) > 1) { 
          const unitRemainder = price - (allocatedTotal / qty);
          addItem('unallocated', m.title, 'Balance', qty, unitRemainder, remainder);
        }
      } else {
        addItem('kitchen', m.title, '', qty, price, totalLineAmount);
      }
    });

    // 2. Plating
    if (data.servingStyle === '位上') {
      const pFee = parseFloat(data.platingFee) || 0;
      const pQty = parseFloat(data.tableCount) || 0;
      if (pFee > 0) addItem('kitchen', '位上服務費', `${pQty}席`, pQty, pFee, pFee * pQty);
    }

    // 3. Drinks
    const dQty = parseFloat(data.drinksQty) || 1;
    const dPrice = parseFloat(data.drinksPrice) || 0;
    const dTotal = dPrice * dQty;
    const dName = data.drinksPackage || 'Drinks Package';

    if (data.drinkAllocation && Object.keys(data.drinkAllocation).length > 0) {
      let allocatedTotal = 0;
      Object.entries(data.drinkAllocation).forEach(([dept, unitVal]) => {
        const val = parseFloat(unitVal) || 0;
        if (val !== 0) {
          const lineAmt = val * dQty;
          allocatedTotal += lineAmt;
          addItem(dept, dName, dept, dQty, val, lineAmt);
        }
      });
      const remainder = dTotal - allocatedTotal;
      if (Math.abs(remainder) > 1) {
        const unitRemainder = dPrice - (allocatedTotal / dQty);
        addItem('unallocated', dName, 'Balance', dQty, unitRemainder, remainder);
      }
    } else {
      addItem('bar', dName, '', dQty, dPrice, dTotal);
    }

    // 4. Custom Items
    (data.customItems || []).forEach(i => {
      const qty = parseFloat(i.qty) || 1;
      const price = parseFloat(i.price) || 0;
      const total = price * qty;
      addItem(i.category || 'other', i.name, '', qty, price, total);
    });

    // 5. Package Overrides & Fees (Shared)
    const addToDept = (key, name, amount) => {
      if (!allocation[key]) allocation[key] = { label: '其他 (Other)', items: [], total: 0 };
      allocation[key].items.push({ name, unit: amount, qty: 1, amount: amount });
      allocation[key].total += amount;
    };

    if (billing.bus) addToDept('other', '旅遊巴安排', billing.bus.amount);
    if (billing.setupPackagePrice > 0) addToDept('other', '舞台與接待設備', billing.setupPackagePrice);
    if (billing.avPackagePrice > 0) addToDept('other', '影音設備', billing.avPackagePrice);
    if (billing.decorPackagePrice > 0) addToDept('other', '場地佈置', billing.decorPackagePrice);
    if (billing.serviceChargeVal > 0) addToDept('other', '服務費 (10%)', billing.serviceChargeVal);
    if (billing.ccSurcharge > 0) addToDept('other', `信用卡附加費 (${billing.ccSurchargePercent}%)`, billing.ccSurcharge);
    
    if (billing.discountVal > 0) {
      allocation['adjustments'] = { label: '調整 (Adjustments)', items: [], total: 0 };
      allocation['adjustments'].items.push({ name: '折扣優惠 (Discount)', unit: -billing.discountVal, qty: 1, amount: -billing.discountVal });
      allocation['adjustments'].total -= billing.discountVal;
    }

    return allocation;
  }, [data, billing]);

  if (!data) return null;

  return (
    <div className="font-sans text-slate-900 mx-auto bg-white text-sm w-full max-w-[210mm] print:max-w-none min-h-[297mm] print:min-h-0">
      <style>{`
        @media print { 
          @page { 
            margin: 10mm; 
            size: A4; 
            @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; color: #94a3b8; font-family: sans-serif; }
            @bottom-center { content: "${data.orderId}"; font-size: 10px; font-weight: bold; color: #000; font-family: monospace; }
            @bottom-left { content: "${data.eventName || ''}"; font-size: 9px; font-weight: bold; color: #64748b; font-family: sans-serif; text-transform: uppercase; }
          }
          body { -webkit-print-color-adjust: exact; }
          .page-break { page-break-after: always !important; display: block; height: 0; width: 100%; clear: both; }
          .print-page { position: relative; width: 100%; background: white; } 
          .break-inside-avoid { break-inside: avoid; }
          .compact-table th, .compact-table td { padding: 3px 6px; border-bottom: 1px solid #e2e8f0; }
          .compact-table th { background-color: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #64748b; }
        }
      `}</style>

      {COPIES.map((copy, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <div className="page-break"></div>}
          <div className="print-page">
            {copy.type === 'BQT' ? (
              <div className="relative p-[10mm] print:p-0">
                <DocumentHeader data={data} typeEn="Event Order" typeZh={copy.name} appSettings={appSettings} />

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
                      <p className="text-2xl font-black text-red-900 leading-tight">
                        {data.specialMenuReq && shouldShowField(data, printMode, 'specialMenuReq', false, true) ? data.specialMenuReq + ' ' : ''} 
                        {data.allergies && shouldShowField(data, printMode, 'allergies', false, true) ? data.allergies : ''}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6 items-start">
                  <div className="border-2 border-slate-800 rounded-xl overflow-hidden h-full flex flex-col">
                    <div className="bg-slate-800 text-white px-3 py-1.5 font-bold text-sm uppercase">🍽️ Menu (菜單)</div>
                    <div className="p-4 bg-slate-50 flex-1">
                      <div className="space-y-4">
                        {data.menus && data.menus.map((m, i) => (
                          <div key={i}>
                            {m.title && <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{m.title}</div>}
                            <p className="text-sm font-bold text-slate-900 leading-relaxed whitespace-pre-wrap font-serif border-l-2 border-slate-300 pl-3">{onlyChinese(m.content)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-blue-50 p-4 border-t border-blue-100">
                      <div className="flex items-start gap-3">
                        <Coffee size={20} className="text-blue-600 mt-0.5" />
                        <div><span className="block text-xs font-bold text-blue-800 uppercase">Beverage Package</span><span className="block text-base font-bold text-slate-800">{data.drinksPackage || 'None'}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-800 text-white px-3 py-1.5 font-bold text-sm uppercase flex justify-between items-center"><span>📋 Rundown (流程)</span></div>
                      <div className="p-3">
                        {(!data.rundown || data.rundown.length === 0) ? <p className="text-center text-slate-400 italic py-2">No Rundown Provided</p> : (
                          <table className="w-full text-xs"><tbody className="divide-y divide-slate-100">{data.rundown.map((item, i) => (<tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}><td className="py-2 pl-2 w-14 font-mono font-bold text-slate-900 align-top">{item.time}</td><td className="py-2 pr-2 font-bold text-slate-700">{item.activity}</td></tr>))}</tbody></table>
                        )}
                      </div>
                    </div>
                    <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-100 px-3 py-1.5 font-bold text-sm text-slate-700 uppercase border-b border-slate-200">🚍 Logistics (物流)</div>
                      <div className="p-3 space-y-3">
                        {data.busInfo && data.busInfo.enabled ? (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-indigo-50 p-2 rounded border border-indigo-100"><span className="block font-bold text-indigo-800 mb-1">Arrival (接載)</span>{data.busInfo.arrivals && data.busInfo.arrivals.length > 0 ? data.busInfo.arrivals.map((b, i) => (<div key={i} className="font-mono font-bold">{b.time} <span className="font-sans font-normal text-[10px]">({b.location})</span></div>)) : <span className="text-slate-400">-</span>}</div>
                            <div className="bg-indigo-50 p-2 rounded border border-indigo-100"><span className="block font-bold text-indigo-800 mb-1">Departure (散席)</span>{data.busInfo.departures && data.busInfo.departures.length > 0 ? data.busInfo.departures.map((b, i) => (<div key={i} className="font-mono font-bold">{b.time} <span className="font-sans font-normal text-[10px]">({b.location})</span></div>)) : <span className="text-slate-400">-</span>}</div>
                          </div>
                        ) : <div className="text-xs text-slate-400 text-center italic">No Bus Arrangement</div>}
                        <div className="flex justify-between items-center text-xs"><span className="font-bold text-slate-600">Parking:</span><span className="font-bold bg-slate-100 px-2 py-0.5 rounded">{(data.parkingInfo?.ticketQty) || 0} 張 x {(data.parkingInfo?.ticketHours) || 0} 小時</span></div>
                      </div>
                    </div>
                    <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-100 px-3 py-1.5 font-bold text-sm text-slate-700 uppercase border-b border-slate-200">🛠️ Setup (場地)</div>
                      <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-white border border-slate-200 rounded text-center"><span className="block text-[9px] text-slate-400 uppercase">Table Cloth</span><span className="block font-bold text-slate-900">{data.tableClothColor || 'Std'}</span></div>
                        <div className="p-2 bg-white border border-slate-200 rounded text-center"><span className="block text-[9px] text-slate-400 uppercase">Chair Cover</span><span className="block font-bold text-slate-900">{data.chairCoverColor || 'Std'}</span></div>

                        <div className="col-span-2 p-2 bg-white border border-slate-200 rounded mt-2">
                          <span className="block text-[9px] text-slate-400 uppercase">設備與佈置 (Equipment & Decor)</span>
                          <div className="text-[10px] font-bold text-slate-800 leading-snug mt-1">
                            {[setupStr, avStr, decorStr].filter(Boolean).join(' / ') || 'Standard Setup'}
                          </div>
                        </div>
                        {data.venueDecor && shouldShowField(data, printMode, 'venueDecor', false, true) && <div className="col-span-2 mt-2 p-2 bg-slate-50 rounded italic text-[10px] border border-slate-100"><span className="font-bold not-italic">佈置備註:</span> {data.venueDecor}</div>}
                        {data.otherNotes && shouldShowField(data, printMode, 'otherNotes', true, true) && (<div className="col-span-2 mt-2 pt-2 border-t border-slate-100"><span className="block text-[9px] text-red-500 font-bold uppercase mb-1">Remarks / Attention</span><p className="font-bold text-slate-900">{data.otherNotes}</p></div>)}
                      </div>
                    </div>
                    {data.generalRemarks && shouldShowField(data, printMode, 'generalRemarks', true, true) && (
                      <div className="border-2 border-amber-200 bg-amber-50 rounded-xl overflow-hidden">
                        <div className="bg-amber-100 px-3 py-1.5 font-bold text-sm text-amber-800 uppercase border-b border-amber-200">通用備註 (General Remarks)</div>
                        <div className="p-3 text-xs font-bold text-amber-900 whitespace-pre-wrap">{data.generalRemarks}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-[10mm] print:p-0">
                <DocumentHeader data={data} typeEn="Event Order" typeZh="宴會確認單" appSettings={appSettings} />

                {copy.type !== 'FIN' && (
                  <div className="bg-slate-100 border border-slate-200 p-2 rounded mb-4 grid grid-cols-4 gap-4 text-xs">
                    <div className="border-r border-slate-300 pr-2"><span className="block text-[9px] text-slate-400 font-bold uppercase">客戶</span><div className="font-bold truncate">{data.clientName}</div><div className="truncate text-[10px]">{data.clientPhone}</div></div>
                    <div className="border-r border-slate-300 pr-2"><span className="block text-[9px] text-slate-400 font-bold uppercase">場地</span><div className="font-bold truncate">{cleanLocation(data.venueLocation)}</div></div>
                    <div className="border-r border-slate-300 pr-2"><span className="block text-[9px] text-slate-400 font-bold uppercase">席數 / 人數</span><div className="font-bold">{data.tableCount} 席 / {data.guestCount} 人</div></div>
                    <div><span className="block text-[9px] text-slate-400 font-bold uppercase">負責人</span><div className="font-bold">{data.salesRep || '-'}</div></div>
                  </div>
                )}

                {copy.showOps && (
                  <div className="flex gap-6 items-start mb-4">
                    <div className="w-1/2 flex flex-col gap-4">
                      <div className="border border-slate-300 rounded overflow-hidden h-full">
                        <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex justify-between items-center">
                          <span className="font-bold text-slate-700 text-xs">餐飲安排 (Food & Beverage)</span>
                          <span className="text-[10px] font-bold bg-white border border-slate-200 px-2 rounded text-slate-600">{data.servingStyle}</span>
                        </div>
                        <div className="p-3">
                          <div className="bg-blue-50 border border-blue-100 rounded p-2 mb-3 text-xs flex gap-2">
                            <Coffee size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                            <div><span className="font-bold text-blue-700 block text-[10px] uppercase">酒水套餐</span><span className="font-medium text-slate-700">{data.drinksPackage || '標準 / 無'}</span></div>
                          </div>
                          <div className="space-y-3">
                            {data.menus && data.menus.length > 0 ? (
                              data.menus.map((m, mIdx) => (
                                <div key={mIdx} className="break-inside-avoid">
                                  {m.title && <div className="font-bold text-slate-800 text-sm underline decoration-slate-300 mb-1">{m.title}</div>}
                                  <div className="text-sm font-medium leading-snug text-slate-700 whitespace-pre-wrap pl-2 border-l-2 border-slate-200">{onlyChinese(m.content)}</div>
                                </div>
                              ))
                            ) : <div className="text-slate-400 italic text-xs">未選擇菜單</div>}
                          </div>
                        </div>
                      </div>
                      {( (data.specialMenuReq && shouldShowField(data, printMode, 'specialMenuReq', false, true)) || (data.allergies && shouldShowField(data, printMode, 'allergies', false, true)) ) && (
                        <div className="border-2 border-red-200 bg-red-50 rounded p-3 text-xs break-inside-avoid">
                          <div className="font-black text-red-600 flex items-center gap-1 mb-1"><AlertTriangle size={14} /> 特別要求 / 過敏</div>
                          <div className="font-bold text-red-900 whitespace-pre-wrap">
                            {data.specialMenuReq && shouldShowField(data, printMode, 'specialMenuReq', false, true) ? data.specialMenuReq : ''}
                            {(data.specialMenuReq && shouldShowField(data, printMode, 'specialMenuReq', false, true)) && (data.allergies && shouldShowField(data, printMode, 'allergies', false, true)) && ' | '}
                            {data.allergies && shouldShowField(data, printMode, 'allergies', false, true) ? data.allergies : ''}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="w-1/2 flex flex-col gap-4">
                      <div className="border border-slate-300 rounded overflow-hidden break-inside-avoid">
                        <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 font-bold text-slate-700 text-xs">活動流程 (Rundown)</div>
                        <div className="p-2">
                          {(!data.rundown || data.rundown.length === 0) ? <span className="text-[10px] text-slate-400 italic">無</span> : (
                            <table className="w-full text-xs"><tbody className="divide-y divide-slate-100">{data.rundown.map((item, i) => (<tr key={i}><td className="py-1 font-mono text-slate-500 w-16 align-top">{item.time}</td><td className="py-1 font-bold text-slate-700">{item.activity}</td></tr>))}</tbody></table>
                          )}
                        </div>
                      </div>
                      <div className="border border-slate-300 rounded overflow-hidden break-inside-avoid">
                        <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 font-bold text-slate-700 text-xs">場地、影音與佈置</div>
                        <div className="p-3 text-xs space-y-2">
                          <div className="grid grid-cols-2 gap-2 mb-2"><div><span className="text-[9px] text-slate-400 block font-bold">檯布顏色</span>{data.tableClothColor || '標準'}</div><div><span className="text-[9px] text-slate-400 block font-bold">椅套顏色</span>{data.chairCoverColor || '標準'}</div></div>
                          <div className="border-t border-slate-100 pt-2 space-y-1">
                            {setupStr && <div><span className="text-[9px] text-slate-400 font-bold">舞台與接待設備:</span> <span className="text-[10px] font-medium text-slate-700">{setupStr}</span></div>}
                            {avStr && <div><span className="text-[9px] text-slate-400 font-bold">影音設備:</span> <span className="text-[10px] font-medium text-slate-700">{avStr}</span></div>}
                            {decorStr && <div><span className="text-[9px] text-slate-400 font-bold">場地佈置:</span> <span className="text-[10px] font-medium text-slate-700">{decorStr}</span></div>}
                          </div>
                        </div>
                      </div>
                      <div className="border border-slate-300 rounded overflow-hidden break-inside-avoid">
                        <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 font-bold text-slate-700 text-xs">物流與泊車</div>
                        <div className="p-3 text-xs space-y-3">
                          {data.busInfo && data.busInfo.enabled && (
                            <div className="bg-indigo-50 border border-indigo-100 rounded p-2 text-[10px] mb-2">
                              <span className="font-bold text-indigo-700 block mb-1 border-b border-indigo-200 pb-0.5">🚌 旅遊巴安排</span>
                              <div className="grid grid-cols-2 gap-3">
                                <div><span className="font-bold text-indigo-600 block text-[9px] mb-0.5">接載:</span>{(!data.busInfo.arrivals || data.busInfo.arrivals.length === 0) ? <span className="text-slate-400 italic text-[9px]">-</span> : data.busInfo.arrivals.map((bus, i) => (<div key={i} className="mb-1 leading-tight"><div className="flex gap-1 items-baseline"><span className="font-mono font-bold text-black">{bus.time}</span>{bus.plate && <span className="text-slate-500 text-[9px]">({bus.plate})</span>}</div><div className="text-slate-700 break-words">{bus.location || '---'}</div></div>))}</div>
                                <div><span className="font-bold text-indigo-600 block text-[9px] mb-0.5">散席:</span>{(!data.busInfo.departures || data.busInfo.departures.length === 0) ? <span className="text-slate-400 italic text-[9px]">-</span> : data.busInfo.departures.map((bus, i) => (<div key={i} className="mb-1 leading-tight"><div className="flex gap-1 items-baseline"><span className="font-mono font-bold text-black">{bus.time}</span>{bus.plate && <span className="text-slate-500 text-[9px]">({bus.plate})</span>}</div><div className="text-slate-700 break-words">{bus.location || '---'}</div></div>))}</div>
                              </div>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-xs"><span className="font-bold text-slate-600">Parking:</span><span className="font-bold bg-slate-100 px-2 py-0.5 rounded">{(data.parkingInfo?.ticketQty) || 0} 張 x {(data.parkingInfo?.ticketHours) || 0} 小時</span></div>
                        </div>
                      </div>
                      {data.otherNotes && shouldShowField(data, printMode, 'otherNotes', true, true) && (<div className="col-span-2 mt-2 pt-2 border-t border-slate-100"><span className="block text-[9px] text-red-500 font-bold uppercase mb-1">Remarks / Attention</span><p className="font-bold text-slate-900">{data.otherNotes}</p></div>)}
                    </div>
                  </div>
                )}

                {copy.showBilling && (
                  <div className="mt-4 border-t-2 border-slate-800 pt-2">
                    <table className="w-full text-xs compact-table">
                      <thead><tr><th className="text-left">項目</th><th className="text-right">單價</th><th className="text-center">數量</th><th className="text-right">金額</th></tr></thead>
                      <tbody>
                        {billing.parsedMenus.map((m, i) => (<tr key={`m-${i}`}><td className="font-medium">{m.title}</td><td className="text-right font-mono text-slate-500">${formatMoney(m.cleanPrice)}</td><td className="text-center text-slate-500">{m.cleanQty}</td><td className="text-right font-mono font-bold">${formatMoney(m.amount)}</td></tr>))}
                        {billing.drinks && (<tr><td className="font-medium">酒水套餐 ({billing.drinks.label})</td><td className="text-right font-mono text-slate-500">${formatMoney(billing.drinks.price)}</td><td className="text-center text-slate-500">{billing.drinks.qty}</td><td className="text-right font-mono font-bold">${formatMoney(billing.drinks.amount)}</td></tr>)}
                        {billing.plating && (<tr><td className="font-medium">位上服務費</td><td className="text-right font-mono text-slate-500">${formatMoney(billing.plating.price)}</td><td className="text-center text-slate-500">{billing.plating.qty}</td><td className="text-right font-mono font-bold">${formatMoney(billing.plating.amount)}</td></tr>)}
                        {billing.setupPackagePrice > 0 && (<tr><td className="font-medium">舞台與接待設備套票</td><td className="text-right font-mono text-slate-500">${formatMoney(billing.setupPackagePrice)}</td><td className="text-center text-slate-500">1</td><td className="text-right font-mono font-bold">${formatMoney(billing.setupPackagePrice)}</td></tr>)}
                        {billing.avPackagePrice > 0 && (<tr><td className="font-medium">影音設備套票</td><td className="text-right font-mono text-slate-500">${formatMoney(billing.avPackagePrice)}</td><td className="text-center text-slate-500">1</td><td className="text-right font-mono font-bold">${formatMoney(billing.avPackagePrice)}</td></tr>)}
                        {billing.decorPackagePrice > 0 && (<tr><td className="font-medium">場地佈置套票</td><td className="text-right font-mono text-slate-500">${formatMoney(billing.decorPackagePrice)}</td><td className="text-center text-slate-500">1</td><td className="text-right font-mono font-bold">${formatMoney(billing.decorPackagePrice)}</td></tr>)}
                        {billing.parsedCustomItems.map((item, i) => (<tr key={`c-${i}`}><td>{item.name}</td><td className="text-right font-mono text-slate-500">${formatMoney(item.cleanPrice)}</td><td className="text-center text-slate-500">{item.cleanQty}</td><td className="text-right font-mono font-bold">${formatMoney(item.amount)}</td></tr>))}
                        {billing.bus && (<tr><td className="font-bold">旅遊巴安排</td><td className="text-right font-mono text-slate-500">${formatMoney(billing.bus.amount)}</td><td className="text-center text-slate-500">1</td><td className="text-right font-mono font-bold">${formatMoney(billing.bus.amount)}</td></tr>)}
                        <tr className="border-t border-slate-800"><td colSpan="3" className="text-right font-bold pt-1 text-sm">總金額 (TOTAL)</td><td className="text-right font-bold font-mono pt-1 text-sm text-black">${formatMoney(billing.grandTotal)}</td></tr>
                      </tbody>
                    </table>

                    {copy.showAllocation && (
                      <div className="mt-4 pt-2 border-t border-slate-200">
                        <h3 className="font-bold text-slate-800 text-xs uppercase">部門拆帳詳情 (Revenue Allocation)</h3>
                        <table className="w-full text-[10px] border-collapse table-fixed">
                          <thead><tr className="border-b-2 border-slate-800 bg-slate-50 text-slate-600"><th className="text-left py-1 px-2">部門</th><th className="text-left py-1 px-2">項目</th><th className="text-right py-1 px-2">單價</th><th className="text-center py-1 px-2">數量</th><th className="text-right py-1 px-2">總額</th><th className="text-right py-1 px-2">%</th></tr></thead>
                          <tbody>
                            {Object.values(displayAlloc).map((dept, i) => {
                              if (dept.total === 0 && dept.items.length === 0) return null;
                              return (
                                <React.Fragment key={i}>
                                  {dept.items.map((item, idx) => (
                                    <tr key={`${i}-${idx}`} className={idx === 0 ? "border-t border-slate-200" : ""}>
                                      <td className={`py-1 px-2 align-top ${idx === 0 ? 'font-bold' : ''}`}>{idx === 0 ? dept.label : ''}</td>
                                      <td className="py-1 px-2 align-top text-slate-600">{item.name}</td>
                                      <td className="py-1 px-2 text-right font-mono text-slate-500">${formatMoney(item.unit)}</td>
                                      <td className="py-1 px-2 text-center text-slate-500">{item.qty}</td>
                                      <td className="py-1 px-2 text-right font-mono font-medium">${formatMoney(item.amount)}</td>
                                      <td className="py-1 px-2 text-right font-bold text-[9px] text-slate-500">{idx === 0 ? (billing.subtotal > 0 ? ((dept.total / billing.subtotal) * 100).toFixed(1) + '%' : '0%') : ''}</td>
                                    </tr>
                                  ))}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </React.Fragment>
      ))}

      {((data.stageDecorPhotos && data.stageDecorPhotos.length > 0) || (data.venueDecorPhotos && data.venueDecorPhotos.length > 0) || data.stageDecorPhoto || data.venueDecorPhoto) && (
        <div className="print-page p-[10mm] print:p-0">
          <div className="page-break"></div>
          <div className="flex justify-between items-end border-b-4 border-slate-900 pb-2 mb-6">
            <div><h1 className="text-2xl font-extrabold tracking-tight leading-none uppercase">附錄 (Appendix)</h1><p className="text-slate-500 text-xs mt-1">Order ID: {data.orderId}</p></div>
            <div className="text-right"><div className="inline-block bg-slate-500 text-white px-3 py-1 text-sm font-bold rounded mb-1 uppercase">參考圖片</div><div className="text-sm font-bold text-slate-800">{formatDateWithDay(data.date)}</div></div>
          </div>
          <div className="grid grid-cols-2 gap-6 mt-4">
            {(data.stageDecorPhotos || (data.stageDecorPhoto ? [data.stageDecorPhoto] : [])).map((url, idx) => (
              <div key={`stage-${idx}`} className="break-inside-avoid border border-slate-200 rounded p-2 bg-slate-50">
                <h3 className="text-sm font-bold text-slate-700 mb-2">舞台/花藝參考圖 {idx + 1}</h3>
                <img src={url} alt={`Stage ${idx}`} className="w-full h-auto max-h-[110mm] object-contain mx-auto" />
              </div>
            ))}
            {(data.venueDecorPhotos || (data.venueDecorPhoto ? [data.venueDecorPhoto] : [])).map((url, idx) => (
              <div key={`venue-${idx}`} className="break-inside-avoid border border-slate-200 rounded p-2 bg-slate-50">
                <h3 className="text-sm font-bold text-slate-700 mb-2">場地佈置參考圖 {idx + 1}</h3>
                <img src={url} alt={`Venue ${idx}`} className="w-full h-auto max-h-[110mm] object-contain mx-auto" />
              </div>
            ))}
          </div>
        </div>
      )}
      <FloorplanAppendix data={data} appSettings={appSettings} />
    </div>
  );
};

export default EventOrderRenderer;