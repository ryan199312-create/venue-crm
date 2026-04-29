import React from 'react';
import {
  formatMoney,
  equipmentMap,
  avMap,
  decorationMap,
  generateBillingSummary,
  DEPARTMENTS
} from '../../../../services/billingService';

export { formatMoney, generateBillingSummary, DEPARTMENTS };

// ==========================================
// SHARED UTILITIES
// ==========================================

export const shouldShowField = (data, printMode, field, defaultClient, defaultInternal) => {
  const isInternal = printMode === 'BRIEFING' || !printMode || printMode === 'EO' || printMode === 'KITCHEN';
  const isClient = ['QUOTATION', 'CONTRACT', 'CONTRACT_CN', 'INVOICE', 'RECEIPT', 'MENU_CONFIRM', 'ADDENDUM', 'FLOORPLAN'].includes(printMode);
  const showClient = data[`${field}ShowClient`] !== undefined ? data[`${field}ShowClient`] : defaultClient;
  
  const showInternal = data[`${field}ShowInternal`] !== undefined ? data[`${field}ShowInternal`] : defaultInternal;
  return (isClient && showClient) || (isInternal && showInternal);
};

export const onlyChinese = (text) => {
  if (!text) return '';
  // Keep lines that have Chinese characters OR are just numbers/punctuation/whitespace (common in menus)
  return text.split('\n').filter(line => 
    /[\u4e00-\u9fa5]/.test(line) || (line.trim().length > 0 && /^[0-9\s.,()\-:：]*$/.test(line.trim()))
  ).join('\n');
};

export const cleanLocation = (loc) => loc ? loc.replace(/^,\s*/, '') : '';

export const getVenueEn = (loc, appSettings) => {
  let clean = cleanLocation(loc);
  const zonesConfig = appSettings?.zonesConfig || [];
  
  // Create a map from dynamic zones
  const map = {
    '全場': 'Whole Venue'
  };
  zonesConfig.forEach(z => {
    if (z.nameZh && z.nameEn) {
      map[z.nameZh] = z.nameEn;
      // Also map the combined string if it was saved that way
      map[`${z.nameZh} (${z.nameEn})`] = z.nameEn;
    }
  });

  // Fallback for hardcoded ones if not in zonesConfig
  const fallbacks = {
    '紅區': 'Red Zone', '黃區': 'Yellow Zone', '綠區': 'Green Zone', '藍區': 'Blue Zone'
  };
  for (let key in fallbacks) {
    if (!map[key]) map[key] = fallbacks[key];
  }

  for (let key in map) {
    clean = clean.replace(new RegExp(key, 'g'), map[key]);
  }
  return clean;
};

export const formatDateEn = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', weekday: 'short' });
};

export const formatDateWithDay = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-HK', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
};

export const getSignatures = (data, printMode) => {
  const sigData = data.signatures?.[printMode] || {};
  const hasAnyNewSignatures = data.signatures && Object.keys(data.signatures).length > 0;
  const clientSig = sigData.client || (!hasAnyNewSignatures ? data.clientSignature : null);
  const adminSig = sigData.admin;
  return { clientSig, adminSig, sigData };
};

export const getIssueDate = (data) => {
  if (data.printSettings?.general?.issueDateOverride) {
    const overrideDate = new Date(data.printSettings.general.issueDateOverride);
    if (!isNaN(overrideDate.getTime())) return overrideDate;
  }
  return new Date();
};

