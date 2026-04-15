import React from 'react';
import { AlertTriangle, Coffee } from 'lucide-react';
import {
  DEPARTMENTS,
  equipmentMap,
  avMap,
  decorationMap,
  formatMoney,
  safeFloat,
  generateBillingSummary
} from '../utils/vmsUtils';
import { TOOL_GROUPS } from '../components/FloorplanEditor';

const BRAND_COLOR = '#A57C00';

// Centralized Design Tokens for absolute consistency across all documents
export const STYLES = {
  pageClient: "font-sans text-slate-800 w-full max-w-[210mm] print:max-w-full print:w-full print:m-0 mx-auto bg-white p-8 md:p-12 min-h-[297mm] print:min-h-0 shadow-sm print:shadow-none print:p-0 relative flex flex-col text-[11px] leading-relaxed",
  pageInternal: "font-sans text-slate-900 w-full max-w-[210mm] print:max-w-full print:w-full print:m-0 mx-auto bg-white p-6 md:p-8 min-h-[297mm] print:min-h-0 shadow-sm print:shadow-none print:p-0 relative flex flex-col text-[11px] leading-normal",
  h1: "text-3xl md:text-4xl font-light text-slate-900 uppercase tracking-widest mb-1",
  h2: "text-xs font-black uppercase tracking-widest pb-1 border-b-2 inline-block mb-5",
  h3: "text-[10px] font-bold uppercase tracking-widest mb-2 text-[#A57C00]",
  textMeta: "text-[9px] text-slate-400 uppercase tracking-wider font-bold",
  textMoney: "font-mono font-bold text-slate-900 text-[12px]",
  table: "w-full text-[11px] text-left border-collapse",
  th: "bg-slate-50 border-y border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9px] py-2 px-3",
  td: "py-3 px-3 align-top border-b border-slate-100 text-slate-700",
  gridBox: "bg-slate-50 p-6 rounded-xl border border-slate-100",
};

// ==========================================
// SHARED UTILITIES & FORMATTERS
// ==========================================
export const shouldShowField = (data, printMode, field, defaultClient, defaultInternal) => {
  const isInternal = printMode === 'BRIEFING' || !printMode || printMode === 'EO' || printMode === 'KITCHEN';
  const isClient = ['QUOTATION', 'CONTRACT', 'CONTRACT_CN', 'INVOICE', 'RECEIPT', 'MENU_CONFIRM'].includes(printMode);
  const showClient = data[`${field}ShowClient`] !== undefined ? data[`${field}ShowClient`] : defaultClient;
  const showInternal = data[`${field}ShowInternal`] !== undefined ? data[`${field}ShowInternal`] : defaultInternal;
  return (isClient && showClient) || (isInternal && showInternal);
};

const onlyChinese = (text) => {
  if (!text) return '';
  return text.split('\n').filter(line => /[\u4e00-\u9fa5]/.test(line)).join('\n');
};

const cleanLocation = (loc) => loc ? loc.replace(/^,\s*/, '') : '';

const getVenueEn = (loc) => {
  let clean = cleanLocation(loc);
  const map = {
    '紅區': 'Red Zone', '黃區': 'Yellow Zone', '綠區': 'Green Zone',
    '藍區': 'Blue Zone', '全場': 'Whole Venue'
  };
  for (let key in map) {
    clean = clean.replace(new RegExp(key, 'g'), map[key]);
  }
  return clean;
};

const formatDateEn = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', weekday: 'short' });
};

const formatDateWithDay = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-HK', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
};

const getSignatures = (data, printMode) => {
  const sigData = data.signatures?.[printMode] || {};
  
  let clientSig = sigData.client;
  let clientDate = clientSig ? sigData.clientDate : null;

  // Safely fallback to legacy global signature only for old quotations/contracts
  if (!clientSig && data.clientSignature && !data.signatures?.[printMode]) {
    if (printMode === 'QUOTATION' || printMode === 'CONTRACT' || printMode === 'CONTRACT_CN') {
      clientSig = data.clientSignature;
      clientDate = data.clientSignatureDate;
    }
  }
  
  const adminSig = sigData.admin;
  const adminDate = adminSig ? sigData.adminDate : null;
  return { clientSig, adminSig, sigData: { ...sigData, clientDate, adminDate } };
};

const getBalanceDueDate = (data) => {
  let balanceDueDateDisplay = data.date;
  if (data.balanceDueDateType === 'manual' && data.balanceDueDateOverride) {
    balanceDueDateDisplay = data.balanceDueDateOverride;
  } else if (data.balanceDueDateType === '10daysPrior' && data.date) {
    const d = new Date(data.date);
    d.setDate(d.getDate() - 10);
    if (!isNaN(d.getTime())) balanceDueDateDisplay = d.toISOString().split('T')[0];
  }
  return balanceDueDateDisplay;
};

const getPackageStrings = (data, isEn = false) => {
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
  if (data.decoration?.hasInvitation && data.invitationQty) decorStrArr.push(isEn ? `Invitations: ${data.invitationQty} sets` : `喜帖: ${data.invitationQty}套`);
  if (data.decoration?.hasCeremonyChair && data.ceremonyChairQty) decorStrArr.push(isEn ? `Ceremony Chairs: ${data.ceremonyChairQty}` : `婚椅: ${data.ceremonyChairQty}張`);

  return { setupStr: setupStrArr.join(', '), avStr, decorStr: decorStrArr.join(', ') };
};

