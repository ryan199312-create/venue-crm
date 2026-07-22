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
  DocumentHeader,
  BrandedFooter
} from './DocumentShared';
import { FloorplanAppendix } from './FloorplanRenderer';

export const EventOrderRenderer = ({ data, printMode, appSettings }) => {
  const billing = useMemo(() => data ? generateBillingSummary(data, appSettings) : {}, [data, appSettings]);
  const { setupStr, avStr, decorStr } = data ? getPackageStrings(data, false) : { setupStr: '', avStr: '', decorStr: '' };

  const COPIES = [
    { name: '行政存檔 (Manager Copy)', type: 'STD', showBilling: false, showOps: true, showAllocation: false, color: 'bg-[var(--brand-primary)]' },
    { name: '會計帳務單 (Finance Copy)', type: 'FIN', showBilling: true, showOps: false, showAllocation: true, color: 'bg-[var(--brand-accent)]' },
    { name: '樓面工作單 (Staff Copy)', type: 'BQT', showBilling: false, showOps: true, showAllocation: false, color: 'bg-[var(--brand-primary)]' },
    { name: '場地平面圖 (Floor Plan)', type: 'FP', showBilling: false, showOps: false, showAllocation: false, color: 'bg-slate-500' }
  ];

  // Unified Allocation Logic
  const displayAlloc = useMemo(() => {
    if (!data || !billing) return {};
    const allocation = {};
    DEPARTMENTS.forEach(dept => { 
      const label = (dept.isCustom && data.customDeptLabels?.[dept.key]) || dept.label.split(' ')[0];
      allocation[dept.key] = { label, total: 0, items: [] }; 
    });
    allocation['unallocated'] = { label: '⚠️ 未分拆 (Unallocated)', total: 0, items: [], isError: true };

    const addItem = (key, name, subLabel, qty, unitPrice, totalAmount) => {
      if (Math.abs(totalAmount) < 0.01) return;
      let group = allocation[key] ? key : 'other1';
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
            const deptDef = DEPARTMENTS.find(d => d.key === dept);
            const deptLabel = (deptDef?.isCustom && data.customDeptLabels?.[dept]) || deptDef?.label.split(' ')[0] || dept;
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
          const deptDef = DEPARTMENTS.find(d => d.key === dept);
          const deptLabel = (deptDef?.isCustom && data.customDeptLabels?.[dept]) || deptDef?.label.split(' ')[0] || dept;
          addItem(dept, dName, deptLabel, dQty, val, lineAmt);
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
    <div className="font-sans text-slate-900 mx-auto bg-white text-sm w-full max-w-[210mm] print:max-w-none min-h-0 print:min-h-0">
      <style>{`
        @media print { 
          body { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
            background: white;
          }
          .page-break { page-break-after: always !important; break-after: page !important; display: block; height: 0; width: 100%; clear: both; }
          .print-page { position: relative; width: 100%; background: white; } 
          .break-inside-avoid { break-inside: avoid !important; }
          .compact-table th, .compact-table td { padding: 3px 6px; border-bottom: 1px solid #e2e8f0; }
          .compact-table th { background-color: #f8fafc !important; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #64748b; }
          .box-decoration-clone { -webkit-box-decoration-break: clone; box-decoration-break: clone; }
          .operational-container { 
            column-count: 2; 
            column-gap: 24px; 
            width: 100%; 
            orphans: 1; 
            widows: 1; 
          }
          .operational-column { 
            break-inside: auto; 
            display: block; 
            width: 100%; 
          }
        }
      `}</style>

      {COPIES.map((copy, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <div className="page-break"></div>}
          
          {copy.type === 'FP' ? (
            <FloorplanAppendix data={data} appSettings={appSettings} isStandalone={true} />
          ) : (
            <div className="print-page relative p-[10mm] print:p-0">
                <DocumentHeader data={data} typeEn="Event Order" typeZh={copy.name} appSettings={appSettings} />

                {/* Manager Copy: Ultra-Compact Operational Grid */}
                {copy.type === 'STD' && (
                  <div className="mb-4">
                    <div className="border border-slate-300 rounded-lg overflow-hidden">
                      {/* Top Bar: Event Name */}
                      <div className="bg-slate-800 text-white px-3 py-1.5 flex justify-between items-center">
                        <span className="text-sm font-black uppercase tracking-wider">{data.eventName}</span>
                        <span className="text-[9px] opacity-60 font-mono">{data.orderId}</span>
                      </div>
                      
                      {/* Data Grid: Operational Stats */}
                      <div className="grid grid-cols-6 text-xs bg-white">
                        <div className="p-2 border-r border-slate-200 flex flex-col justify-center bg-slate-50/50">
                          <span className="block text-[7px] text-slate-400 font-bold uppercase tracking-tighter mb-0.5">Duration</span>
                          <span className="font-bold text-slate-900 whitespace-nowrap leading-none">{data.startTime || '--:--'} - {data.endTime || '--:--'}</span>
                        </div>
                        <div className="p-2 border-r border-slate-200 flex flex-col justify-center bg-slate-50/50">
                          <span className="block text-[7px] text-slate-400 font-bold uppercase tracking-tighter mb-0.5">Type</span>
                          <span className="font-bold text-slate-900 truncate leading-none">{data.eventType === '其他 (Other)' ? data.customEventType : data.eventType}</span>
                        </div>
                        <div className="p-2 border-r border-slate-200 flex flex-col justify-center bg-slate-50/50">
                          <span className="block text-[7px] text-slate-400 font-bold uppercase tracking-tighter mb-0.5">Style</span>
                          <span className="font-bold text-slate-900 leading-none">{data.servingStyle || 'Std'}</span>
                        </div>
                        <div className="p-2 border-r border-slate-200 flex flex-col justify-center bg-slate-50/50">
                          <span className="block text-[7px] text-slate-400 font-bold uppercase tracking-tighter mb-0.5">Serving</span>
                          <span className="font-bold text-slate-900 leading-none">{data.servingTime || 'TBC'}</span>
                        </div>
                        <div className="p-2 border-r border-slate-200 text-center flex flex-col justify-center">
                          <span className="block text-[7px] text-slate-400 font-bold uppercase tracking-tighter mb-0.5">Tables</span>
                          <span className="font-black text-slate-900 leading-none">{data.tableCount}</span>
                        </div>
                        <div className="p-2 text-center flex flex-col justify-center">
                          <span className="block text-[7px] text-slate-400 font-bold uppercase tracking-tighter mb-0.5">Guests</span>
                          <span className="font-black text-slate-900 leading-none">{data.guestCount}</span>
                        </div>
                      </div>

                      {/* Bottom Bar: Client & Venue */}
                      <div className="bg-slate-50 border-t border-slate-200 p-1.5 px-3 flex gap-6 text-xs">
                        <div>
                          <span className="text-slate-400 font-bold uppercase mr-2 tracking-tighter text-[7px]">Client:</span>
                          <span className="font-black text-slate-900 leading-none">{data.clientName}</span>
                          <span className="ml-2 font-mono text-slate-500 text-[10px] leading-none">{data.clientPhone}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold uppercase mr-2 tracking-tighter text-[7px]">Venue:</span>
                          <span className="font-bold text-slate-800 leading-none">{cleanLocation(data.venueLocation)}</span>
                        </div>
                        <div className="ml-auto flex gap-4 border-l border-slate-200 pl-4">
                          <div>
                            <span className="text-slate-400 font-bold uppercase mr-1 tracking-tighter text-[7px]">Total:</span>
                            <span className="font-mono font-bold text-slate-900">${formatMoney(billing.grandTotal)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold uppercase mr-1 tracking-tighter text-[7px]">Due:</span>
                            <span className={`font-mono font-bold ${billing.balanceDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>${formatMoney(billing.balanceDue)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Compact Allergy Bar for Managers */}
                    {( (data.specialMenuReq && shouldShowField(data, printMode, 'specialMenuReq', false, true)) || (data.allergies && shouldShowField(data, printMode, 'allergies', false, true)) ) && (
                      <div className="mt-2 border-2 border-red-600 text-red-600 bg-white p-1 px-3 rounded-md flex items-center gap-2 text-[10px] font-black animate-pulse-slow">
                        <AlertTriangle size={12} className="flex-shrink-0" />
                        <span className="uppercase tracking-widest border-r border-red-200 pr-2">Dietary Alert</span>
                        <span className="flex-1 truncate">
                          {data.specialMenuReq && shouldShowField(data, printMode, 'specialMenuReq', false, true) ? data.specialMenuReq + ' ' : ''} 
                          {data.allergies && shouldShowField(data, printMode, 'allergies', false, true) ? data.allergies : ''}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Staff Copy: Standard Boxes */}
                {copy.type === 'BQT' && (
                  <div className="grid grid-cols-4 gap-3 mb-4 text-center">
                    <div className="bg-slate-50 p-2 rounded border-l-4 border-slate-300"><span className="block text-[10px] font-bold text-slate-500 uppercase">Tables (席數)</span><span className="block text-3xl font-black">{data.tableCount}</span></div>
                    <div className="bg-slate-50 p-2 rounded border-l-4 border-slate-200"><span className="block text-[10px] font-bold text-slate-500 uppercase">Guests (人數)</span><span className="block text-3xl font-black">{data.guestCount}</span></div>
                    <div className="bg-slate-50 p-2 rounded border-l-4 border-[var(--brand-primary)]"><span className="block text-[10px] font-bold text-slate-500 uppercase">Style (上菜)</span><span className="block text-xl font-bold mt-1">{data.servingStyle || 'Standard'}</span></div>
                    <div className="bg-slate-50 p-2 rounded border-l-4 border-[var(--brand-accent)]"><span className="block text-[10px] font-bold text-slate-500 uppercase">Serving (起菜)</span><span className="block text-xl font-bold mt-1">{data.servingTime || 'TBC'}</span></div>
                  </div>
                )}

                {/* Staff Copy Allergy Alert (Original size) */}
                {copy.type === 'BQT' && (
                  <>
                    {( (data.specialMenuReq && shouldShowField(data, printMode, 'specialMenuReq', false, true)) || (data.allergies && shouldShowField(data, printMode, 'allergies', false, true)) ) && (
                      <div className="mb-4 p-3 border-4 border-red-600 bg-white rounded-lg flex items-start gap-3">
                        <div className="text-red-600 p-1 font-black text-xl">
                          <AlertTriangle size={32} />
                        </div>
                        <div>
                          <h3 className="text-red-600 font-bold text-[10px] uppercase underline">Allergy / Special Diet Alert</h3>
                          <p className="text-2xl font-black text-red-600 leading-tight">
                            {data.specialMenuReq && shouldShowField(data, printMode, 'specialMenuReq', false, true) ? data.specialMenuReq + ' ' : ''} 
                            {data.allergies && shouldShowField(data, printMode, 'allergies', false, true) ? data.allergies : ''}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {copy.showOps && (
                  <div className="operational-container">
                    {/* Left Column: Menu - Completely Independent */}
                    <div className="operational-column">
                      <div className="border-2 border-[var(--brand-primary)] rounded-xl bg-slate-50 box-decoration-clone mb-4">
                        <div className="bg-[var(--brand-primary)] text-white px-3 py-1.5 font-bold text-sm uppercase rounded-t-[10px]">🍽️ Menu (菜單)</div>
                        <div className="p-4">
                          <div className="space-y-4">
                            {data.menus && data.menus.map((m, i) => (
                              <div key={i} className="break-inside-avoid">
                                {m.title && <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{m.title}</div>}
                                <p className="text-sm font-bold text-slate-900 leading-relaxed whitespace-pre-wrap font-serif border-l-2 border-slate-300 pl-3">{onlyChinese(m.content)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-[var(--brand-primary)]/5 p-4 border-t border-[var(--brand-primary)]/10 rounded-b-[10px]">
                          <div className="flex items-start gap-3">
                            <Coffee size={20} className="text-[var(--brand-primary)] mt-0.5" />
                            <div><span className="block text-xs font-bold text-[var(--brand-primary)] uppercase">Beverage Package</span><span className="block text-base font-bold text-slate-800">{data.drinksPackage || 'None'}</span></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Trio - Completely Independent */}
                    <div className="operational-column">
                        {(data.rundown || []).some(r => r.time || r.activity) && (
                        <div className="border-2 border-slate-200 rounded-xl box-decoration-clone mb-4">
                          <div className="bg-[var(--brand-primary)] text-white px-3 py-1.5 font-bold text-sm uppercase flex justify-between items-center rounded-t-[10px]"><span>📋 Rundown (流程)</span></div>
                          <div className="p-3">
                            <table className="w-full text-xs"><tbody className="divide-y divide-slate-100">{data.rundown.filter(r => r.time || r.activity).map((item, i) => (<tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}><td className="py-2 pl-2 w-14 font-mono font-bold text-slate-900 align-top">{item.time}</td><td className="py-2 pr-2 font-bold text-slate-700">{item.activity}</td></tr>))}</tbody></table>
                          </div>
                        </div>
                        )}

                        {copy.type !== 'BQT' && (
                          <>
                            <div className="border-2 border-slate-200 rounded-xl box-decoration-clone mb-4">
                              <div className="bg-[var(--brand-primary)] text-white px-3 py-1.5 font-bold text-sm uppercase rounded-t-[10px]">🚍 Logistics (物流)</div>
                              <div className="p-3 space-y-3">
                                {data.busInfo && data.busInfo.enabled ? (
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-[var(--brand-primary)]/5 p-2 rounded border border-[var(--brand-primary)]/10"><span className="block font-bold text-[var(--brand-primary)] mb-1">Arrival (接載)</span>{data.busInfo.arrivals && data.busInfo.arrivals.length > 0 ? data.busInfo.arrivals.map((b, i) => (<div key={i} className="font-mono font-bold">{b.time} <span className="font-sans font-normal text-[10px]">({b.location})</span></div>)) : <span className="text-slate-400">-</span>}</div>
                                    <div className="bg-[var(--brand-primary)]/5 p-2 rounded border border-[var(--brand-primary)]/10"><span className="block font-bold text-[var(--brand-primary)] mb-1">Departure (散席)</span>{data.busInfo.departures && data.busInfo.departures.length > 0 ? data.busInfo.departures.map((b, i) => (<div key={i} className="font-mono font-bold">{b.time} <span className="font-sans font-normal text-[10px]">({b.location})</span></div>)) : <span className="text-slate-400">-</span>}</div>
                                  </div>
                                ) : <div className="text-xs text-slate-400 text-center italic">No Bus Arrangement</div>}
                                <div className="flex justify-between items-center text-xs"><span className="font-bold text-slate-600">Parking:</span><span className="font-bold bg-slate-100 px-2 py-0.5 rounded">{(data.parkingInfo?.ticketQty) || 0} 張 x {(data.parkingInfo?.ticketHours) || 0} 小時</span></div>
                              </div>
                            </div>
                            <div className="border-2 border-slate-200 rounded-xl box-decoration-clone mb-4">
                              <div className="bg-[var(--brand-primary)] text-white px-3 py-1.5 font-bold text-sm uppercase rounded-t-[10px]">🛠️ Setup (場地)</div>
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
                                {data.otherNotes && shouldShowField(data, printMode, 'otherNotes', true, true) && (<div className="col-span-2 mt-2 pt-2 border-t border-slate-100"><span className="block text-[9px] text-[var(--brand-accent)] font-bold uppercase mb-1">Remarks / Attention</span><p className="font-bold text-slate-900">{data.otherNotes}</p></div>)}
                              </div>
                            </div>
                          </>
                        )}
                        {( (data.generalRemarks && shouldShowField(data, printMode, 'generalRemarks', true, true)) || (data.remarks && shouldShowField(data, printMode, 'remarks', false, true)) || ((data.noteLog || []).some(n => (n.text || '').trim()) && shouldShowField(data, printMode, 'remarks', false, true)) ) && (
                          <div className={`border-2 ${copy.type === 'STD' ? 'border-slate-800' : 'border-[var(--brand-accent)]/30'} ${copy.type === 'STD' ? 'bg-slate-50' : 'bg-[var(--brand-accent)]/5'} rounded-xl shadow-sm box-decoration-clone mb-4`}>
                            <div className={`${copy.type === 'STD' ? 'bg-slate-800 text-white' : 'bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]'} px-3 py-1.5 font-bold text-sm uppercase border-b border-slate-200 rounded-t-[10px]`}>
                              {copy.type === 'STD' ? '📋 Internal & General Remarks (管理備註)' : '備註 (Remarks)'}
                            </div>
                            <div className={`p-3 text-xs font-bold ${copy.type === 'STD' ? 'text-slate-900' : 'text-[var(--brand-accent)]'} whitespace-pre-wrap leading-relaxed`}>
                              {data.generalRemarks && shouldShowField(data, printMode, 'generalRemarks', true, true) ? (
                                <div className="mb-2 pb-2 border-b border-slate-200">
                                  <span className="text-[10px] text-slate-400 block mb-1 uppercase tracking-tighter font-black">General Notes:</span>
                                  {data.generalRemarks}
                                </div>
                              ) : ''}
                              {data.remarks && shouldShowField(data, printMode, 'remarks', false, true) ? (
                                <div className="break-inside-avoid">
                                  <span className="text-[10px] text-red-600 block mb-1 uppercase tracking-tighter font-black">⚠️ Internal Staff Only:</span>
                                  {data.remarks}
                                </div>
                              ) : ''}
                              {(data.noteLog || []).some(n => (n.text || '').trim()) && shouldShowField(data, printMode, 'remarks', false, true) ? (
                                <div className="break-inside-avoid mt-2 pt-2 border-t border-slate-200">
                                  <span className="text-[10px] text-red-600 block mb-1 uppercase tracking-tighter font-black">⚠️ Internal Notes (內部備註):</span>
                                  <div className="space-y-1 font-normal">
                                    {(data.noteLog || []).filter(n => (n.text || '').trim()).map(n => (
                                      <div key={n.id} className="text-[11px] leading-snug">
                                        <span className="text-slate-400 font-mono">{n.ts ? new Date(n.ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}{n.author ? ` · ${n.author}` : ''}: </span>
                                        <span className="text-slate-900 font-bold whitespace-pre-wrap">{n.text}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : ''}
                            </div>
                            {copy.type === 'STD' && (
                              <div className="p-3 bg-white border-t border-slate-100 min-h-[80px] break-inside-avoid rounded-b-[10px]">
                                <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest block mb-4">Manager's Handwritten Notes / Approvals:</span>
                                <div className="border-b border-slate-100 w-full mb-4"></div>
                                <div className="border-b border-slate-100 w-full mb-4"></div>
                                <div className="border-b border-slate-100 w-full"></div>
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                )}

                {copy.showBilling && (
                  <div className="mt-8 pt-4">
                    <h3 className="text-sm font-black text-[var(--brand-primary)] uppercase tracking-widest mb-4 flex items-center gap-2">
                      💰 Financial Details (財務詳情)
                    </h3>
                    <table className="w-full text-xs compact-table">
                      <thead><tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 bg-slate-50">項目 (Item)</th>
                        <th className="text-right py-2 px-3 bg-slate-50">單價 (Price)</th>
                        <th className="text-center py-2 px-3 bg-slate-50">數量 (Qty)</th>
                        <th className="text-right py-2 px-3 bg-slate-50">金額 (Amount)</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {billing.parsedMenus.map((m, i) => (<tr key={`m-${i}`}><td className="py-2 px-3 font-medium">{m.title}</td><td className="py-2 px-3 text-right font-mono text-slate-500">${formatMoney(m.cleanPrice)}</td><td className="py-2 px-3 text-center text-slate-500">{m.cleanQty}</td><td className="py-2 px-3 text-right font-mono font-bold">${formatMoney(m.amount)}</td></tr>))}
                        {billing.drinks && (<tr><td className="py-2 px-3 font-medium">酒水套餐 ({billing.drinks.label})</td><td className="py-2 px-3 text-right font-mono text-slate-500">${formatMoney(billing.drinks.price)}</td><td className="py-2 px-3 text-center text-slate-500">{billing.drinks.qty}</td><td className="py-2 px-3 text-right font-mono font-bold">${formatMoney(billing.drinks.amount)}</td></tr>)}
                        {billing.plating && (<tr><td className="py-2 px-3 font-medium">位上服務費</td><td className="py-2 px-3 text-right font-mono text-slate-500">${formatMoney(billing.plating.price)}</td><td className="py-2 px-3 text-center text-slate-500">{billing.plating.qty}</td><td className="py-2 px-3 text-right font-mono font-bold">${formatMoney(billing.plating.amount)}</td></tr>)}
                        {billing.setupPackagePrice > 0 && (<tr><td className="py-2 px-3 font-medium">舞台與接待設備套票</td><td className="py-2 px-3 text-right font-mono text-slate-500">${formatMoney(billing.setupPackagePrice)}</td><td className="py-2 px-3 text-center text-slate-500">1</td><td className="py-2 px-3 text-right font-mono font-bold">${formatMoney(billing.setupPackagePrice)}</td></tr>)}
                        {billing.avPackagePrice > 0 && (<tr><td className="py-2 px-3 font-medium">影音設備套票</td><td className="py-2 px-3 text-right font-mono text-slate-500">${formatMoney(billing.avPackagePrice)}</td><td className="py-2 px-3 text-center text-slate-500">1</td><td className="py-2 px-3 text-right font-mono font-bold">${formatMoney(billing.avPackagePrice)}</td></tr>)}
                        {billing.decorPackagePrice > 0 && (<tr><td className="py-2 px-3 font-medium">場地佈置套票</td><td className="py-2 px-3 text-right font-mono text-slate-500">${formatMoney(billing.decorPackagePrice)}</td><td className="py-2 px-3 text-center text-slate-500">1</td><td className="py-2 px-3 text-right font-mono font-bold">${formatMoney(billing.decorPackagePrice)}</td></tr>)}
                        {billing.parsedCustomItems.map((item, i) => (<tr key={`c-${i}`}><td className="py-2 px-3">{item.name}</td><td className="py-2 px-3 text-right font-mono text-slate-500">${formatMoney(item.cleanPrice)}</td><td className="py-2 px-3 text-center text-slate-500">{item.cleanQty}</td><td className="py-2 px-3 text-right font-mono font-bold">${formatMoney(item.amount)}</td></tr>))}
                        {billing.bus && (<tr><td className="py-2 px-3 font-bold">旅遊巴安排</td><td className="py-2 px-3 text-right font-mono text-slate-500">${formatMoney(billing.bus.amount)}</td><td className="py-2 px-3 text-center text-slate-500">1</td><td className="py-2 px-3 text-right font-mono font-bold">${formatMoney(billing.bus.amount)}</td></tr>)}
                        
                        {billing.serviceChargeVal > 0 && (
                          <tr className="bg-slate-50/50 text-slate-500">
                            <td colSpan="3" className="py-2 px-3 text-right font-bold">服務費 (Service Charge {billing.scLabel})</td>
                            <td className="py-2 px-3 text-right font-mono font-bold">+${formatMoney(billing.serviceChargeVal)}</td>
                          </tr>
                        )}
                        {billing.discountVal > 0 && (
                          <tr className="bg-slate-50/50 text-rose-600">
                            <td colSpan="3" className="py-2 px-3 text-right font-bold">折扣優惠 (Discount)</td>
                            <td className="py-2 px-3 text-right font-mono font-bold">-${formatMoney(billing.discountVal)}</td>
                          </tr>
                        )}
                        {billing.ccSurcharge > 0 && (
                          <tr className="bg-slate-50/50 text-slate-500">
                            <td colSpan="3" className="py-2 px-3 text-right font-bold">信用卡附加費 (CC Surcharge {billing.ccSurchargePercent}%)</td>
                            <td className="py-2 px-3 text-right font-mono font-bold">+${formatMoney(billing.ccSurcharge)}</td>
                          </tr>
                        )}

                        <tr className="border-t border-slate-200 bg-slate-50 text-slate-500 italic">
                          <td colSpan="3" className="py-2 px-3 text-right font-bold">已付金額 (Total Paid)</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">${formatMoney(billing.totalPaid)}</td>
                        </tr>
                        {/* Deposit Breakdown for Finance Copy */}
                        {[
                          { label: '第一期定金 (1st Dep)', amount: billing.dep1, received: data.deposit1Received, date: data.deposit1Date },
                          { label: '第二期定金 (2nd Dep)', amount: billing.dep2, received: data.deposit2Received, date: data.deposit2Date },
                          { label: '第三期定金 (3rd Dep)', amount: billing.dep3, received: data.deposit3Received, date: data.deposit3Date }
                        ].map((p, i) => p.amount > 0 && (
                          <tr key={`dep-${i}`} className="bg-white text-[10px] text-slate-400 italic">
                            <td colSpan="3" className="py-1 px-3 text-right">
                              {p.label} ({p.date || 'TBC'}) 
                              {p.received && <span className="ml-2 not-italic font-bold text-emerald-600"> RECEIVED </span>}
                            </td>
                            <td className="py-1 px-3 text-right font-mono">${formatMoney(p.amount)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-slate-900 bg-slate-50"><td colSpan="3" className="py-3 px-3 text-right font-black uppercase tracking-widest text-slate-900">總金額 (TOTAL)</td><td className="py-3 px-3 text-right font-black font-mono text-lg text-[var(--brand-primary)]">${formatMoney(billing.grandTotal)}</td></tr>
                        <tr className="border-t-2 border-slate-900 bg-slate-900 text-white">
                          <td colSpan="3" className="py-3 px-3 text-right font-black uppercase tracking-widest">餘額 (BALANCE DUE)</td>
                          <td className="py-3 px-3 text-right font-black font-mono text-lg text-amber-400">${formatMoney(billing.balanceDue)}</td>
                        </tr>
                      </tbody>
                    </table>

                    {copy.showAllocation && (
                      <div className="mt-8 pt-4 border-t-2 border-dashed border-slate-300">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                          📊 撇數項目
                        </h3>
                        <table className="w-full text-[10px] border-collapse table-fixed">
                          <thead><tr className="border-b-2 border-slate-800 bg-slate-100 text-slate-600"><th className="text-left py-2 px-2">部門</th><th className="text-left py-2 px-2">項目</th><th className="text-right py-2 px-2">單價</th><th className="text-center py-2 px-2">數量</th><th className="text-right py-2 px-2">總額</th><th className="text-right py-2 px-2">%</th></tr></thead>
                          <tbody>
                            {Object.values(displayAlloc).map((dept, i) => {
                              if (dept.total === 0 && dept.items.length === 0) return null;
                              return (
                                <React.Fragment key={i}>
                                  {dept.items.map((item, idx) => (
                                    <tr key={`${i}-${idx}`} className={idx === 0 ? "border-t border-slate-200" : ""}>
                                      <td className={`py-1.5 px-2 align-top ${idx === 0 ? 'font-black text-slate-900' : ''}`}>{idx === 0 ? dept.label : ''}</td>
                                      <td className="py-1.5 px-2 align-top text-slate-600">{item.name}</td>
                                      <td className="py-1.5 px-2 text-right font-mono text-slate-400">${formatMoney(item.unit)}</td>
                                      <td className="py-1.5 px-2 text-center text-slate-400">{item.qty}</td>
                                      <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-700">${formatMoney(item.amount)}</td>
                                      <td className="py-1.5 px-2 text-right font-bold text-[9px] text-[var(--brand-primary)]">{idx === 0 ? (billing.subtotal > 0 ? ((dept.total / billing.subtotal) * 100).toFixed(1) + '%' : '0%') : ''}</td>
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
        </React.Fragment>
      ))}

      {((data.stageDecorPhotos && data.stageDecorPhotos.length > 0) || (data.venueDecorPhotos && data.venueDecorPhotos.length > 0) || data.stageDecorPhoto || data.venueDecorPhoto) && (
        <React.Fragment>
          <div className="page-break"></div>
          <div className="print-page p-[10mm] print:p-0">
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
        </React.Fragment>
      )}
    </div>
  );
};

export default EventOrderRenderer;