export const getPackageStrings = (data, isEn = false) => {
  const setupStrArr = Object.entries(data.equipment || {}).filter(([k, v]) => v === true && equipmentMap?.[k]).map(([k]) => {
    const fullStr = equipmentMap[k];
    const match = fullStr.match(/\((.*?)\)/);
    return isEn && match ? match[1] : fullStr.split(' (')[0];
  });
  if (data.equipment?.nameSign && data.nameSignText) setupStrArr.push(isEn ? `Name Sign: ${data.nameSignText}` : `字牌: ${data.nameSignText}`);
  if (data.equipment?.hasCake && data.cakePounds) setupStrArr.push(isEn ? `Wedding Cake: ${data.cakePounds} Lbs` : `蛋糕: ${data.cakePounds}磅`);

  const avStr = Object.entries(data.equipment || {}).filter(([k, v]) => v === true && avMap?.[k]).map(([k]) => {
    const fullStr = avMap[k];
    const match = fullStr.match(/\((.*?)\)/);
    return isEn && match ? match[1] : fullStr.split(' (')[0];
  }).join(', ');

  const decorStrArr = Object.entries(data.decoration || {}).filter(([k, v]) => v === true && decorationMap?.[k]).map(([k]) => {
    const fullStr = decorationMap[k];
    const match = fullStr.match(/\((.*?)\)/);
    return isEn && match ? match[1] : fullStr.split(' (')[0];
  });
  if (data.decoration?.hasFlowerPillar && data.flowerPillarQty) decorStrArr.push(isEn ? `Floral Pillars: ${data.flowerPillarQty}` : `花柱: ${data.flowerPillarQty}支`);
  if (data.decoration?.hasMahjong && data.mahjongTableQty) decorStrArr.push(isEn ? `Mahjong: ${data.mahjongTableQty} sets` : `麻雀: ${data.mahjongTableQty}張`);
  if (data.decoration?.hasInvitation && data.invitationQty) decorStrArr.push(isEn ? `Invitations: ${data.invitationQty}套` : `喜帖: ${data.invitationQty}套`);
  if (data.decoration?.hasCeremonyChair && data.ceremonyChairQty) decorStrArr.push(isEn ? `Ceremony Chairs: ${data.ceremonyChairQty}` : `婚椅: ${data.ceremonyChairQty}張`);

  return { setupStr: setupStrArr.join(', '), avStr, decorStr: decorStrArr.join(', ') };
};

// ==========================================
// SHARED UI COMPONENTS
// ==========================================

export const DocumentHeader = ({ data, typeEn, typeZh }) => (
  <div className="flex justify-between items-start border-b-[3px] pb-6 mb-8" style={{ borderColor: '#A57C00' }}>
    <div className="max-w-[60%]">
      <div className="mb-2 flex items-center gap-3" style={{ color: '#A57C00' }}>
        <span className="text-4xl font-black tracking-tight leading-none">璟瓏軒</span>
        <span className="text-sm font-bold tracking-[0.2em] uppercase mt-1">King Lung Heen</span>
      </div>
      <div className="text-[10px] text-slate-500 mt-3 font-medium leading-relaxed">
        <p>4/F, Hong Kong Palace Museum, 8 Museum Drive, West Kowloon</p>
        <p>Tel: +852 2788 3939 | Email: banquet@kinglungheen.com</p>
      </div>
    </div>
    <div className="text-right">
      <h1 className="text-3xl md:text-4xl font-light text-slate-800 uppercase tracking-widest mb-1">{typeEn}</h1>
      {typeZh && <h2 className="text-sm font-bold text-[#A57C00] uppercase tracking-widest mb-3">{typeZh}</h2>}
      <div className="text-right space-y-1 mt-2">
        <div className="text-xs flex justify-end gap-2"><span className="font-bold text-slate-400 uppercase tracking-wider w-12 text-left">No.</span> <span className="font-mono font-bold text-slate-800">{data.orderId}</span></div>
        <div className="text-xs flex justify-end gap-2"><span className="font-bold text-slate-400 uppercase tracking-wider w-12 text-left">Date.</span> <span className="font-mono font-bold text-slate-800">{formatDateEn(getIssueDate(data))}</span></div>
      </div>
    </div>
  </div>
);