// ==========================================
// SHARED UI COMPONENTS
// ==========================================
const FloorplanAppendix = ({ data, appSettings, isStandalone = false }) => {
  if (!data.floorplan) return null;
  const fp = data.floorplan;
  const elements = fp.elements || [];
  const bgImage = fp.bgImage || appSettings?.defaultFloorplan?.bgImage || '';
  const itemScale = fp.itemScale || appSettings?.defaultFloorplan?.itemScale || 40;
  const zones = fp.zones || appSettings?.defaultFloorplan?.zones || [];
  
  const selectedLocs = data.selectedLocations || [];
  const isWholeVenue = selectedLocs.includes('全場');
  const visibleZones = zones.filter(z => isWholeVenue || selectedLocs.includes(z.name));

  // If the map is completely empty, don't render the appendix at all
  if (elements.length === 0 && visibleZones.length === 0) return null;

  // Dynamically calculate the bounding box to ensure the map scales perfectly
  let maxX = 1200;
  let maxY = 800;
  elements.forEach(el => {
    const w = (el.w_m || (el.w ? el.w / 40 : 1)) * itemScale;
    const h = (el.h_m || (el.h ? el.h / 40 : 1)) * itemScale;
    maxX = Math.max(maxX, (el.x || 0) + w);
    maxY = Math.max(maxY, (el.y || 0) + h);
  });
  visibleZones.forEach(z => {
    z.points.forEach(p => {
      maxX = Math.max(maxX, p.x_m * itemScale);
      maxY = Math.max(maxY, p.y_m * itemScale);
    });
  });
  maxX += 40; // Safe padding
  maxY += 40;
  
  const scale = Math.min(720 / maxX, 800 / maxY, 1);
  const containerHeight = Math.max(400, maxY * scale);

  return (
    <>
      {!isStandalone && <div className="page-break my-12 print:my-0"></div>}
      <div className={`print-page ${isStandalone ? '' : 'p-8 md:p-10 print:p-0 print:pt-6'}`}>
        <div className="flex justify-between items-end border-b-2 border-[#A57C00] pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight leading-none uppercase">場地平面圖 (Floorplan)</h1>
            <p className="text-slate-500 text-xs mt-1">Order ID: {data.orderId}</p>
          </div>
          <div className="text-right">
            <div className="inline-block bg-[#A57C00] text-white px-3 py-1 text-[10px] font-bold rounded mb-1 uppercase tracking-widest">APPENDIX</div>
          </div>
        </div>
        <div className="w-full bg-slate-50/50 border border-slate-200 rounded-xl overflow-hidden mt-4 relative shadow-sm" style={{ height: `${containerHeight}px`, minHeight: '400px', breakInside: 'avoid', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <div className="absolute inset-0 origin-top-left" style={{ transform: `scale(${scale})`, width: `${100 / scale}%`, height: `${100 / scale}%`, backgroundImage: bgImage ? `linear-gradient(to right, rgba(226, 232, 240, 0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(226, 232, 240, 0.6) 1px, transparent 1px), url("${bgImage}")` : 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)', backgroundSize: bgImage ? `${itemScale}px ${itemScale}px, ${itemScale}px ${itemScale}px, auto` : `${itemScale}px ${itemScale}px`, backgroundPosition: bgImage ? 'top left, top left, top left' : 'top left', backgroundRepeat: bgImage ? 'repeat, repeat, no-repeat' : 'repeat', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            {visibleZones.length > 0 && (
               <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                 {visibleZones.map(z => {
                    const points = z.points.map(p => `${p.x_m * itemScale},${p.y_m * itemScale}`).join(' ');
                    const cx = ((Math.min(...z.points.map(p => p.x_m)) + Math.max(...z.points.map(p => p.x_m))) / 2) * itemScale;
                    const cy = ((Math.min(...z.points.map(p => p.y_m)) + Math.max(...z.points.map(p => p.y_m))) / 2) * itemScale;
                    return (
                      <g key={z.id}>
                        <polygon points={points} fill={z.color} stroke={z.color.replace(/0\.\d+\)/, '0.8)')} strokeWidth="2" strokeDasharray="4 4" />
                        <text x={cx} y={cy} fill={z.color.replace(/0\.\d+\)/, '1.0)')} fontSize={Math.max(14, itemScale * 0.8)} fontWeight="bold" textAnchor="middle" dominantBaseline="middle" style={{textShadow: '1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff'}} opacity="0.8">{z.name}</text>
                      </g>
                    );
                 })}
               </svg>
            )}
            {elements.map(el => {
              const w_m = el.w_m || (el.w ? el.w / 40 : 1);
              const h_m = el.h_m || (el.h ? el.h / 40 : 1);
              const toolDef = typeof TOOL_GROUPS !== 'undefined' ? TOOL_GROUPS.flatMap(g => g.items).find(t => t.type === el.type) : null;
              const displayStyle = toolDef && el.type !== 'text' ? toolDef.style : el.style || '';
              const displayContent = toolDef && el.type !== 'text' ? toolDef.content : el.content;
              return (
                <div key={el.id} className={`absolute flex items-center justify-center ${displayStyle}`} style={{ left: el.x || 0, top: el.y || 0, width: w_m * itemScale, height: h_m * itemScale, transform: `rotate(${el.rotation || 0}deg)` }}>
                  {el.type === 'text' ? (
                    <div className="w-full h-full flex items-center justify-center overflow-visible"><span className="font-bold text-slate-800 whitespace-nowrap text-sm">{el.label || ''}</span></div>
                  ) : (displayContent)}
                  {el.label && el.type !== 'text' && (
                    <div className="absolute left-1/2 bottom-0 pointer-events-none" style={{ transform: `translate(-50%, 120%) rotate(${-(el.rotation || 0)}deg)` }}>
                      <span className="bg-white text-slate-800 border border-slate-300 px-1.5 py-0.5 rounded shadow-sm text-xs font-black whitespace-nowrap inline-block">{el.label}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

const DocumentHeader = ({ data, typeEn, typeZh, appSettings }) => (
  <div className="flex justify-between items-start border-b-[3px] pt-2 pb-6 mb-8" style={{ borderColor: BRAND_COLOR }}>
    <div className="max-w-[65%] flex items-center gap-4">
      {appSettings?.companyLogoUrl && (
        <img src={appSettings.companyLogoUrl} alt="Company Logo" className="max-h-16 max-w-[120px] object-contain" />
      )}
      <div>
        <div className="mb-2 flex items-center gap-3" style={{ color: BRAND_COLOR }}>
          <span className="text-4xl font-black tracking-tight leading-tight">璟瓏軒</span>
          <span className="text-sm font-bold tracking-[0.2em] uppercase mt-1.5">King Lung Heen</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-3 font-medium leading-relaxed">
          <p>4/F, Hong Kong Palace Museum, 8 Museum Drive, West Kowloon</p>
          <p>Tel: +852 2788 3939 | Email: banquet@kinglungheen.com</p>
        </div>
      </div>
    </div>
    <div className="text-right">
      <h1 className={STYLES.h1}>{typeEn}</h1>
      {typeZh && <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: BRAND_COLOR }}>{typeZh}</h2>}
      <div className="text-right space-y-1 mt-2">
        <p className="text-[11px]"><span className={STYLES.textMeta + " mr-2"}>No.</span> <span className="font-mono font-bold text-slate-800">{data.orderId}</span></p>
        <p className="text-[11px]"><span className={STYLES.textMeta + " mr-2"}>Date.</span> <span className="font-mono font-bold text-slate-800">{formatDateEn(new Date())}</span></p>
      </div>
    </div>
  </div>
);

const ClientInfoGrid = ({ data, hideClientInfo = false }) => (
  <div className={`flex flex-col sm:flex-row gap-6 mb-8 ${STYLES.gridBox}`}>
    <div className="flex-1">
      <h3 className={STYLES.h3}>Bill To (客戶)</h3>
      {!hideClientInfo ? (
        <div className="space-y-1.5">
          <p className="font-bold text-[13px] text-slate-900">{data.clientName}</p>
          {data.companyName && <p className="text-[11px] text-slate-600 font-medium">{data.companyName}</p>}
          <p className="text-[11px] text-slate-600 flex items-center mt-2"><span className="w-12 text-slate-400 inline-block">Tel:</span> {data.clientPhone}</p>
          <p className="text-[11px] text-slate-600 flex items-center"><span className="w-12 text-slate-400 inline-block">Email:</span> {data.clientEmail || 'N/A'}</p>
        </div>
      ) : <div className="py-2 text-[11px] text-slate-400 italic">(Client details hidden)</div>}
    </div>
    <div className="hidden sm:block w-px bg-slate-200"></div>
    <div className="flex-1 sm:pl-2">
      <h3 className={STYLES.h3}>Event Details (活動)</h3>
      <div className="grid grid-cols-[70px_1fr] gap-y-2 text-[11px]">
        <span className="text-slate-400">Event:</span><span className="font-bold text-slate-900">{data.eventName}</span>
        <span className="text-slate-400">Date:</span><span className="font-bold text-slate-900">{formatDateEn(data.date)} <span className="text-slate-400 mx-1">|</span> {data.startTime}-{data.endTime}</span>
        <span className="text-slate-400">Venue:</span><span className="font-bold text-slate-900">{getVenueEn(data.venueLocation)}</span>
        <span className="text-slate-400">Guests:</span><span className="font-bold text-slate-900">{data.tableCount} Tables / {data.guestCount} Pax</span>
      </div>
    </div>
  </div>
);

const ItemTable = ({ billing, setupStr, avStr, decorStr, isEn = false }) => (
  <div className="mb-8 rounded-xl border border-slate-200 overflow-hidden break-inside-avoid shadow-sm relative z-10">
    <table className={STYLES.table}>
      <thead>
        <tr>
          <th className={`${STYLES.th} w-[50%]`}>Description (項目)</th>
          <th className={`${STYLES.th} text-right w-[20%]`}>Unit Price</th>
          <th className={`${STYLES.th} text-center w-[10%]`}>Qty</th>
          <th className={`${STYLES.th} text-right w-[20%]`}>Amount (HKD)</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {/* 1. MENUS */}
        {billing.parsedMenus.map((m, i) => (
          <tr key={`m-${i}`} className="bg-white">
            <td className={STYLES.td}>
              <p className="font-bold text-slate-900 mb-0.5">{m.title}</p>
              <p className="text-[10px] text-slate-500 whitespace-pre-wrap leading-snug font-serif">{onlyChinese(m.content)}</p>
            </td>
            <td className={`${STYLES.td} text-right font-mono`}>${formatMoney(m.cleanPrice)}</td>
            <td className={`${STYLES.td} text-center`}>{m.cleanQty}</td>
            <td className={`${STYLES.td} text-right ${STYLES.textMoney}`}>${formatMoney(m.amount)}</td>
          </tr>
        ))}

        {/* 2. PLATING FEE */}
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

        {/* 3. BEVERAGES */}
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

        {/* 4. SETUP PACKAGE */}
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

        {/* 5. AV PACKAGE */}
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

        {/* 6. DECOR PACKAGE */}
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

        {/* 7. BUS ARRANGEMENT */}
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

        {/* 8. CUSTOM ITEMS */}
        {billing.parsedCustomItems.map((item, i) => (
          <tr key={`c-${i}`} className="bg-white">
            <td className={STYLES.td}>
              <p className="font-bold text-slate-900">{item.name}</p>
            </td>
            <td className={`${STYLES.td} text-right font-mono`}>${formatMoney(item.cleanPrice)}</td>
            <td className={`${STYLES.td} text-center`}>{item.cleanQty}</td>
            <td className={`${STYLES.td} text-right ${STYLES.textMoney}`}>${formatMoney(item.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SignatureBox = ({ titleEn, labelEn, labelZh, sigDataUrl, onSign, dateStr, alignRight = false, isAdmin = false, showChop = false, chopUrl = '' }) => (
  <div className={`w-full max-w-[220px] ${alignRight ? 'ml-auto text-right' : 'mr-auto text-left'}`}>
    <div className={`border-b-2 border-slate-800 h-16 mb-3 relative flex items-end ${alignRight ? 'justify-end' : 'justify-start'}`}>
      {!sigDataUrl ? (
        onSign ? (
          <button type="button" onClick={onSign} className={`absolute inset-0 flex items-center justify-center w-full h-full transition-colors cursor-pointer border-2 border-dashed z-20 ${isAdmin ? 'bg-slate-100 hover:bg-slate-200 border-slate-400' : 'bg-amber-50 hover:bg-amber-100 border-amber-400'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-widest text-center ${isAdmin ? 'text-blue-600' : 'text-amber-600'}`}>
              點擊此處簽署<br/>{isAdmin ? 'Staff Sign' : 'Click to Sign'}
            </span>
          </button>
        ) : null
      ) : (
        <img src={sigDataUrl} alt="Signature" className={`absolute bottom-0 max-h-16 max-w-full object-contain z-20 ${alignRight ? 'right-0' : 'left-0'}`} />
      )}
      {showChop && chopUrl && (sigDataUrl || isAdmin) && (
        <img src={chopUrl} alt="Company Chop" className={`absolute bottom-[-15px] w-24 h-24 object-contain opacity-80 mix-blend-multiply pointer-events-none z-10 ${alignRight ? 'right-6' : 'left-6'}`} style={{ transform: 'rotate(-5deg)' }} />
      )}
    </div>
    <p className="font-bold text-[11px] text-slate-800 tracking-wide mt-2">
      {titleEn}<br />
      <span className="text-[13px] font-black text-slate-900 uppercase mt-0.5 inline-block">{labelEn}</span>
    </p>
    {labelZh && (
      <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider">{labelZh}</p>
    )}
    {sigDataUrl && dateStr && (
      <p className="text-[9px] text-slate-400 mt-0.5">Signed: {new Date(dateStr).toLocaleDateString()}</p>
    )}
  </div>
);

// ==========================================
// INDIVIDUAL DOCUMENT VIEWS
// ==========================================

const FloorplanView = ({ data, appSettings }) => (
  <div className={STYLES.pageClient}>
    <style>{`@media print { @page { margin: 12mm; size: A4; @bottom-left { content: "${data.eventName || ''}"; font-size: 11px; font-weight: bold; color: #64748b; font-family: sans-serif; text-transform: uppercase; } @bottom-center { content: "${data.orderId}"; font-size: 12px; font-weight: bold; color: #000; font-family: monospace; } @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 11px; color: #94a3b8; font-family: sans-serif; } } body { -webkit-print-color-adjust: exact; } }`}</style>
    <FloorplanAppendix data={data} appSettings={appSettings} isStandalone={true} />
  </div>
);

const BriefingView = ({ data, printMode, appSettings }) => {
  return (
    <div className={STYLES.pageInternal}>
      <style>{`@media print { @page { margin: 8mm; size: A4; @bottom-left { content: "${data.eventName || ''}"; font-size: 11px; font-weight: bold; color: #64748b; font-family: sans-serif; text-transform: uppercase; } @bottom-center { content: "${data.orderId}"; font-size: 12px; font-weight: bold; color: #000; font-family: monospace; } @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 11px; color: #94a3b8; font-family: sans-serif; } } body { -webkit-print-color-adjust: exact; } }`}</style>
      <div className="border-b-2 border-slate-800 pb-4 mb-6">
        <div className="flex justify-between items-end">
          <div className="w-[70%]">
            <h1 className="text-3xl font-black uppercase leading-none tracking-tight mb-1">{data.eventName}</h1>
            <div className="text-sm font-bold text-slate-600 flex items-center gap-2">
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
              <div className="col-span-2 p-2 bg-white border border-slate-200 rounded"><span className="block text-[9px] text-slate-400 uppercase">AV / Equipment</span><div className="flex flex-wrap gap-1 mt-1">{Object.keys(avMap).map(k => data.avRequirements && data.avRequirements[k] && (<span key={k} className="px-1.5 py-0.5 bg-slate-800 text-white rounded text-[10px] font-bold">{avMap[k]}</span>))}{(!data.avRequirements || Object.values(data.avRequirements).every(v => !v)) && <span>Standard Setup</span>}</div></div>
              {data.otherNotes && shouldShowField(data, printMode, 'otherNotes', true, true) && (<div className="col-span-2 mt-2 pt-2 border-t border-slate-100"><span className="block text-[9px] text-red-500 font-bold uppercase mb-1">Remarks / Attention</span><p className="font-bold text-slate-900">{data.otherNotes}</p></div>)}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-auto pt-4 border-t-2 border-slate-100 text-[10px] text-slate-400 flex justify-between"><span>Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span><span>Ref: {data.orderId}</span></div>
      <FloorplanAppendix data={data} appSettings={appSettings} />
    </div>
  );
};

const QuotationView = ({ data, printMode, onClientSign, onAdminSign, appSettings }) => {
  const BRAND_COLOR = '#A57C00';
  const billing = generateBillingSummary(data);
  const { setupStr, avStr, decorStr } = getPackageStrings(data, true);
  const { clientSig, adminSig, sigData } = getSignatures(data, printMode);
  const balanceDueDateDisplay = getBalanceDueDate(data);

  return (
    <div className={STYLES.pageClient}>
      <style>{`@media print { @page { margin: 15mm 20mm; size: A4; @bottom-left { content: "${data.eventName || ''}"; font-size: 11px; font-weight: bold; color: #64748b; font-family: sans-serif; text-transform: uppercase; } @bottom-center { content: "${data.orderId}"; font-size: 12px; font-weight: bold; color: #000; font-family: monospace; } @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 11px; color: #94a3b8; font-family: sans-serif; } } body { -webkit-print-color-adjust: exact; } }`}</style>
      
      <DocumentHeader data={data} typeEn="QUOTATION" typeZh="報價單" appSettings={appSettings} />
      <ClientInfoGrid data={data} hideClientInfo={data.printSettings?.quotation?.showClientInfo === false} />
      <ItemTable billing={billing} setupStr={setupStr} avStr={avStr} decorStr={decorStr} isEn={true} />
      
      {data.otherNotes && shouldShowField(data, printMode, 'otherNotes', true, true) && (
        <div className="mb-6 break-inside-avoid text-[11px] text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <span className="font-bold block mb-1 uppercase tracking-widest text-[10px]" style={{ color: BRAND_COLOR }}>Remarks (備註)</span>
          <span className="whitespace-pre-wrap leading-relaxed">{data.otherNotes}</span>
        </div>
      )}
      
      <div className="flex justify-end mb-6 break-inside-avoid">
        <div className="w-full md:w-1/2 lg:w-5/12 space-y-2.5">
          <div className="flex justify-between text-[11px] text-slate-600 px-2 border-b border-slate-100 pb-2">
            <span>Subtotal</span><span className="font-mono">${formatMoney(billing.subtotal)}</span>
          </div>
          {billing.serviceChargeVal > 0 && (
            <div className="flex justify-between text-[11px] text-slate-600 px-2 border-b border-slate-100 pb-2">
              <span>Service Charge (10%)</span><span className="font-mono">+${formatMoney(billing.serviceChargeVal)}</span>
            </div>
          )}
          {billing.discountVal > 0 && (
            <div className="flex justify-between text-[11px] font-bold text-[#A57C00] px-2 border-b border-slate-100 pb-2">
              <span>Discount</span><span className="font-mono">-${formatMoney(billing.discountVal)}</span>
            </div>
          )}
          {billing.ccSurcharge > 0 && (
            <div className="flex justify-between text-[11px] text-slate-600 font-bold px-2 border-b border-slate-100 pb-2">
              <span>Credit Card Surcharge (3%)</span><span className="font-mono">+${formatMoney(billing.ccSurcharge)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-slate-800 px-2">
            <span className="font-bold text-[12px] uppercase tracking-widest text-slate-800">Grand Total</span>
            <span className={`text-lg ${STYLES.textMoney} text-[${BRAND_COLOR}]`}>${formatMoney(billing.grandTotal)}</span>
          </div>

          {billing.grandTotal > 0 && (
            <div className="mt-4 pt-2 border-t border-slate-100">
              <div className="flex justify-between items-end mb-1">
                <span className={STYLES.textMeta}>Payment Schedule</span>
                <span className={STYLES.textMeta}>Due Date</span>
              </div>
              <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                {[
                  { label: '1st Payment', date: data.deposit1Date, amount: billing.dep1 }, 
                  { label: '2nd Payment', date: data.deposit2Date, amount: billing.dep2 }, 
                  { label: '3rd Payment', date: data.deposit3Date, amount: billing.dep3 }
                ].map((item, idx) => (
                  item.amount > 0 && (
                    <div key={idx} className="flex justify-between items-center text-[11px] border-b border-slate-100 pb-1 last:border-0">
                      <span className="text-slate-600 font-medium">{item.label}</span>
                      <div className="text-right">
                        <span className="font-mono font-bold mr-4 text-slate-800">${formatMoney(item.amount)}</span>
                        <span className="text-[10px] text-slate-400 min-w-[70px] inline-block text-right tabular-nums">{item.date || 'TBC'}</span>
                      </div>
                    </div>
                  )
                ))}
                <div className="flex justify-between items-center text-[11px] border-t-2 border-slate-200 pt-2 mt-2">
                  <span className="text-slate-800 font-bold uppercase tracking-wider text-[10px]">Final Balance</span>
                  <div className="text-right">
                    <span className="font-mono font-black mr-4 text-slate-900">${formatMoney(billing.balanceDue)}</span>
                    <span className="text-[10px] text-slate-400 min-w-[70px] inline-block text-right tabular-nums">{balanceDueDateDisplay}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-12 pt-12 flex justify-between items-end break-inside-avoid">
        <div className="text-[9px] text-slate-400 leading-tight">
          <p className="mb-1 font-bold text-slate-500">Terms & Conditions:</p>
          1. This quotation is valid for 14 days.<br />
          2. Cheques should be made payable to "Best Wish Investment Limited T/A King Lung Heen".<br />
          3. A 3% surcharge will be applied to all credit card payments.<br />
          4. This document is computer generated. No signature is required.
        </div>
        <div className="w-1/3 text-right">
          <SignatureBox 
             titleEn="Confirmed & Accepted by" 
             labelEn={data.clientName} 
             sigDataUrl={clientSig} 
             onSign={onClientSign} 
             dateStr={sigData.clientDate} 
             alignRight={true} 
          />
        </div>
      </div>
    </div>
  );
};

const ContractView = ({ data, printMode, appSettings, onClientSign, onAdminSign }) => {
  const isEn = printMode === 'CONTRACT';
  const BRAND_COLOR = '#A57C00';
  const billing = generateBillingSummary(data);
  const { setupStr, avStr, decorStr } = getPackageStrings(data, isEn);
  const { clientSig, adminSig, sigData } = getSignatures(data, printMode);
  const balanceDueDateDisplay = getBalanceDueDate(data);

  const SectionHeader = ({ title }) => (
    <div className="mb-5 mt-8">
      <h3 className={STYLES.h2} style={{ color: BRAND_COLOR, borderColor: BRAND_COLOR }}>{title}</h3>
    </div>
  );

  return (
    <div className={STYLES.pageClient}>
      <style>{`@media print { @page { margin: 15mm 20mm; size: A4; @bottom-left { content: "${data.eventName || ''}"; font-size: 11px; font-weight: bold; color: #64748b; font-family: sans-serif; text-transform: uppercase; } @bottom-center { content: "${data.orderId}"; font-size: 12px; font-weight: bold; color: #000; font-family: monospace; } @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 11px; color: #94a3b8; font-family: sans-serif; } } body { -webkit-print-color-adjust: exact; } .page-break { page-break-before: always; } .legal-text { font-size: 13px; text-align: justify; line-height: 1.6; color: #334155; text-indent: 0; padding: 0; margin-left: 0; } .legal-header { font-weight: 800; margin-bottom: 6px; margin-top: 14px; font-size: 14px; color: #0f172a; } }`}</style>
      
      <DocumentHeader data={data} typeEn="CONTRACT" typeZh={isEn ? 'Banquet Agreement' : '宴會服務合約'} appSettings={appSettings} />

      <div className="mb-8 text-justify mx-auto w-full">
        <p className="text-[11px] text-slate-600 leading-relaxed">{isEn ? `Thank you for choosing King Lung Heen as your event venue. We are truly honored to be part of your upcoming special occasion and are committed to providing you and your guests with an exceptional experience. This agreement outlines the confirmed arrangements and terms for your event, "${data.eventName || 'the event'}", to be held on ${formatDateEn(data.date)}.` : `感謝閣下選擇璟瓏軒作為您的宴會場地。我們深感榮幸能參與您的重要時刻，並承諾為您及賓客提供最優質的餐飲體驗。本合約旨在確認將於 ${formatDateEn(data.date)} 舉行的「${data.eventName || '閣下宴會'}」之相關安排與條款。`}</p>
      </div>

      <div className="mb-8 break-inside-avoid">
        <div className={STYLES.gridBox + " grid grid-cols-2 gap-y-6 gap-x-8"}>
          <div>
            <span className={STYLES.textMeta + " block mb-1"}>{isEn ? 'Client Name' : '客戶名稱'}</span>
            <span className="font-bold text-[13px] text-slate-900">{data.clientName}</span>
          </div>
          <div>
            <span className={STYLES.textMeta + " block mb-1"}>{isEn ? 'Contact' : '聯絡電話'}</span>
            <span className="font-bold text-[13px] text-slate-900">{data.clientPhone}</span>
          </div>
          <div>
            <span className={STYLES.textMeta + " block mb-1"}>{isEn ? 'Date & Time' : '日期及時間'}</span>
            <span className="font-bold text-[13px] text-slate-900">{formatDateEn(data.date)} <span className="text-slate-400 mx-2">|</span> {data.startTime} - {data.endTime}</span>
          </div>
          <div>
            <span className={STYLES.textMeta + " block mb-1"}>{isEn ? 'Venue & Attendance' : '場地及人數'}</span>
            <span className="font-bold text-[13px] text-slate-900">{getVenueEn(data.venueLocation)} <span className="text-slate-400 mx-2">|</span> {data.tableCount} {isEn ? 'Tables' : '席'} / {data.guestCount} {isEn ? 'Pax' : '位'}</span>
          </div>
        </div>
      </div>

      <div className="mb-8 break-inside-avoid">
        <SectionHeader title={isEn ? 'Menu & Arrangements' : '餐單與佈置安排'} />
        <div className={STYLES.gridBox + " grid grid-cols-2 gap-8"}>
          <div>
            <h4 className={STYLES.h3 + " border-b border-slate-200 pb-2"}>{isEn ? 'Food & Beverage' : '餐飲內容'}</h4>
            <div className="space-y-5">
              {data.menus && data.menus.map((m, i) => (
                <div key={i} className="pl-1">
                  <p className="font-bold text-sm text-slate-800 mb-2">{m.title}</p>
                  <p className="text-[11px] text-slate-600 whitespace-pre-wrap leading-relaxed font-serif">{m.content}</p>
                </div>
              ))}
              {data.drinksPackage && (
                <div className="pl-1 pt-3 border-t border-slate-200/50">
                  <p className="font-bold text-[11px] text-slate-800 mb-1">{isEn ? 'Beverage Package' : '酒水套餐'}</p>
                  <p className="text-[11px] text-slate-600 whitespace-pre-wrap leading-relaxed">{data.drinksPackage}</p>
                </div>
              )}
              {data.specialMenuReq && shouldShowField(data, printMode, 'specialMenuReq', false, true) && (
                <div className="pl-1 pt-3 border-t border-slate-200/50">
                  <p className="font-bold text-[11px] text-slate-800 mb-1">{isEn ? 'Special Menu Requirements' : '特殊餐單需求'}</p>
                  <p className="text-[11px] text-slate-600 whitespace-pre-wrap leading-relaxed">{data.specialMenuReq}</p>
                </div>
              )}
              {data.allergies && shouldShowField(data, printMode, 'allergies', false, true) && (
                <div className="pl-1 pt-3 border-t border-slate-200/50">
                  <p className="font-bold text-[11px] text-slate-800 mb-1">{isEn ? 'Allergies' : '食物過敏'}</p>
                  <p className="text-[11px] text-slate-600 whitespace-pre-wrap leading-relaxed">{data.allergies}</p>
                </div>
              )}
            </div>
          </div>
          <div>
            <h4 className={STYLES.h3 + " border-b border-slate-200 pb-2"}>{isEn ? 'Setup & Logistics' : '場地與物流設置'}</h4>
            <div className="space-y-5 text-[11px] text-slate-700">
              <div className="flex gap-6">
                <div className="flex-1 border-b border-slate-200 pb-2">
                  <span className={STYLES.textMeta + " block mb-1"}>{isEn ? 'Table Cloth' : '檯布顏色'}</span>
                  <span className="font-bold text-slate-900">{data.tableClothColor || 'Standard'}</span>
                </div>
                <div className="flex-1 border-b border-slate-200 pb-2">
                  <span className={STYLES.textMeta + " block mb-1"}>{isEn ? 'Chair Cover' : '椅套顏色'}</span>
                  <span className="font-bold text-slate-900">{data.chairCoverColor || 'Standard'}</span>
                </div>
              </div>
              <div className="border-b border-slate-200 pb-2">
                <span className={STYLES.textMeta + " block mb-1"}>{isEn ? 'Bridal / Changing Room' : '新娘 / 更衣室'}</span>
                <span className="font-medium text-slate-900">{data.bridalRoom ? `${isEn ? 'Reserved' : '使用'} ${data.bridalRoomHours ? `(${data.bridalRoomHours})` : ''}` : (isEn ? 'Not Required' : '不適用')}</span>
              </div>
              <div className="border-b border-slate-200 pb-2">
                <span className={STYLES.textMeta + " block mb-1"}>{isEn ? 'Equipment & Decor' : '器材與佈置'}</span>
                <p className="leading-snug font-medium text-slate-900">{[setupStr, avStr, decorStr].filter(Boolean).join(' / ') || (isEn ? 'Standard Setup' : '標準設置')}</p>
                {data.venueDecor && shouldShowField(data, printMode, 'venueDecor', false, true) && (
                  <p className="leading-snug font-medium text-slate-700 mt-2 whitespace-pre-wrap">{data.venueDecor}</p>
                )}
              </div>
              <div className="space-y-2">
                <span className={STYLES.textMeta + " block mb-1"}>{isEn ? 'Logistics & Remarks' : '物流與備註'}</span>
                <p className="text-slate-800 leading-tight">
                  <span className="text-slate-500 mr-2">{isEn ? 'Free Parking:' : '免費泊車:'}</span> 
                  <span className="font-bold">{data.parkingInfo && data.parkingInfo.ticketQty || 0}</span> {isEn ? 'tickets' : '張'} x 
                  <span className="font-bold">{data.parkingInfo && data.parkingInfo.ticketHours || 0}</span> {isEn ? 'hrs' : '小時'}
                </p>
                {data.busInfo && data.busInfo.enabled && (
                  <p className="text-slate-800 leading-tight">
                    <span className="text-slate-500 font-bold mr-2">{isEn ? 'Bus Arranged:' : '旅遊巴安排:'}</span> 
                    {data.busInfo.arrivals && data.busInfo.arrivals.length || 0} {isEn ? 'Arrival' : '接載'}, 
                    {data.busInfo.departures && data.busInfo.departures.length || 0} {isEn ? 'Departure' : '散席'}
                  </p>
                )}
                {data.otherNotes && shouldShowField(data, printMode, 'otherNotes', true, true) && (
                  <p className="text-slate-800 leading-tight mt-2">
                    <span className="text-slate-500 font-bold block mb-1">{isEn ? 'Remarks:' : '備註:'}</span> 
                    <span className="whitespace-pre-wrap">{data.otherNotes}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 break-inside-avoid">
        <div className="w-full">
          <SectionHeader title={isEn ? 'Charges Detail' : '費用明細'} />
          <div className={STYLES.gridBox}>
            <div className={`flex ${STYLES.textMeta} border-b border-slate-300 pb-3 mb-4`}>
              <div className="flex-1">{isEn ? 'Item Description' : '項目'}</div>
              <div className="w-[20%] text-right">{isEn ? 'Unit Rate' : '單價'}</div>
              <div className="w-[10%] text-center">{isEn ? 'Quantity' : '數量'}</div>
              <div className="w-32 text-right">{isEn ? 'Amount' : '金額'}</div>
            </div>
            <div className="space-y-4 mb-6">
              {billing.parsedMenus.map((m, i) => (
                <div key={`m-${i}`} className="flex text-[11px] items-baseline border-b border-slate-100 pb-3">
                  <div className="flex-1 pr-4 font-bold text-slate-900 leading-snug">{m.title}</div>
                  <div className="w-[20%] text-right font-mono text-slate-600">${formatMoney(m.cleanPrice)}</div>
                  <div className="w-[10%] text-center text-slate-600">{m.cleanQty}</div>
                  <div className={`w-32 text-right ${STYLES.textMoney}`}>${formatMoney(m.amount)}</div>
                </div>
              ))}
              {billing.plating && (
                <div className="flex text-[11px] items-baseline text-slate-800 border-b border-slate-100 pb-3">
                  <div className="flex-1 pr-4 font-bold text-slate-900">{isEn ? 'Plating Service Fee' : '位上服務費'}</div>
                  <div className="w-[20%] text-right font-mono text-slate-600">${formatMoney(billing.plating.price)}</div>
                  <div className="w-[10%] text-center text-slate-600">{billing.plating.qty}</div>
                  <div className={`w-32 text-right ${STYLES.textMoney}`}>${formatMoney(billing.plating.amount)}</div>
                </div>
              )}
              {billing.drinks && (
                <div className="flex text-[11px] items-baseline text-slate-800 border-b border-slate-100 pb-3">
                  <div className="flex-1 pr-4 font-bold text-slate-900">{billing.drinks.label}</div>
                  <div className="w-[20%] text-right font-mono text-slate-600">${formatMoney(billing.drinks.price)}</div>
                  <div className="w-[10%] text-center text-slate-600">{billing.drinks.qty}</div>
                  <div className={`w-32 text-right ${STYLES.textMoney}`}>${formatMoney(billing.drinks.amount)}</div>
                </div>
              )}
              {billing.setupPackagePrice > 0 && (
                <div className="flex text-[11px] items-baseline text-slate-800 border-b border-slate-100 pb-3">
                  <div className="flex-1 pr-4 font-bold text-slate-900">{isEn ? 'Setup & Reception Package' : '舞台與接待設備套票'}<div className="text-[9px] text-slate-500 font-normal leading-tight mt-1">{setupStr}</div></div>
                  <div className="w-[20%] text-right font-mono text-slate-600">${formatMoney(billing.setupPackagePrice)}</div>
                  <div className="w-[10%] text-center text-slate-600">1</div>
                  <div className={`w-32 text-right ${STYLES.textMoney}`}>${formatMoney(billing.setupPackagePrice)}</div>
                </div>
              )}
              {billing.avPackagePrice > 0 && (
                <div className="flex text-[11px] items-baseline text-slate-800 border-b border-slate-100 pb-3">
                  <div className="flex-1 pr-4 font-bold text-slate-900">{isEn ? 'AV Equipment Package' : '影音設備套票'}<div className="text-[9px] text-slate-500 font-normal leading-tight mt-1">{avStr}</div></div>
                  <div className="w-[20%] text-right font-mono text-slate-600">${formatMoney(billing.avPackagePrice)}</div>
                  <div className="w-[10%] text-center text-slate-600">1</div>
                  <div className={`w-32 text-right ${STYLES.textMoney}`}>${formatMoney(billing.avPackagePrice)}</div>
                </div>
              )}
              {billing.decorPackagePrice > 0 && (
                <div className="flex text-[11px] items-baseline text-slate-800 border-b border-slate-100 pb-3">
                  <div className="flex-1 pr-4 font-bold text-slate-900">{isEn ? 'Venue Decoration Package' : '場地佈置套票'}<div className="text-[9px] text-slate-500 font-normal leading-tight mt-1">{decorStr}</div></div>
                  <div className="w-[20%] text-right font-mono text-slate-600">${formatMoney(billing.decorPackagePrice)}</div>
                  <div className="w-[10%] text-center text-slate-600">1</div>
                  <div className={`w-32 text-right ${STYLES.textMoney}`}>${formatMoney(billing.decorPackagePrice)}</div>
                </div>
              )}
              {billing.bus && (
                <div className="flex text-[11px] items-baseline text-slate-800 border-b border-slate-100 pb-3">
                  <div className="flex-1 pr-4 font-bold text-slate-900">{isEn ? 'Bus Arrangement' : '旅遊巴安排'}</div>
                  <div className="w-[20%] text-right font-mono text-slate-600">${formatMoney(billing.bus.amount)}</div>
                  <div className="w-[10%] text-center text-slate-600">1</div>
                  <div className={`w-32 text-right ${STYLES.textMoney}`}>{billing.bus.amount > 0 ? `$${formatMoney(billing.bus.amount)}` : (isEn ? 'COMP' : '免費')}</div>
                </div>
              )}
              {billing.parsedCustomItems.map((item, i) => (
                <div key={`c-${i}`} className="flex text-[11px] items-baseline text-slate-800 border-b border-slate-100 pb-3">
                  <div className="flex-1 pr-4 font-bold text-slate-900">{item.name}</div>
                  <div className="w-[20%] text-right font-mono text-slate-600">${formatMoney(item.cleanPrice)}</div>
                  <div className="w-[10%] text-center text-slate-600">{item.cleanQty}</div>
                  <div className={`w-32 text-right ${STYLES.textMoney}`}>${formatMoney(item.amount)}</div>
                </div>
              ))}
            </div>
            
            <div className="border-t border-slate-300 pt-4 flex justify-end">
              <div className="w-full md:w-1/2 lg:w-5/12 space-y-2.5">
                <div className="flex justify-between text-xs text-slate-600 px-2">
                  <span>{isEn ? 'Subtotal' : '小計'}</span><span className="font-mono">${formatMoney(billing.subtotal)}</span>
                </div>
                {billing.serviceChargeVal > 0 && (
                  <div className="flex justify-between text-xs text-slate-600 px-2">
                    <span>{isEn ? `Service Charge (10%)` : `服務費 (10%)`}</span><span className="font-mono">+${formatMoney(billing.serviceChargeVal)}</span>
                  </div>
                )}
                {billing.discountVal > 0 && (
                  <div className="flex justify-between text-xs font-bold text-[#A57C00] px-2">
                    <span>{isEn ? 'Discount' : '折扣'}</span><span className="font-mono font-bold">-${formatMoney(billing.discountVal)}</span>
                  </div>
                )}
                {billing.ccSurcharge > 0 && (
                  <div className="flex justify-between text-xs text-slate-600 font-bold px-2">
                    <span>{isEn ? 'Credit Card Surcharge (3%)' : '信用卡附加費 (3%)'}</span><span className="font-mono font-bold">+${formatMoney(billing.ccSurcharge)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-slate-800 px-2">
                  <span className="font-bold text-[12px] uppercase tracking-widest text-slate-800">{isEn ? 'Estimated Total' : '總金額'}</span>
                  <span className="font-black text-xl font-mono" style={{ color: BRAND_COLOR }}>${formatMoney(billing.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="w-full">
          <SectionHeader title={isEn ? 'Payment Schedule' : '付款時間表'} />
          <div className={STYLES.gridBox + " flex flex-col md:flex-row gap-10"}>
            <div className="flex-1">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-300">
                    <th className="pb-2">{isEn ? 'Installment' : '期數'}</th>
                    <th className="pb-2">{isEn ? 'Due Date' : '付款日期'}</th>
                    <th className="pb-2 text-right">{isEn ? 'Amount' : '金額'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {[
                    { l: isEn ? 'Initial Payment' : '第一期付款', a: billing.dep1, d: data.deposit1Date }, 
                    { l: isEn ? 'Second Payment' : '第二期付款', a: billing.dep2, d: data.deposit2Date }, 
                    { l: isEn ? 'Third Payment' : '第三期付款', a: billing.dep3, d: data.deposit3Date }
                  ].map((item, i) => item.a > 0 && (
                    <tr key={i} className="text-[11px]">
                      <td className="py-3 font-bold text-slate-900">{item.l}</td>
                      <td className="py-3 text-slate-600 font-mono tabular-nums">{item.d || 'TBC'}</td>
                      <td className={`py-3 text-right ${STYLES.textMoney}`}>${formatMoney(item.a)}</td>
                    </tr>
                  ))}
                  <tr className="text-[11px] border-t-2 border-slate-200">
                    <td className="py-4 font-black text-slate-900 uppercase">
                      {isEn ? 'Final Balance' : '尾數餘額'}
                      <span className="block text-[9px] text-slate-500 font-bold tracking-wider uppercase mt-1">
                        {data.balanceDueDateType === '10daysPrior' ? (isEn ? '10 Days Prior' : '活動前10天') : (isEn ? 'On Event Day' : '活動當日')}
                      </span>
                    </td>
                    <td className="py-4 text-slate-900 font-mono font-bold tabular-nums underline decoration-slate-400 underline-offset-4">
                      {balanceDueDateDisplay}
                    </td>
                    <td className={`py-4 text-right font-black text-slate-900 font-mono text-[14px] underline decoration-slate-400 underline-offset-4`}>
                      ${formatMoney(billing.balanceDue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="w-full md:w-72 md:border-l border-slate-200 md:pl-10">
              <p className={STYLES.h3 + " border-b border-slate-200 pb-2"}>{isEn ? 'Bank Transfer Info' : '銀行轉賬資料'}</p>
              <div className="space-y-4 text-[11px] text-slate-700 leading-relaxed pt-2">
                <div>
                  <p className={STYLES.textMeta + " mb-1"}>{isEn ? 'Bank' : '銀行'}</p>
                  <p className="font-bold text-slate-900">Bank of China (HK) <br/><span className="font-medium text-slate-600">Best Wish Investment Limited T/A King Lung Heen</span></p>
                </div>
                <div>
                  <p className={STYLES.textMeta + " mb-1"}>{isEn ? 'Account Number' : '戶口號碼'}</p>
                  <p className="font-mono font-black text-slate-900 text-[14px]">012-875-2-082180-1</p>
                </div>
                <p className="pt-3 text-[9px] text-slate-500 italic leading-normal border-t border-slate-200">
                  {isEn ? '* Settlement by cash, credit card or bank transfer only.' : '* 活動當日尾數僅接受現金、信用卡或銀行轉賬。'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="page-break"></div>
      
      {/* PAGE 2: TERMS & CONDITIONS */}
      <div className="mt-8">
        <div className="mb-6">
          <h3 className={STYLES.h2} style={{ color: BRAND_COLOR, borderColor: BRAND_COLOR }}>{isEn ? 'Terms and Conditions' : '條款及細則'}</h3>
        </div>
        <div className="columns-2 gap-10 legal-text text-slate-700">
          <div className="legal-header">1. {isEn ? 'Payment Terms' : '付款條款'}</div>
          <p className="mb-3">
            {isEn ? "Payment methods include Cash, Credit Card, or Bank Transfer (BOC 012-875-2-082180-1). Payments must be made before the specified due dates. The final balance must be settled before the event. If payment is made via remittance or credit card, the client will pay a 3% transactional surcharge." : "付款方式包括現金、信用卡或銀行轉帳（BOC 012-875-2-082180-1）。付款必須在指定的到期日之前進行。最終餘額必須在活動前結清。如選擇進行匯款或信用卡需要額外支付3%的銀行手續費。"}
          </p>
          <div className="legal-header">2. {isEn ? 'Postponement & Cancellation' : '延期和取消'}</div>
          <p className="mb-3">
            {isEn ? "The event may be postponed once with over 3 or 6 months' notice (subject to a rescheduling fee of HKD 10,000 - 20,000). Cancellation penalties: Confirmed period (forfeiture of 1st and 2nd payments); 1 month prior (90% of minimum spend); 1 week prior (100% of minimum spend)." : "活動可在提前3或6個月個月以上通知的情況下延期一次，需支付改期費 HKD 10,000 - 20,000。取消罰金根據通知的時間而定：確認期（第一次和第二次付款）；提前1個月（最低消費90%）；提前1周（最低消費100%）。"}
          </p>
          <div className="legal-header">3. {isEn ? 'Weather Policy' : '天氣政策'}</div>
          <p className="mb-3">
            {isEn ? "In the event of Typhoon Signal No. 8 or warming above, the event may be rescheduled within 3 months without charges. Under Typhoon Signal No. 3 or Red/Yellow/Black Rainstorm Warning, the event will proceed as scheduled; any cancellations follow policy two ." : "在8號風球或以上的的情況下，活動可在3個月內免收費重新安排。在3號風球或紅/黃/黑雨的情況下，活動按計劃進行；任何取消將按照條款二處理。"}
          </p>
          <div className="legal-header">4. {isEn ? 'House Rules' : '場地規則'}</div>
          <p className="mb-3">
            {isEn ? "No outside food or drinks may be brought in without permission. Decorations must use only “Blu-tack”. Smoking is prohibited. The venue reserves the right to stop any unsafe activities or setups. A floor plan, construction details, construction process, and materials list must be submitted 30 days prior to the event. For installations exceeding 3 meters in height, an RSE (Responsible Safety) certificate and a valid insurance policy are required. A deposit must be paid upon signing the contract as a guarantee to cover damage to the venue and facilities or cleaning costs (e.g., vomit cleaning fees) caused by the client or their authorized personnel. The deposit amount is HKD 10,000 to 50,000. The deposit will be fully refunded within 48 hours if no damage is found after the event; if damage or cleaning is required, the corresponding cost will be deducted from the deposit, and the remaining amount will be refunded." : "未經同意不得攜帶外部食物/飲品。裝飾必須僅使用“Blu-tack”。禁止吸煙。場地保留停止不安全活動或佈置的權利。場地佈置需活動前30天提交平面圖、施工細節，施工流程及物料清單等。若高於3米裝置，需提交RSE及有效保險單。客戶在簽署合約時，須支付押金作為保障，用於補償因客戶或其委託人員造成的場地及設施損壞或清潔費用（例如嘔吐清潔費）。押金金額HKD 10,000至50,000，若在活動結束後檢查確認未發生損壞，押金將在48小時全額退還；如有損壞或清潔需求，將從押金中扣除相應費用，剩餘部份則予以退還"}
          </p>
          <div className="legal-header">5. {isEn ? 'Liability' : '責任'}</div>
          <p className="mb-3">
            {isEn ? "The Client is liable for damages caused by guests or contractors and agrees to indemnify the venue for any losses arising from the event." : "客戶對客人或承包商造成的損害負責，並同意對活動造成的損失對場地進行賠償。"}
          </p>
          <div className="legal-header">6. {isEn ? 'Force Majeure' : '不可抗力'}</div>
          <p className="mb-3">
            {isEn ? "If the event is cancelled due to government restrictions or force majeure, a full refund or free rescheduling will be offered." : "如果場地因政府限制或不可抗力事件導致活動取消，將提供全額退款或免費重新安排。"}
          </p>
          <div className="legal-header">7. {isEn ? 'General' : '一般條款'}</div>
          <p className="mb-3">
            {isEn ? "Governed by HK laws. Terms are confidential. Uncovered details may be drafted separately subject to mutual agreement and authorized signatures." : "本合約受香港法律管轄，相關條款為保密信息。未涵蓋的細節部分可另行撰寫，並需經雙方同意及授權簽署。"}
          </p>
          {data.customTerms && (
            <>
              <div className="legal-header">8. {isEn ? 'Additional Terms' : '其他自訂條款'}</div>
              <p className="mb-3 whitespace-pre-wrap">{data.customTerms}</p>
            </>
          )}
        </div>
      </div>
      {/* SIGNATURE SECTION */}
      <div className="mt-12 px-8 py-8 break-inside-avoid bg-slate-50 rounded-xl border border-slate-200">
        <p className={STYLES.h3}>{isEn ? 'Acknowledgement & Agreement' : '確認條款及簽署'}</p>
        <div className="flex flex-col sm:flex-row justify-between gap-10">
          <div className="flex-1">
            <SignatureBox 
              titleEn={isEn ? 'For and on behalf of' : '璟瓏軒 代表'} 
              labelEn="KING LUNG HEEN" 
              labelZh={isEn ? 'Authorized Signature & Chop' : '授權簽署及蓋章'} 
              sigDataUrl={adminSig} 
              onSign={onAdminSign} 
              isAdmin={true} 
              showChop={data.printSettings?.contract?.showChop !== false}
              chopUrl={appSettings?.companyChopUrl}
            />
          </div>
          <div className="flex-1">
            <SignatureBox 
              titleEn={isEn ? 'Confirmed & Accepted by' : '客戶確認'} 
              labelEn={data.clientName} 
              labelZh={isEn ? 'Client Signature / Company Chop' : '客戶簽署 / 公司蓋章'} 
              sigDataUrl={clientSig} 
              onSign={onClientSign} 
              dateStr={sigData.clientDate} 
              alignRight={true}
            />
          </div>
        </div>
      </div>
      <FloorplanAppendix data={data} appSettings={appSettings} isStandalone={false} />
    </div>
  );
};

const InvoiceView = ({ data, printMode, appSettings }) => {
  const billing = generateBillingSummary(data);
  const { setupStr, avStr, decorStr } = getPackageStrings(data, true);
  const balanceDueDateDisplay = getBalanceDueDate(data);

  return (
    <div className={STYLES.pageClient}>
      <style>{`@media print { @page { margin: 15mm 20mm; size: A4; @bottom-left { content: "${data.eventName || ''}"; font-size: 11px; font-weight: bold; color: #64748b; font-family: sans-serif; text-transform: uppercase; } @bottom-center { content: "${data.orderId}"; font-size: 12px; font-weight: bold; color: #000; font-family: monospace; } @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 11px; color: #94a3b8; font-family: sans-serif; } } body { -webkit-print-color-adjust: exact; } }`}</style>
      <DocumentHeader data={data} typeEn="INVOICE" typeZh="發票" appSettings={appSettings} />
      <ClientInfoGrid data={data} />
      <ItemTable billing={billing} setupStr={setupStr} avStr={avStr} decorStr={decorStr} />
      
      <div className="flex justify-end mb-8 border-t border-slate-200 pt-6 break-inside-avoid">
        <div className="w-full md:w-1/2 lg:w-5/12 space-y-2.5">
          <div className="flex justify-between text-[11px] text-slate-600 px-2"><span>Subtotal</span><span className="font-mono">${formatMoney(billing.subtotal)}</span></div>
          {billing.serviceChargeVal > 0 && <div className="flex justify-between text-[11px] text-slate-600 px-2"><span>Service Charge (10%)</span><span className="font-mono">+${formatMoney(billing.serviceChargeVal)}</span></div>}
          {billing.discountVal > 0 && <div className="flex justify-between text-[11px] font-bold text-[#A57C00] px-2"><span>Discount</span><span className="font-mono">-${formatMoney(billing.discountVal)}</span></div>}
          {billing.ccSurcharge > 0 && <div className="flex justify-between text-[11px] text-slate-600 font-bold px-2"><span>Credit Card Surcharge (3%)</span><span className="font-mono">+${formatMoney(billing.ccSurcharge)}</span></div>}
          <div className="flex justify-between items-center pt-3 mt-2 border-t border-slate-300 px-2"><span className="font-bold text-[11px] uppercase tracking-widest text-slate-800">Total Amount</span><span className={STYLES.textMoney}>${formatMoney(billing.grandTotal)}</span></div>
          <div className="flex justify-between text-[11px] text-emerald-600 font-bold px-2 mt-3"><span>Less: Paid Amount</span><span className="font-mono">-${formatMoney(billing.totalPaid)}</span></div>
          <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-slate-800 px-3 bg-slate-50 py-2 rounded-lg"><span className="font-black text-sm uppercase tracking-widest text-slate-900">TOTAL DUE</span><span className="font-black text-xl font-mono text-red-600">${formatMoney(billing.balanceDue > 0 ? billing.balanceDue : 0)}</span></div>
        </div>
      </div>
      <div className="mt-12 bg-slate-50 p-6 rounded-xl border border-slate-100 text-[11px] break-inside-avoid shadow-sm">
        <p className={STYLES.h3}>Payment Methods (付款方式)</p>
        <div className="grid grid-cols-2 gap-8">
          <div><p className="font-bold text-slate-900 mb-1">Bank Transfer (銀行轉賬)</p><p className="text-slate-600">Bank: Bank of China (HK)</p><p className="text-slate-600">Name: <span className="font-bold text-slate-800">Best Wish Investment Limited T/A King Lung Heen</span></p><p className="text-slate-600">Account: <span className="font-mono font-bold text-slate-900">012-875-2-082180-1</span></p></div>
          <div><p className="font-bold text-slate-900 mb-1">Cheque (支票)</p><p className="text-slate-600">Payable to: <span className="font-bold text-slate-800">"Best Wish Investment Limited T/A King Lung Heen"</span></p><p className="text-slate-400 mt-2 text-[9px] italic">* Please write invoice number on the back of the cheque.</p></div>
        </div>
      </div>
    </div>
  );
};

const ReceiptView = ({ data, printMode, appSettings }) => {
  const billing = generateBillingSummary(data);
  const paidItems = [];
  let totalPaid = 0;

  if (data.deposit1Received && safeFloat(data.deposit1) > 0) { totalPaid += safeFloat(data.deposit1); paidItems.push({ label: '第一期付款 (1st Payment)', amount: safeFloat(data.deposit1), date: data.deposit1Date }); }
  if (data.deposit2Received && safeFloat(data.deposit2) > 0) { totalPaid += safeFloat(data.deposit2); paidItems.push({ label: '第二期付款 (2nd Payment)', amount: safeFloat(data.deposit2), date: data.deposit2Date }); }
  if (data.deposit3Received && safeFloat(data.deposit3) > 0) { totalPaid += safeFloat(data.deposit3); paidItems.push({ label: '第三期付款 (3rd Payment)', amount: safeFloat(data.deposit3), date: data.deposit3Date }); }
  if (data.balanceReceived) {
    const remainder = billing.grandTotal - totalPaid;
    if (remainder > 0) { totalPaid += remainder; paidItems.push({ label: '尾數結算 (Balance Payment)', amount: remainder, date: data.balanceDate || formatDateEn(new Date()) }); }
  }
  const isFullyPaid = data.balanceReceived || (totalPaid > 0 && totalPaid >= billing.grandTotal);

  return (
    <div className={STYLES.pageClient}>
      <style>{`@media print { @page { margin: 10mm; size: A4; @bottom-left { content: "${data.eventName || ''}"; font-size: 11px; font-weight: bold; color: #64748b; font-family: sans-serif; text-transform: uppercase; } @bottom-center { content: "${data.orderId}"; font-size: 12px; font-weight: bold; color: #000; font-family: monospace; } @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 11px; color: #94a3b8; font-family: sans-serif; } } body { -webkit-print-color-adjust: exact; } }`}</style>
      {isFullyPaid && (<div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"><span className="text-9xl font-black text-emerald-100 border-8 border-emerald-100 rounded-3xl px-12 py-6 rotate-[-15deg] tracking-widest">PAID</span></div>)}
      <DocumentHeader data={data} typeEn="RECEIPT" typeZh="官方收據" appSettings={appSettings} />
      <ClientInfoGrid data={data} hideClientInfo={false} />
      <div className="mb-8 rounded-xl border border-slate-200 overflow-hidden relative z-10 shadow-sm">
        <table className={STYLES.table}>
          <thead>
            <tr>
              <th className={`${STYLES.th} w-[40%]`}>Payment Description (付款項目)</th>
              <th className={`${STYLES.th} text-center w-[30%]`}>Date (收款日期)</th>
              <th className={`${STYLES.th} text-right w-[30%]`}>Amount (金額)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paidItems.length === 0 ? (<tr><td colSpan="3" className="py-8 px-4 text-center text-slate-400 italic">系統中暫無已確認的收款記錄 (No confirmed payments found).</td></tr>) : (paidItems.map((item, idx) => (<tr key={idx} className="bg-white"><td className={`${STYLES.td} font-bold text-slate-900`}>{item.label}</td><td className={`${STYLES.td} text-center font-mono tabular-nums`}>{item.date || '-'}</td><td className={`${STYLES.td} text-right ${STYLES.textMoney}`}>${formatMoney(item.amount)}</td></tr>)))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end mb-8 border-t border-slate-200 pt-6 relative z-10 break-inside-avoid">
        <div className="w-full md:w-1/2 lg:w-5/12 space-y-2.5">
          <div className="flex justify-between text-[11px] text-slate-600 px-2"><span>Grand Total (活動總額)</span><span className="font-mono">${formatMoney(billing.grandTotal)}</span></div>
          <div className="flex justify-between text-[12px] font-bold text-emerald-600 border-b border-slate-200 pb-3 px-2"><span>Total Received (已收總額)</span><span className="font-mono">${formatMoney(totalPaid)}</span></div>
          <div className="flex justify-between text-[13px] font-bold text-red-600 pt-2 px-3 bg-slate-50 py-2 rounded-lg"><span>Balance Due (尚欠尾數)</span><span className="font-mono">${formatMoney(Math.max(0, billing.grandTotal - totalPaid))}</span></div>
        </div>
      </div>
      <div className="mt-auto pt-8 border-t border-slate-200 flex justify-between items-end relative z-10 break-inside-avoid"><div><p className="text-[9px] text-slate-400 italic">This is a computer-generated receipt. No signature is required.</p><p className="text-[9px] text-slate-400 italic mt-0.5">此收據由電腦自動生成，毋須簽名。</p></div></div>
    </div>
  );
};



const MenuConfirmView = ({ data, printMode, onClientSign, appSettings }) => {
  const verNum = (data.menuVersions && data.menuVersions.length || 0) + 1;
  const fontSizePx = data.printSettings && data.printSettings.menu && data.printSettings.menu.fontSizeOverride || 18;
  const defaultExpiry = new Date(new Date().setDate(new Date().getDate() + 14)).toLocaleDateString('zh-HK');
  const { clientSig, sigData } = getSignatures(data, printMode);

  const formatMenuDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('zh-HK')} (${d.toLocaleDateString('en-US', { weekday: 'short' })})`;
  };

  return (
    <div className={STYLES.pageClient}>
      <style>{`@media print { @page { margin: 10mm; size: A4; @bottom-left { content: "${data.eventName || ''}"; font-size: 11px; font-weight: bold; color: #64748b; font-family: sans-serif; text-transform: uppercase; } @bottom-center { content: "${data.orderId}"; font-size: 12px; font-weight: bold; color: #000; font-family: monospace; } @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 11px; color: #94a3b8; font-family: sans-serif; } } body { -webkit-print-color-adjust: exact; } }`}</style>
      <DocumentHeader data={data} typeEn="MENU CONFIRMATION" typeZh="菜譜確認單" appSettings={appSettings} />
      <div className="w-full py-12">
        {(data.menus || []).map((menu, i) => (<div key={i} className="w-full text-center flex flex-col h-full justify-center"><div className="flex-shrink-0 mb-3"><div className="flex items-baseline justify-center gap-2"><h3 className="text-2xl font-black text-slate-900 uppercase tracking-widest">{menu.title}</h3><span className="text-xs font-bold text-slate-400 border border-slate-200 px-1 rounded">v{verNum}</span></div><div className="h-0.5 w-10 bg-slate-900 mx-auto rounded-full mt-2"></div></div><div className="px-4 flex-1 flex flex-col justify-center"><p className="font-medium text-slate-800 whitespace-pre-wrap leading-relaxed font-serif" style={{ fontSize: `${fontSizePx}px` }}>{menu.content || '(暫無菜單內容)'}</p></div></div>))}
        <div className="flex-shrink-0 mt-12 text-center"><p className="text-[8px] font-bold text-slate-500 italic">食物可能有微量致敏原，如對食物有過敏反應，請通知服務員。</p><p className="text-[8px] font-bold text-slate-500 mb-2 italic">Food may contain trace amounts of allergens. If you have an allergic reaction, please inform the server.</p><p className="text-[11px] font-black tracking-[0.3em] border-b border-slate-300 pb-1 inline-block uppercase" style={{ color: BRAND_COLOR }}>**敬候賜覆 RSVP**</p></div>
      </div>
      <div className="flex-shrink-0 mt-4 pt-4 border-t-2 border-slate-900">
        <div className="grid grid-cols-2 gap-8 items-stretch">
          <div className="flex flex-col justify-between">
            <div className="space-y-4">
              <div className="bg-slate-50 p-2 rounded border border-slate-100"><p className="font-black text-slate-900 text-[11px] mb-2 uppercase">上菜方式 Serving Style</p>{data.servingStyle ? (<div className="flex items-center gap-2"><div className="w-4 h-4 bg-slate-900 rounded-sm flex items-center justify-center"><div className="w-1.5 h-2.5 border-r-2 border-b-2 border-white rotate-45 mb-0.5"></div></div><span className="font-black text-slate-900 text-sm underline decoration-2 underline-offset-4">{data.servingStyle}</span></div>) : (<div className="flex flex-wrap gap-x-4 gap-y-2">{['位上', '圍餐', '分菜', '自助餐'].map(style => (<div key={style} className="flex items-center gap-1.5"><div className="w-4 h-4 border-2 border-slate-900 rounded-sm"></div><span className="text-[11px] font-black text-slate-800">{style}</span></div>))}</div>)}</div>
              <div className="text-[10px] text-slate-600 leading-tight space-y-1 pl-1"><p className="flex items-start gap-1"><span className="font-bold">•</span><span>上列內容有效期至: <span className="font-bold underline text-slate-900">{data.printSettings?.menu?.validityDateOverride || defaultExpiry}</span></span></p><p className="flex items-start gap-1"><span className="font-bold">•</span><span>同桌個別特別餐膳需另收費用及加一服務費；菜單如有更改，費用只加不減。</span></p>{!data.servingStyle && (<div className="bg-amber-50 border-l-4 border-amber-400 p-1.5 mt-2"><p className="font-bold text-slate-900">如需分菜位上, 每桌需額外收取 HKD800 及加一服務費</p></div>)}</div>
            </div>
          </div>
          <div className="border-2 border-slate-900 p-4 rounded-xl flex flex-col justify-between bg-slate-50">
            <div className="text-center"><p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">客戶確認 Confirmation</p><p className="text-[9px] text-slate-400 mt-1 italic">I confirm the above menu and arrangements.</p></div>
            <div className="flex justify-center items-end gap-8 mt-8 px-4">
              <div className="flex-1 text-center"><div className="border-b-2 border-slate-900 mb-1 h-12 relative flex items-end justify-center">{!clientSig ? (onClientSign ? (<button type="button" onClick={onClientSign} className="absolute inset-0 flex items-center justify-center w-full h-full bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer border-2 border-dashed border-amber-400 z-10"><span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest text-center">點擊簽署<br/>Sign</span></button>) : null) : (<img src={clientSig} alt="Client Signature" className="absolute bottom-0 max-h-12 max-w-full object-contain" />)}</div><p className="text-[9px] font-black text-slate-900 uppercase">客戶 Client</p></div>
              <div className="w-32 text-center"><div className="border-b-2 border-slate-900 mb-1 h-12 relative flex items-end justify-center">{(clientSig && sigData.clientDate) && (<span className="text-xs font-mono font-bold mb-1 tabular-nums">{new Date(sigData.clientDate).toLocaleDateString()}</span>)}</div><p className="text-[11px] font-black text-slate-900 uppercase">日期 Date</p></div>
            </div>
          </div>
        </div>
        <div className="mt-6 pt-2 border-t border-slate-200 flex justify-between items-center text-[9px] font-bold text-slate-400">
          <div className="flex gap-6 uppercase tracking-widest">{data.drinksPackage && <span><span className="text-slate-300 mr-1">Beverage:</span> {data.drinksPackage}</span>}{data.venueLocation && <span><span className="text-slate-300 mr-1">Venue:</span> {data.venueLocation}</span>}</div><div className="font-mono">{data.orderId}</div>
        </div>
      </div>
    </div>
  );
};

const InternalEOView = ({ data, printMode, appSettings }) => {
  const COPIES = [
    { name: '行政存檔 (Manager Copy)', type: 'STD', showBilling: false, showOps: true, showAllocation: false, color: 'bg-slate-800' },
    { name: '會計帳務單 (Finance Copy)', type: 'FIN', showBilling: true, showOps: false, showAllocation: true, color: 'bg-emerald-700' },
    { name: '樓面工作單 (Banquet Copy)', type: 'BQT', showBilling: false, showOps: true, showAllocation: false, color: 'bg-indigo-600' }
  ];

  const billing = generateBillingSummary(data);
  const { setupStr, avStr, decorStr } = getPackageStrings(data, false);

  const stagePhotos = data.stageDecorPhotos?.length ? data.stageDecorPhotos : (data.stageDecorPhoto ? [data.stageDecorPhoto] : []);
  const venuePhotos = data.venueDecorPhotos?.length ? data.venueDecorPhotos : (data.venueDecorPhoto ? [data.venueDecorPhoto] : []);
  const hasPhotos = stagePhotos.length > 0 || venuePhotos.length > 0;

  // Allocation Logic (For Finance Copy)
  const getDetailedAllocation = () => {
    const allocation = {};
    DEPARTMENTS.forEach(dept => { allocation[dept.key] = { label: dept.label, total: 0, items: [] }; });
    allocation['other'] = { label: '其他 (Other)', total: 0, items: [] };
    allocation['unallocated'] = { label: '⚠️ 未分拆 (Unallocated)', total: 0, items: [], isError: true };

    const addItem = (key, name, subLabel, qty, unitPrice, totalAmount) => {
      if (Math.abs(totalAmount) < 0.01) return;
      let group = allocation[key] ? key : 'other';
      allocation[group].total += totalAmount;
      allocation[group].items.push({ name, subLabel, qty: parseFloat(qty), unit: parseFloat(unitPrice), amount: totalAmount });
    };

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

    if (data.servingStyle === '位上') {
      const pFee = parseFloat(data.platingFee) || 0;
      const pQty = parseFloat(data.tableCount) || 0;
      if (pFee > 0) addItem('kitchen', '位上服務費', `${pQty}席`, pQty, pFee, pFee * pQty);
    }

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

    (data.customItems || []).forEach(i => {
      const qty = parseFloat(i.qty) || 1;
      const price = parseFloat(i.price) || 0;
      const total = price * qty;
      addItem(i.category || 'other', i.name, '', qty, price, total);
    });

    return allocation;
  };

  const detailedAlloc = getDetailedAllocation();
  let displayAlloc = JSON.parse(JSON.stringify(detailedAlloc || {}));
  let otherKey = Object.keys(displayAlloc).find(k => k === 'others' || displayAlloc[k].label.includes('其他') || displayAlloc[k].label.toLowerCase().includes('other'));
  if (!otherKey) { otherKey = 'others'; displayAlloc[otherKey] = { label: '其他 (Others)', items: [], total: 0 }; }
  else { displayAlloc[otherKey].label = '其他 (Others)'; }

  const addToDept = (key, name, amount) => {
    if (!displayAlloc[key]) displayAlloc[key] = { label: '其他 (Others)', items: [], total: 0 };
    displayAlloc[key].items.push({ name, unit: amount, qty: 1, amount: amount });
    displayAlloc[key].total += amount;
  };

  if (billing.bus) addToDept(otherKey, '旅遊巴安排', billing.bus.amount);
  if (billing.setupPackagePrice > 0) addToDept(otherKey, '舞台與接待設備', billing.setupPackagePrice);
  if (billing.avPackagePrice > 0) addToDept(otherKey, '影音設備', billing.avPackagePrice);
  if (billing.decorPackagePrice > 0) addToDept(otherKey, '場地佈置', billing.decorPackagePrice);
  if (billing.serviceChargeVal > 0) addToDept(otherKey, '服務費 (10%)', billing.serviceChargeVal);
  if (billing.ccSurcharge > 0) addToDept(otherKey, '信用卡附加費 (3%)', billing.ccSurcharge);
  if (billing.discountVal > 0) {
    if (!displayAlloc['adjustments']) displayAlloc['adjustments'] = { label: '調整 (Adjustments)', items: [], total: 0 };
    displayAlloc['adjustments'].items.push({ name: '折扣優惠 (Discount)', unit: -billing.discountVal, qty: 1, amount: -billing.discountVal });
    displayAlloc['adjustments'].total -= billing.discountVal;
  }
  const totalAllocation = Object.values(displayAlloc).reduce((acc, dept) => acc + dept.total, 0);

  return (
    <div className={STYLES.pageInternal + " p-0"}>
      <style>{`
        @media print { 
          body, html { height: auto !important; overflow: visible !important; background: white !important; } 
          .no-print, aside, nav, button, .modal-overlay { display: none !important; } 
          .print-only { display: block !important; position: absolute; top: 0; left: 0; width: 100%; z-index: 9999; background: white; } 
          
          @page { 
            margin: 10mm; 
            size: A4; 
            @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; color: #94a3b8; font-family: sans-serif; }
            @bottom-center { content: "${data.orderId}"; font-size: 10px; font-weight: bold; color: #000; font-family: monospace; }
            @bottom-left { content: "${data.eventName || ''}"; font-size: 9px; font-weight: bold; color: #64748b; font-family: sans-serif; text-transform: uppercase; }
          }
          .page-break { page-break-after: always !important; display: block; height: 1px; width: 100%; clear: both; }
          .print-page { position: relative; width: 100%; background: white; margin-bottom: 20px; } 
          .break-inside-avoid { break-inside: avoid; }
          .compact-table th, .compact-table td { padding: 4px 8px; border-bottom: 1px solid #e2e8f0; }
          .compact-table th { background-color: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #64748b; }
        }
      `}</style>

      {/* --- LOOP THROUGH COPIES --- */}
      {COPIES.map((copy, idx) => (
        <React.Fragment key={idx}>
          <div className="print-page">

            {/* ========================================================
                LAYOUT TYPE 1: BANQUET COPY (Briefing Style)
                ======================================================== */}
            {copy.type === 'BQT' ? (
              <div className="relative p-8 md:p-10 print:p-0 print:pt-6">
                <div className="border-b-2 border-slate-800 pb-4 mb-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <h1 className="text-3xl font-black uppercase leading-none tracking-tight mb-2">{data.eventName}</h1>
                      <div className="text-xs font-bold text-slate-600 flex items-center gap-2 font-mono">
                        <span>REF: {data.orderId}</span><span className="text-slate-300">|</span>
                        <span>{cleanLocation(data.venueLocation)}</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className={`text-white px-3 py-1 text-[10px] font-black rounded uppercase tracking-widest mb-3 shadow-sm ${copy.color}`}>
                        {copy.name}
                      </span>
                      <div className="text-lg font-black text-slate-900">{formatDateWithDay(data.date)}</div>
                      <div className="text-sm font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded mt-1">{data.startTime} - {data.endTime}</div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3 mb-4 text-center">
                  <div className="bg-slate-100 p-2 rounded border-l-4 border-slate-800">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase">Tables (席數)</span>
                    <span className="block text-3xl font-black">{data.tableCount}</span>
                  </div>
                  <div className="bg-slate-100 p-2 rounded border-l-4 border-slate-600">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase">Guests (人數)</span>
                    <span className="block text-3xl font-black">{data.guestCount}</span>
                  </div>
                  <div className="bg-slate-100 p-2 rounded border-l-4 border-indigo-600">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase">Style (上菜)</span>
                    <span className="block text-xl font-bold mt-1">{data.servingStyle || 'Standard'}</span>
                  </div>
                  <div className="bg-slate-100 p-2 rounded border-l-4 border-amber-600">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase">Serving (起菜)</span>
                    <span className="block text-xl font-bold mt-1">{data.servingTime || 'TBC'}</span>
                  </div>
                </div>

                {/* Alerts */}
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
                          <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-xs"><span className="font-bold text-slate-600">Parking:</span><span className="font-bold bg-slate-100 px-2 py-0.5 rounded">{data.parkingInfo && data.parkingInfo.ticketQty || 0} 張 x {data.parkingInfo && data.parkingInfo.ticketHours || 0} 小時</span></div>
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
                  </div>
                </div>
              </div>
            ) : (

              /* ========================================================
                 LAYOUT TYPE 2: MANAGER & FINANCE (Standard Table Style)
                 ======================================================== */
              <div className="p-8 md:p-10 print:p-0 print:pt-6">
                <div className="flex justify-between items-end border-b-2 border-slate-800 pb-4 mb-6">
                  <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight leading-none mb-2">{data.eventName}</h1>
                    <div className="flex gap-4 mt-1 text-sm font-bold text-slate-600 font-mono">
                      <span>REF: {data.orderId}</span>
                      <span className="text-slate-300">|</span>
                      <span>DATE: {formatDateEn(new Date())}</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className={`text-white px-3 py-1 text-[10px] font-black rounded uppercase tracking-widest mb-3 shadow-sm ${copy.color}`}>
                      {copy.name}
                    </span>
                    <div className="text-base font-black text-slate-900">{formatDateWithDay(data.date)}</div>
                    <div className="text-sm font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded mt-1">{data.startTime} - {data.endTime}</div>
                  </div>
                </div>

                {copy.type !== 'FIN' && (
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg mb-4 grid grid-cols-4 gap-4 text-[10px]">
                    <div className="border-r border-slate-200 pr-2"><span className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">客戶</span><div className="font-bold text-[11px] truncate text-slate-800">{data.clientName}</div><div className="truncate text-[10px] text-slate-500">{data.clientPhone}</div></div>
                    <div className="border-r border-slate-300 pr-2"><span className="block text-[9px] text-slate-400 font-bold uppercase">場地</span><div className="font-bold truncate">{cleanLocation(data.venueLocation)}</div></div>
                    <div className="border-r border-slate-300 pr-2"><span className="block text-[9px] text-slate-400 font-bold uppercase">席數 / 人數</span><div className="font-bold">{data.tableCount} 席 / {data.guestCount} 人</div></div>
                    <div><span className="block text-[9px] text-slate-400 font-bold uppercase">負責人</span><div className="font-bold">{data.salesRep || '-'}</div></div>
                  </div>
                )}

                {copy.showOps && (
                  <div className="flex gap-6 items-start mb-4">
                    <div className="w-1/2 flex flex-col gap-4">
                      <div className="border border-slate-200 rounded-lg overflow-hidden h-full">
                        <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
                          <span className="font-bold text-slate-800 text-[11px]">餐飲安排 (Food & Beverage)</span>
                          <span className="text-[10px] font-bold bg-white border border-slate-200 px-2 rounded text-slate-600">{data.servingStyle}</span>
                        </div>
                        <div className="p-3">
                          <div className="bg-blue-50 border border-blue-100 rounded p-2 mb-3 text-xs flex gap-2">
                            <Coffee size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                            <div><span className="font-bold text-blue-700 block text-[10px] uppercase mb-0.5">酒水套餐</span><span className="font-medium text-[11px] text-slate-700">{data.drinksPackage || '標準 / 無'}</span></div>
                          </div>
                          <div className="space-y-4">
                            {data.menus && data.menus.length > 0 ? (
                              data.menus.map((m, mIdx) => (
                                <div key={mIdx} className="break-inside-avoid">
                                  {m.title && <div className="font-bold text-slate-800 text-[11px] underline decoration-slate-300 mb-1.5">{m.title}</div>}
                                  <div className="text-[11px] font-medium leading-relaxed text-slate-700 whitespace-pre-wrap pl-2 border-l-2 border-slate-200">{onlyChinese(m.content)}</div>
                                </div>
                              ))
                            ) : <div className="text-slate-400 italic text-xs">未選擇菜單</div>}
                          </div>
                        </div>
                      </div>
                      {( (data.specialMenuReq && shouldShowField(data, printMode, 'specialMenuReq', false, true)) || (data.allergies && shouldShowField(data, printMode, 'allergies', false, true)) ) && (
                        <div className="border-2 border-red-200 bg-red-50 rounded-lg p-3 text-[11px] break-inside-avoid">
                          <div className="font-black text-red-600 flex items-center gap-1.5 mb-1.5"><AlertTriangle size={16} /> 特別要求 / 過敏</div>
                          <div className="font-bold text-red-900 whitespace-pre-wrap leading-snug">
                            {data.specialMenuReq && shouldShowField(data, printMode, 'specialMenuReq', false, true) ? data.specialMenuReq : ''}
                            {(data.specialMenuReq && shouldShowField(data, printMode, 'specialMenuReq', false, true)) && (data.allergies && shouldShowField(data, printMode, 'allergies', false, true)) && ' | '}
                            {data.allergies && shouldShowField(data, printMode, 'allergies', false, true) ? data.allergies : ''}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="w-1/2 flex flex-col gap-4">
                      <div className="border border-slate-200 rounded-lg overflow-hidden break-inside-avoid">
                        <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 font-bold text-slate-800 text-[11px]">活動流程 (Rundown)</div>
                        <div className="p-2">
                          {(!data.rundown || data.rundown.length === 0) ? <span className="text-[11px] text-slate-400 italic pl-2">無</span> : (
                            <table className="w-full text-[10px]"><tbody className="divide-y divide-slate-100">{data.rundown.map((item, i) => (<tr key={i}><td className="py-1.5 px-2 font-mono text-slate-500 w-16 align-top">{item.time}</td><td className="py-1.5 font-bold text-slate-700">{item.activity}</td></tr>))}</tbody></table>
                          )}
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-lg overflow-hidden break-inside-avoid">
                        <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 font-bold text-slate-800 text-[11px]">場地、影音與佈置</div>
                        <div className="p-3 text-[10px] space-y-3">
                          <div className="grid grid-cols-2 gap-2 mb-2"><div><span className="text-[9px] text-slate-400 block font-bold mb-0.5">檯布顏色</span><span className="text-slate-800 font-medium">{data.tableClothColor || '標準'}</span></div><div><span className="text-[9px] text-slate-400 block font-bold mb-0.5">椅套顏色</span><span className="text-slate-800 font-medium">{data.chairCoverColor || '標準'}</span></div></div>
                          <div><span className="text-[9px] text-slate-400 block font-bold">主家席</span>{data.headTableColorType === 'custom' ? data.headTableCustomColor : '同客席'}</div>
                          {data.venueDecor && shouldShowField(data, printMode, 'venueDecor', false, true) && <div className="bg-slate-50 p-2 rounded italic text-[10px] border border-slate-100"><span className="font-bold not-italic">佈置備註:</span> {data.venueDecor}</div>}

                          <div className="border-t border-slate-100 pt-2 space-y-1">
                            {setupStr && <div><span className="text-[9px] text-slate-400 font-bold">舞台與接待設備:</span> <span className="text-[10px] font-medium text-slate-700">{setupStr}</span></div>}
                            {avStr && <div><span className="text-[9px] text-slate-400 font-bold">影音設備:</span> <span className="text-[10px] font-medium text-slate-700">{avStr}</span></div>}
                            {decorStr && <div><span className="text-[9px] text-slate-400 font-bold">場地佈置:</span> <span className="text-[10px] font-medium text-slate-700">{decorStr}</span></div>}
                            {data.avNotes && <p className="text-[10px] text-slate-500 mt-1">*{data.avNotes}</p>}
                          </div>
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-lg overflow-hidden break-inside-avoid">
                        <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 font-bold text-slate-800 text-[11px]">物流與泊車</div>
                        <div className="p-3 text-[10px] space-y-3">
                          {data.busInfo && data.busInfo.enabled && (
                            <div className="bg-indigo-50 border border-indigo-100 rounded p-2.5 text-[10px] mb-2">
                              <span className="font-bold text-indigo-700 block mb-1 border-b border-indigo-200 pb-0.5">🚌 旅遊巴安排</span>
                              <div className="grid grid-cols-2 gap-3">
                                <div><span className="font-bold text-indigo-600 block text-[9px] mb-0.5">接載:</span>{(!data.busInfo.arrivals || data.busInfo.arrivals.length === 0) ? <span className="text-slate-400 italic text-[9px]">-</span> : data.busInfo.arrivals.map((bus, i) => (<div key={i} className="mb-1 leading-tight"><div className="flex gap-1 items-baseline"><span className="font-mono font-bold text-black">{bus.time}</span>{bus.plate && <span className="text-slate-500 text-[9px]">({bus.plate})</span>}</div><div className="text-slate-700 break-words">{bus.location || '---'}</div></div>))}</div>
                                <div><span className="font-bold text-indigo-600 block text-[9px] mb-0.5">散席:</span>{(!data.busInfo.departures || data.busInfo.departures.length === 0) ? <span className="text-slate-400 italic text-[9px]">-</span> : data.busInfo.departures.map((bus, i) => (<div key={i} className="mb-1 leading-tight"><div className="flex gap-1 items-baseline"><span className="font-mono font-bold text-black">{bus.time}</span>{bus.plate && <span className="text-slate-500 text-[9px]">({bus.plate})</span>}</div><div className="text-slate-700 break-words">{bus.location || '---'}</div></div>))}</div>
                              </div>
                            </div>
                          )}
                          <div className="flex justify-between items-center"><span className="font-bold text-slate-500">泊車安排</span><span className="bg-slate-100 px-2 rounded font-bold">{data.parkingInfo && data.parkingInfo.ticketQty || 0} 張 x {data.parkingInfo && data.parkingInfo.ticketHours || 0} 小時</span></div>
                          {data.parkingInfo && data.parkingInfo.plates && <div className="text-[10px] bg-slate-50 p-1 rounded font-mono break-all">車牌: {data.parkingInfo.plates}</div>}
                          <div className="border-t border-slate-100 pt-2"><span className="text-[9px] text-slate-400 block font-bold mb-1">送貨安排</span>{(!data.deliveries || data.deliveries.length === 0) ? <span className="text-[10px] text-slate-400 italic">無</span> : (<div className="space-y-1">{data.deliveries.map((d, i) => (<div key={i} className="flex justify-between text-[10px] bg-slate-50 p-1.5 rounded"><span className="font-bold truncate mr-2">{d.unit}</span><span className="font-mono text-slate-500 whitespace-nowrap">{d.time}</span></div>))}</div>)}</div>
                        </div>
                        {data.otherNotes && shouldShowField(data, printMode, 'otherNotes', true, true) && <div className="border border-yellow-200 bg-yellow-50 rounded p-2 text-xs"><span className="font-bold text-yellow-700 text-[10px] block uppercase">備註</span><p className="leading-tight text-yellow-900 whitespace-pre-wrap">{data.otherNotes}</p></div>}
                      </div>
                    </div>
                  </div>
                )}

                {copy.showBilling && (
                  <div className={`${copy.showOps ? "mt-auto" : "mt-4"} border-t-2 border-slate-800 pt-2`}>
                    <div className="flex justify-between items-end mb-3">
                      <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">費用明細 (Billing Summary)</h3>
                    </div>
                    <table className="w-full text-[10px] compact-table">
                      <thead><tr><th className="text-left w-[50%]">項目</th><th className="text-right w-[15%]">單價</th><th className="text-center w-[10%]">數量</th><th className="text-right w-[25%]">金額</th></tr></thead>
                      <tbody>
                        {billing.parsedMenus.map((m, i) => (<tr key={`m-${i}`}><td className="font-medium">{m.title}</td><td className="text-right font-mono text-slate-500">${formatMoney(m.cleanPrice)}</td><td className="text-center text-slate-500">{m.cleanQty}</td><td className="text-right font-mono font-bold">${formatMoney(m.amount)}</td></tr>))}
                        {billing.drinks && (<tr><td className="font-medium">酒水套餐 ({billing.drinks.label})</td><td className="text-right font-mono text-slate-500">${formatMoney(billing.drinks.price)}</td><td className="text-center text-slate-500">{billing.drinks.qty}</td><td className="text-right font-mono font-bold">${formatMoney(billing.drinks.amount)}</td></tr>)}
                        {billing.plating && (<tr><td className="font-medium">位上服務費</td><td className="text-right font-mono text-slate-500">${formatMoney(billing.plating.price)}</td><td className="text-center text-slate-500">{billing.plating.qty}</td><td className="text-right font-mono font-bold">${formatMoney(billing.plating.amount)}</td></tr>)}

                        {billing.setupPackagePrice > 0 && (
                          <tr>
                            <td className="font-medium pt-1">舞台與接待設備套票<div className="text-[9px] text-slate-400 font-normal leading-tight mt-0.5">{setupStr}</div></td>
                            <td className="text-right font-mono text-slate-500 align-top pt-1">${formatMoney(billing.setupPackagePrice)}</td>
                            <td className="text-center text-slate-500 align-top pt-1">1</td>
                            <td className="text-right font-mono font-bold align-top pt-1">${formatMoney(billing.setupPackagePrice)}</td>
                          </tr>
                        )}
                        {billing.avPackagePrice > 0 && (
                          <tr>
                            <td className="font-medium pt-1">影音設備套票<div className="text-[9px] text-slate-400 font-normal leading-tight mt-0.5">{avStr}</div></td>
                            <td className="text-right font-mono text-slate-500 align-top pt-1">${formatMoney(billing.avPackagePrice)}</td>
                            <td className="text-center text-slate-500 align-top pt-1">1</td>
                            <td className="text-right font-mono font-bold align-top pt-1">${formatMoney(billing.avPackagePrice)}</td>
                          </tr>
                        )}
                        {billing.decorPackagePrice > 0 && (
                          <tr>
                            <td className="font-medium pt-1">場地佈置套票<div className="text-[9px] text-slate-400 font-normal leading-tight mt-0.5">{decorStr}</div></td>
                            <td className="text-right font-mono text-slate-500 align-top pt-1">${formatMoney(billing.decorPackagePrice)}</td>
                            <td className="text-center text-slate-500 align-top pt-1">1</td>
                            <td className="text-right font-mono font-bold align-top pt-1">${formatMoney(billing.decorPackagePrice)}</td>
                          </tr>
                        )}

                        {billing.parsedCustomItems.map((item, i) => (<tr key={`c-${i}`}><td>{item.name}</td><td className="text-right font-mono text-slate-500">${formatMoney(item.cleanPrice)}</td><td className="text-center text-slate-500">{item.cleanQty}</td><td className="text-right font-mono font-bold">${formatMoney(item.amount)}</td></tr>))}
                        {billing.bus && (<tr><td className="font-bold">旅遊巴安排</td><td className="text-right font-mono text-slate-500">${formatMoney(billing.bus.amount)}</td><td className="text-center text-slate-500">1</td><td className="text-right font-mono font-bold">${formatMoney(billing.bus.amount)}</td></tr>)}
                      </tbody>
                      <tfoot className="break-inside-avoid">
                        <tr className="border-t border-slate-300"><td colSpan="3" className="text-right font-bold pt-2 text-slate-500 text-[10px]">小計 (Subtotal)</td><td className="text-right font-mono pt-2 text-slate-500">${formatMoney(billing.subtotal)}</td></tr>
                        {billing.serviceChargeVal > 0 && (<tr><td colSpan="3" className="text-right font-bold text-slate-500 text-[10px]">服務費 (10%)</td><td className="text-right font-mono text-slate-500">+${formatMoney(billing.serviceChargeVal)}</td></tr>)}
                        {billing.discountVal > 0 && (<tr><td colSpan="3" className="text-right font-bold text-red-500 text-[10px]">折扣 (Discount)</td><td className="text-right font-mono text-red-500">-${formatMoney(billing.discountVal)}</td></tr>)}
                        {billing.ccSurcharge > 0 && (<tr><td colSpan="3" className="text-right font-bold text-amber-700 text-[10px]">信用卡附加費 (3%)</td><td className="text-right font-mono text-amber-700">+${formatMoney(billing.ccSurcharge)}</td></tr>)}
                        <tr className="border-t-2 border-slate-800"><td colSpan="3" className="text-right font-bold pt-2 text-[12px] text-slate-900">總金額 (TOTAL)</td><td className="text-right font-bold font-mono pt-2 text-[13px] text-black">${formatMoney(billing.grandTotal)}</td></tr>

                        {[
                          { l: '付款 1', a: billing.dep1, d: data.deposit1Date, received: data.deposit1Received },
                          { l: '付款 2', a: billing.dep2, d: data.deposit2Date, received: data.deposit2Received },
                          { l: '付款 3', a: billing.dep3, d: data.deposit3Date, received: data.deposit3Received }
                        ].map((item, i) => (item.a > 0 ? (
                          <tr key={i}>
                            <td colSpan="3" className="text-right text-slate-500 text-[10px] py-1">
                              {item.l} {item.d && <span className="ml-1 font-mono">[{item.d}]</span>}
                              {item.received ? <span className="ml-2 font-bold text-emerald-600 border border-emerald-600 px-1 rounded text-[9px]">已收款 PAID</span> : <span className="ml-2 font-bold text-red-400 border border-red-400 px-1 rounded text-[9px]">未收款 UNPAID</span>}
                            </td>
                            <td className="text-right font-mono text-slate-500 text-[10px] py-1">{item.received ? `-$${formatMoney(item.a)}` : '$0'}</td>
                          </tr>
                        ) : null))}
                        <tr className="border-t border-slate-200 mt-1"><td colSpan="3" className="text-right font-bold text-red-600 pt-2 text-[11px] uppercase">尚餘尾數 (Outstanding Balance)</td><td className="text-right font-black font-mono text-red-600 pt-2 text-[13px]">${formatMoney(billing.balanceDue)}</td></tr>
                      </tfoot>
                    </table>

                    {copy.showAllocation && (
                      <div className="mt-6 pt-4 border-t border-slate-200">
                        <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-2">部門拆帳詳情 (Revenue Allocation)</h3>
                        <div className="w-full">
                          <table className="w-full text-[10px] border-collapse table-fixed">
                            <colgroup><col className="w-[15%]" /><col className="w-[40%]" /><col className="w-[15%]" /><col className="w-[10%]" /><col className="w-[15%]" /><col className="w-[5%]" /></colgroup>
                            <thead><tr className="border-b-2 border-slate-800 bg-slate-50 text-slate-600"><th className="text-left py-1 px-2">部門</th><th className="text-left py-1 px-2">項目</th><th className="text-right py-1 px-2">單價</th><th className="text-center py-1 px-2">數量</th><th className="text-right py-1 px-2">總額</th><th className="text-right py-1 px-2">%</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                              {Object.values(displayAlloc).map((dept, i) => {
                                if (dept.total === 0 && dept.items.length === 0) return null;
                                return (<React.Fragment key={i}>
                                  {dept.items.map((item, idx) => (<tr key={`${i}-${idx}`} className={idx === 0 ? "border-t border-slate-200" : ""}><td className={`py-1 px-2 align-top ${idx === 0 ? 'font-bold' : ''}`}>{idx === 0 ? dept.label : ''}</td><td className="py-1 px-2 align-top text-slate-600">{item.name}</td><td className="py-1 px-2 text-right font-mono text-slate-500">${formatMoney(item.unit)}</td><td className="py-1 px-2 text-center text-slate-500">{item.qty}</td><td className="py-1 px-2 text-right font-mono font-medium">${formatMoney(item.amount)}</td><td className="py-1 px-2"></td></tr>))}
                          <tr className="bg-slate-50"><td colSpan="4" className="py-1 px-2 text-right text-[9px] uppercase font-bold text-slate-400">{dept.label.split(' ')[0]} 小計</td><td className="py-1 px-2 text-right font-mono font-bold">${formatMoney(dept.total)}</td><td className="py-1 px-2 text-right font-bold text-[9px] text-slate-500">{billing.subtotal > 0 ? ((dept.total / billing.subtotal) * 100).toFixed(1) : 0}%</td></tr>
                                </React.Fragment>);
                              })}
                            </tbody>
                            <tfoot><tr className="border-t-2 border-slate-800 bg-slate-100 font-bold"><td colSpan="4" className="py-1.5 px-2 text-right uppercase">拆帳總計</td><td className="py-1.5 px-2 text-right font-mono">${formatMoney(totalAllocation)}</td><td className="py-1.5 px-2 text-right">100%</td></tr></tfoot>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="page-break my-12 print:my-0"></div>
        </React.Fragment>
      ))}


      {/* --- APPENDIX (Photos) --- */}
      {hasPhotos && (
        <React.Fragment>
          <div className="print-page">
            <div className="flex justify-between items-end border-b-4 border-slate-900 pb-2 mb-6">
              <div><h1 className="text-2xl font-extrabold tracking-tight leading-none uppercase">附錄 (Appendix)</h1><p className="text-slate-500 text-xs mt-1">Order ID: {data.orderId}</p></div>
              <div className="text-right"><div className="inline-block bg-slate-500 text-white px-3 py-1 text-sm font-bold rounded mb-1 uppercase">參考圖片</div><div className="text-sm font-bold text-slate-800">{formatDateWithDay(data.date)}</div></div>
            </div>
            <div className="grid grid-cols-2 gap-6 mt-4">
              {stagePhotos.map((url, idx) => (
                <div key={`stage-${idx}`} className="break-inside-avoid border border-slate-200 rounded p-2 bg-slate-50">
                  <h3 className="text-sm font-bold text-slate-700 mb-2">舞台/花藝參考圖 {idx + 1}</h3>
                  <img src={url} alt={`Stage ${idx}`} className="w-full h-auto max-h-[110mm] object-contain mx-auto" />
                </div>
              ))}
              {venuePhotos.map((url, idx) => (
                <div key={`venue-${idx}`} className="break-inside-avoid border border-slate-200 rounded p-2 bg-slate-50">
                  <h3 className="text-sm font-bold text-slate-700 mb-2">場地佈置參考圖 {idx + 1}</h3>
                  <img src={url} alt={`Venue ${idx}`} className="w-full h-auto max-h-[110mm] object-contain mx-auto" />
                </div>
              ))}
            </div>
          </div>
          <div className="page-break my-12 print:my-0"></div>
        </React.Fragment>
      )}

      {/* --- FLOORPLAN --- */}
      <FloorplanAppendix data={data} appSettings={appSettings} isStandalone={true} />
      {data.floorplan && (data.floorplan.elements?.length > 0 || data.floorplan.zones?.length > 0) && (
        <div className="page-break my-12 print:my-0"></div>
      )}

      {/* --- KITCHEN COPY --- */}
      <div className="print-page p-8 md:p-10 print:p-0 print:pt-6">
        <div className="flex justify-between items-end border-b-4 border-black pb-3 mb-6">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">廚房出品單</h1>
            <p className="text-lg font-bold text-slate-500 mt-1">KITCHEN COPY</p>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold bg-black text-white px-4 py-1 inline-block mb-1">{data.servingTime ? `${data.servingTime} 起菜` : '時間待定'}</div>
            <div className="text-sm font-mono font-bold">{formatDateWithDay(data.date)}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-100 p-4 border-l-8 border-slate-800"><span className="block text-xs font-bold text-slate-500 uppercase">活動名稱</span><span className="block text-xs font-bold leading-tight">{data.eventName}</span></div>
          <div className="bg-slate-100 p-4 border-l-8 border-black text-center"><span className="block text-xs font-bold text-slate-500 uppercase">席數</span><span className="block text-4xl font-black leading-none">{data.tableCount}</span></div>
          <div className="bg-slate-100 p-4 border-l-8 border-slate-600 text-center"><span className="block text-xs font-bold text-slate-500 uppercase">人數</span><span className="block text-4xl font-black leading-none">{data.guestCount}</span></div>
        </div>
        {( (data.specialMenuReq && shouldShowField(data, printMode, 'specialMenuReq', false, true)) || (data.allergies && shouldShowField(data, printMode, 'allergies', false, true)) ) && (
          <div className="mb-6 p-4 border-4 border-red-600 bg-red-50">
            <h3 className="text-lg font-black text-red-600 uppercase underline mb-2 flex items-center"><AlertTriangle className="mr-2" /> 特別飲食 / 過敏</h3>
            <p className="text-xl font-bold text-red-900 leading-snug whitespace-pre-wrap">
              {data.specialMenuReq && shouldShowField(data, printMode, 'specialMenuReq', false, true) ? data.specialMenuReq : ''}
              {(data.specialMenuReq && shouldShowField(data, printMode, 'specialMenuReq', false, true)) && (data.allergies && shouldShowField(data, printMode, 'allergies', false, true)) && '\n'}
              {data.allergies && shouldShowField(data, printMode, 'allergies', false, true) ? data.allergies : ''}
            </p>
          </div>
        )}
        <div className="border-4 border-black p-4">
          <div className="flex justify-between items-center mb-4 border-b-2 border-black pb-2"><h3 className="text-xl font-bold uppercase">餐單內容</h3><span className="text-lg font-bold bg-slate-200 px-3 py-1">{data.servingStyle}</span></div>
          <div className="space-y-6">
            {data.menus && data.menus.map((menu, idx) => (
              <div key={idx}>
                {menu.title && <div className="font-bold text-lg underline mb-2">{menu.title}</div>}
                <p className="text-[17px] font-semibold leading-relaxed whitespace-pre-wrap font-serif">
                  {onlyChinese(menu.content)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

// ==========================================
// MAIN RENDERER (ROUTER)
// ==========================================
export default function DocumentRenderer({ data, printMode, appSettings, onClientSign, onAdminSign }) {
  if (!data) return null;
  
  switch (printMode) {
    case 'FLOORPLAN':
      return <FloorplanView data={data} appSettings={appSettings} />;
    case 'BRIEFING':
      return <BriefingView data={data} printMode={printMode} appSettings={appSettings} />;
    case 'QUOTATION':
      return <QuotationView data={data} printMode={printMode} appSettings={appSettings} onClientSign={onClientSign} onAdminSign={onAdminSign} />;
    case 'CONTRACT':
    case 'CONTRACT_CN':
      return <ContractView data={data} printMode={printMode} appSettings={appSettings} onClientSign={onClientSign} onAdminSign={onAdminSign} />;
    case 'INVOICE':
      return <InvoiceView data={data} printMode={printMode} appSettings={appSettings} />;
    case 'RECEIPT':
      return <ReceiptView data={data} printMode={printMode} appSettings={appSettings} />;
    case 'MENU_CONFIRM':
      return <MenuConfirmView data={data} printMode={printMode} appSettings={appSettings} onClientSign={onClientSign} />;
    case 'EO':
    default:
      return <InternalEOView data={data} printMode={printMode} appSettings={appSettings} />;
  }
}