export const ClientInfoGrid = ({ data, hideClientInfo = false, appSettings }) => (
  <div className="grid grid-cols-2 gap-12 mb-8 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
    <div>
      <h3 className="text-[10px] font-black text-[#A57C00] uppercase tracking-widest mb-3 border-b border-slate-200 pb-1.5">Bill To (客戶)</h3>
      {!hideClientInfo ? (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-black text-slate-900 uppercase tracking-tight leading-tight">{data.clientName}</p>
            {data.companyName && <p className="text-[10px] text-slate-500 font-medium">{data.companyName}</p>}
          </div>
          <div className="space-y-1 pt-1 border-t border-slate-100">
            <div className="flex gap-2 text-xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase w-10 shrink-0 pt-0.5">Tel:</span>
              <span className="font-bold text-slate-800">{data.clientPhone}</span>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase w-10 shrink-0 pt-0.5">Email:</span>
              <span className="font-bold text-slate-800 break-all flex-1">{data.clientEmail || 'N/A'}</span>
            </div>
          </div>
        </div>
      ) : <div className="py-2 text-xs text-slate-400 italic">(Client details hidden)</div>}
    </div>
    <div>
      <h3 className="text-[10px] font-black text-[#A57C00] uppercase tracking-widest mb-3 border-b border-slate-200 pb-1.5">Event Details (活動)</h3>
      <div className="space-y-3">
        <div>
          <p className="text-sm font-black text-slate-900 uppercase tracking-tight leading-tight">{data.eventName}</p>
          <p className="text-[10px] text-slate-500 font-medium">{getVenueEn(data.venueLocation, appSettings)}</p>
        </div>
        <div className="space-y-1 pt-1 border-t border-slate-100">
          <div className="flex gap-2 text-xs">
            <span className="text-[9px] font-bold text-slate-400 uppercase w-10 shrink-0 pt-0.5">Date:</span>
            <span className="font-bold text-slate-800">{formatDateEn(data.date)} ({data.startTime}-{data.endTime})</span>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="text-[9px] font-bold text-slate-400 uppercase w-10 shrink-0 pt-0.5">Pax:</span>
            <span className="font-bold text-slate-800">{data.tableCount} Tables / {data.guestCount} Pax</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const ItemTable = ({ billing, setupStr, avStr, decorStr, isEn = false, showFinancials = false, showPayments = false, data = {}, grandTotalLabel = null }) => (
  <div className="mb-8 rounded-xl border border-slate-200 overflow-hidden break-inside-avoid shadow-sm">
    <table className="w-full text-xs text-left">
      <thead className="bg-slate-50 border-b border-slate-200">
        <tr>
          <th className="py-2 px-4 uppercase tracking-wider text-slate-500 font-bold w-[55%]">Description (項目)</th>
          <th className="py-2 px-4 uppercase tracking-wider text-slate-500 font-bold text-right w-[15%]">Unit Price</th>
          <th className="py-2 px-4 uppercase tracking-wider text-slate-500 font-bold text-center w-[10%]">Qty</th>
          <th className="py-2 px-4 uppercase tracking-wider text-slate-500 font-bold text-right w-[20%]">Amount (HKD)</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {billing.parsedMenus.map((m, i) => (
          <tr key={`m-${i}`} className="bg-white">
            <td className="py-3 px-4 align-top">
              <p className="font-bold text-slate-900 mb-0.5">{m.title}</p>
              <p className="text-[10px] text-slate-500 whitespace-pre-wrap leading-snug">
                {isEn ? m.content : onlyChinese(m.content)}
              </p>
            </td>
            <td className="py-3 px-4 text-right align-top font-mono text-slate-600">${formatMoney(m.cleanPrice)}</td>
            <td className="py-3 px-4 text-center align-top text-slate-600">{m.cleanQty}</td>
            <td className="py-3 px-4 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(m.amount)}</td>
          </tr>
        ))}
        {billing.plating && (
          <tr className="bg-white">
            <td className="py-3 px-4 align-top">
              <p className="font-bold text-slate-900">{isEn ? 'Plating Service Fee' : '位上服務費'}</p>
            </td>
            <td className="py-3 px-4 text-right align-top font-mono text-slate-600">${formatMoney(billing.plating.price)}</td>
            <td className="py-3 px-4 text-center align-top text-slate-600">{billing.plating.qty}</td>
            <td className="py-3 px-4 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(billing.plating.amount)}</td>
          </tr>
        )}
        {billing.drinks && (
          <tr className="bg-white">
            <td className="py-3 px-4 align-top">
              <p className="font-bold text-slate-900 mb-0.5">{isEn ? 'Beverage Package' : '酒水套餐'}</p>
              <p className="text-[10px] text-slate-500 whitespace-pre-wrap leading-snug">{billing.drinks.label}</p>
            </td>
            <td className="py-3 px-4 text-right align-top font-mono text-slate-600">${formatMoney(billing.drinks.price)}</td>
            <td className="py-3 px-4 text-center align-top text-slate-600">{billing.drinks.qty}</td>
            <td className="py-3 px-4 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(billing.drinks.amount)}</td>
          </tr>
        )}
        {billing.setupPackagePrice > 0 && (
          <tr className="bg-white">
            <td className="py-3 px-4 align-top">
              <p className="font-bold text-slate-900 mb-0.5">{isEn ? 'Setup & Reception Package' : '舞台與接待設備套票'}</p>
              <p className="text-[10px] text-slate-500 leading-snug">{setupStr}</p>
            </td>
            <td className="py-3 px-4 text-right align-top font-mono text-slate-600">${formatMoney(billing.setupPackagePrice)}</td>
            <td className="py-3 px-4 text-center align-top text-slate-600">1</td>
            <td className="py-3 px-4 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(billing.setupPackagePrice)}</td>
          </tr>
        )}
        {billing.avPackagePrice > 0 && (
          <tr className="bg-white">
            <td className="py-3 px-4 align-top">
              <p className="font-bold text-slate-900 mb-0.5">{isEn ? 'AV Equipment Package' : '影音設備套票'}</p>
              <p className="text-[10px] text-slate-500 leading-snug">{avStr}</p>
            </td>
            <td className="py-3 px-4 text-right align-top font-mono text-slate-600">${formatMoney(billing.avPackagePrice)}</td>
            <td className="py-3 px-4 text-center align-top text-slate-600">1</td>
            <td className="py-3 px-4 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(billing.avPackagePrice)}</td>
          </tr>
        )}
        {billing.decorPackagePrice > 0 && (
          <tr className="bg-white">
            <td className="py-3 px-4 align-top">
              <p className="font-bold text-slate-900 mb-0.5">{isEn ? 'Venue Decoration Package' : '場地佈置套票'}</p>
              <p className="text-[10px] text-slate-500 leading-snug">{decorStr}</p>
            </td>
            <td className="py-3 px-4 text-right align-top font-mono text-slate-600">${formatMoney(billing.decorPackagePrice)}</td>
            <td className="py-3 px-4 text-center align-top text-slate-600">1</td>
            <td className="py-3 px-4 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(billing.decorPackagePrice)}</td>
          </tr>
        )}
        {billing.bus && (
          <tr className="bg-white">
            <td className="py-3 px-4 align-top">
              <p className="font-bold text-slate-900 mb-0.5">{isEn ? 'Bus Arrangement' : '旅遊巴安排'}</p>
              {isEn && (
                <p className="text-[10px] text-slate-500 whitespace-pre-wrap leading-snug">
                  {billing.bus.arrivals.length > 0 && `Arrivals: ${billing.bus.arrivals.length} Buses `}
                  {billing.bus.departures.length > 0 && `| Departures: ${billing.bus.departures.length} Buses`}
                </p>
              )}
            </td>
            <td className="py-3 px-4 text-right align-top font-mono text-slate-600">${formatMoney(billing.bus.amount)}</td>
            <td className="py-3 px-4 text-center align-top text-slate-600">1</td>
            <td className="py-3 px-4 text-right align-top font-bold text-slate-900 font-mono">
              {billing.bus.amount > 0 ? `$${formatMoney(billing.bus.amount)}` : (isEn ? 'COMP' : '免費')}
            </td>
          </tr>
        )}
        {billing.parsedCustomItems.map((item, i) => (
          <tr key={`c-${i}`} className="bg-white">
            <td className="py-3 px-4 align-top">
              <p className="font-bold text-slate-900">{item.name}</p>
            </td>
            <td className="py-3 px-4 text-right align-top font-mono text-slate-600">${formatMoney(item.cleanPrice)}</td>
            <td className="py-3 px-4 text-center align-top text-slate-600">{item.cleanQty}</td>
            <td className="py-3 px-4 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(item.amount)}</td>
          </tr>
        ))}
      </tbody>
      {showFinancials && (
        <tbody className="border-t-2 border-slate-900">
          <tr className="bg-slate-50/50">
            <td colSpan="3" className="py-2 px-4 text-right font-bold text-slate-500">Subtotal (小計)</td>
            <td className="py-2 px-4 text-right font-mono font-bold text-slate-800">${formatMoney(billing.subtotal)}</td>
          </tr>
          {billing.serviceChargeVal > 0 && (
            <tr className="bg-slate-50/50">
              <td colSpan="3" className="py-2 px-4 text-right font-bold text-slate-500">Service Charge ({billing.scLabel})</td>
              <td className="py-2 px-4 text-right font-mono font-bold text-slate-800">+${formatMoney(billing.serviceChargeVal)}</td>
            </tr>
          )}
          {billing.discountVal > 0 && (
            <tr className="bg-slate-50/50">
              <td colSpan="3" className="py-2 px-4 text-right font-bold text-rose-600">Discount (折扣)</td>
              <td className="py-2 px-4 text-right font-mono font-bold text-rose-600">-${formatMoney(billing.discountVal)}</td>
            </tr>
          )}
          {billing.ccSurcharge > 0 && (
            <tr className="bg-slate-50/50">
              <td colSpan="3" className="py-2 px-4 text-right font-bold text-slate-500">Credit Card Surcharge (3%)</td>
              <td className="py-2 px-4 text-right font-mono font-bold text-slate-800">+${formatMoney(billing.ccSurcharge)}</td>
            </tr>
          )}
          <tr className="bg-slate-50 border-t-2 border-slate-900">
            <td colSpan="3" className="py-3 px-4 text-right font-black uppercase tracking-widest text-base text-slate-900">
              {grandTotalLabel || (isEn ? "Grand Total (總金額)" : "總金額 (Grand Total)")}
            </td>
            <td className="py-3 px-4 text-right font-black text-xl font-mono text-[#A57C00]">${formatMoney(billing.grandTotal)}</td>
          </tr>
        </tbody>
      )}
      {showPayments && (
        <tbody className="border-t border-slate-200">
          {[
            { label: '1st Payment', date: data.deposit1Date, amount: billing.dep1, received: data.deposit1Received },
            { label: '2nd Payment', date: data.deposit2Date, amount: billing.dep2, received: data.deposit2Received },
            { label: '3rd Payment', date: data.deposit3Date, amount: billing.dep3, received: data.deposit3Received }
          ].map((p, i) => p.amount > 0 && (
            <tr key={`p-${i}`} className="bg-white text-slate-500 italic">
              <td colSpan="3" className="py-1 px-4 text-right">
                {p.label} ({p.date || 'TBC'}) 
                {p.received && <span className="ml-2 not-italic font-bold text-emerald-600 text-[9px] border border-emerald-200 bg-emerald-50 px-1 rounded">RECEIVED</span>}
              </td>
              <td className="py-1 px-4 text-right font-mono font-medium">${formatMoney(p.amount)}</td>
            </tr>
          ))}
          <tr className="bg-white">
            <td colSpan="3" className="py-2 px-4 text-right font-bold text-slate-500 uppercase">Total Paid (已付)</td>
            <td className="py-2 px-4 text-right font-mono font-bold text-emerald-600">${formatMoney(billing.totalPaid)}</td>
          </tr>
          <tr className="bg-slate-50 border-t border-slate-200">
            <td colSpan="3" className="py-3 px-4 text-right font-black uppercase tracking-widest text-slate-600">Balance Due (餘額)</td>
            <td className="py-3 px-4 text-right font-mono font-black text-xl text-slate-900">${formatMoney(billing.balanceDue)}</td>
          </tr>
        </tbody>
      )}
    </table>
  </div>
);

export const SignatureBox = ({ titleEn, labelEn, labelZh, sigDataUrl, onSign, dateStr, alignRight = false, isAdmin = false }) => (
  <div className={`w-full max-w-[220px] ${alignRight ? 'ml-auto text-right' : 'mr-auto text-left'}`}>
    <div className={`border-b-2 border-slate-800 h-16 mb-3 relative flex items-end ${alignRight ? 'justify-end' : 'justify-start'} bg-slate-50/30`}>
      {!sigDataUrl ? (
        onSign ? (
          <button type="button" onClick={onSign} className={`absolute inset-0 flex items-center justify-center w-full h-full transition-colors cursor-pointer border-2 border-dashed z-10 ${isAdmin ? 'bg-blue-50 hover:bg-blue-100 border-blue-400' : 'bg-amber-50 hover:bg-amber-100 border-amber-400'}`}>
          </button>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
          </div>
        )
      ) : (
        <img src={sigDataUrl} alt="Signature" className={`absolute bottom-0 max-h-16 max-w-full object-contain ${alignRight ? 'right-0' : 'left-0'}`} />
      )}
    </div>
    <p className="font-bold text-xs text-slate-800 tracking-wide mt-2">
      {titleEn && <>{titleEn}<br /></>}
      <span className="text-sm font-black text-slate-900 uppercase">{labelEn}</span>
    </p>
    {labelZh && (
      <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider">{labelZh}</p>
    )}
    {sigDataUrl && dateStr ? (
      <p className="text-[9px] text-slate-400 mt-0.5">Signed: {new Date(dateStr).toLocaleDateString()}</p>
    ) : (
      <p className={`text-[9px] text-slate-400 mt-2 flex items-end ${alignRight ? 'justify-end' : 'justify-start'}`}>
        Date: <span className="inline-block border-b border-slate-400 w-24 ml-2 h-3"></span>
      </p>
    )}
  </div>
);