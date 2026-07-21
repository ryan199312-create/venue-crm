import React from 'react';
import {
  formatMoney,
  equipmentMap,
  avMap,
  decorationMap,
  generateBillingSummary,
  DEPARTMENTS
} from '../../../../services/billingService';
import { getDocStyle, getDocTokens, brandBg } from '../../docStyles';
import { docT, formatDocDate } from '../../docStrings';

export { formatMoney, generateBillingSummary, DEPARTMENTS };

// ==========================================
// SHARED UTILITIES
// ==========================================

export const formatBoldText = (text) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

export const shouldShowField = (data, printMode, field, defaultClient, defaultInternal) => {
  const isInternal = printMode === 'BRIEFING' || !printMode || printMode === 'EO' || printMode === 'KITCHEN';
  const isClient = ['QUOTATION', 'CONTRACT', 'CONTRACT_CN', 'INVOICE', 'RECEIPT', 'MENU_CONFIRM', 'ADDENDUM', 'FLOORPLAN'].includes(printMode);
  const showClient = data[`${field}ShowClient`] !== undefined ? data[`${field}ShowClient`] : defaultClient;
  
  const showInternal = data[`${field}ShowInternal`] !== undefined ? data[`${field}ShowInternal`] : defaultInternal;
  return (isClient && showClient) || (isInternal && showInternal);
};

export const onlyChinese = (text) => {
  if (!text) return '';
  const lines = text.split('\n');
  const filtered = lines.filter(line => 
    /[\u4e00-\u9fa5]/.test(line) || (line.trim().length > 0 && /^[0-9\s.,()\-:：]*$/.test(line.trim()))
  );
  if (filtered.length === 0 && text.trim().length > 0) return text;
  return filtered.join('\n');
};

export const onlyEnglish = (text) => {
  if (!text) return '';
  return text.split('\n').filter(line => 
    !/[\u4e00-\u9fa5]/.test(line)
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

export const BrandedFooter = ({ data }) => (
  <div className="pagedjs-footer-source" style={{ position: 'absolute', top: 0, left: 0, height: 0, width: 0, overflow: 'hidden', opacity: 0 }}>
    <span className="running-footer-left">
      Order: {data.orderId || '---'} | {data.eventName || '---'}
    </span>
  </div>
);

export const PaymentMethodBlock = ({ appSettings, venueId, printMode, lang = 'en' }) => {
  const t = docT(lang);
  const profile = appSettings?.venueProfiles?.[venueId] || appSettings?.venueProfile || {};
  const config = profile.paymentConfig;

  if (!config) return null;

  // Visibility logic
  const isInvoice = printMode === 'INVOICE';
  const isReceipt = printMode === 'RECEIPT';
  const isContract = printMode === 'CONTRACT' || printMode === 'CONTRACT_CN';
  const isQuotation = printMode === 'QUOTATION';

  const shouldShow =
    (isQuotation && config.showInQuotation) ||
    (isInvoice && config.showInInvoice) ||
    (isReceipt && config.showInReceipt) ||
    (isContract && config.showInContract);

  if (!shouldShow) return null;

  const activeMethods = [];
  if (config.bankTransfer?.enabled) activeMethods.push({
    label: t.bankTransfer,
    details: `${config.bankTransfer.bank}\n${t.accountName}: ${config.bankTransfer.name}\n${t.accountNo}: ${config.bankTransfer.account}`
  });
  if (config.fps?.enabled) activeMethods.push({
    label: t.fps,
    details: config.fps.id
  });
  if (config.cheque?.enabled) activeMethods.push({
    label: t.cheque,
    details: `${t.payableTo}: ${config.cheque.payableTo}`
  });
  if (config.wechat?.enabled) activeMethods.push({
    label: t.wechat,
    details: config.wechat.remarks || t.accepted
  });
  if (config.alipay?.enabled) activeMethods.push({
    label: t.alipay,
    details: config.alipay.remarks || t.accepted
  });
  if (config.creditCard?.enabled) activeMethods.push({
    label: t.creditCard,
    details: `${t.surcharge}: ${config.creditCard.surcharge || 3}%`
  });

  if (activeMethods.length === 0) return null;

  return (
    <div className="mt-6 bg-slate-50 p-5 rounded-2xl border border-slate-200 break-inside-avoid">
      <h4 className="text-[10px] font-black text-[var(--brand-primary)] uppercase tracking-widest mb-3 flex items-center gap-2">
        {t.paymentMethodsTitle}
      </h4>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        {activeMethods.map((m, idx) => (
          <div key={idx} className="border-l-2 border-slate-200 pl-3">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-1">{m.label}</p>
            <p className="text-[10px] text-slate-800 font-bold leading-tight whitespace-pre-wrap">{m.details}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DocumentHeader = ({ data, typeEn, typeZh, appSettings, lang = 'en' }) => {
  const t = docT(lang);
  const venueId = data.venueId;
  const profile = appSettings?.venueProfile || appSettings?.venueProfiles?.[venueId] || {};
  const logoUrl = appSettings?.companyLogoUrl;
  const layout = getDocStyle(appSettings).header;
  const issueDate = formatDocDate(getIssueDate(data), lang);
  const docType = lang === 'zh' ? (typeZh || typeEn) : (typeEn || typeZh);

  const brandName = logoUrl ? (
    <img src={logoUrl} alt="Logo" className="h-12 object-contain mb-2" />
  ) : (
    <div className="flex flex-col gap-0" style={{ color: 'var(--brand-primary)' }}>
      <span className="text-3xl font-black tracking-tight leading-none">{profile.nameZh || appSettings?.venueName || ''}</span>
      {profile.nameEn && <span className="text-xs font-bold tracking-[0.2em] uppercase mt-1">{profile.nameEn}</span>}
    </div>
  );

  const contactLines = (profile.address || profile.phone || profile.website) ? (
    <div className="text-[9px] text-slate-500 font-medium leading-relaxed mt-1">
      {profile.address && <p className="text-slate-700 mb-0.5 max-w-[280px] whitespace-pre-line">{profile.address}</p>}
      {(profile.phone || profile.website) && (
        <p>{profile.phone && <>{t.tel}: {profile.phone}</>}{profile.website && `${profile.phone ? ' | ' : ''}${t.web}: ${profile.website}`}</p>
      )}
    </div>
  ) : null;

  const NoDate = ({ center }) => (
    <div className={`text-[10px] flex gap-3 ${center ? 'justify-center' : ''}`}>
      <div className="flex gap-1"><span className="font-bold text-slate-400 uppercase tracking-wider">{t.no}</span> <span className="font-mono font-bold text-slate-800">{data.orderId}</span></div>
      <div className="flex gap-1"><span className="font-bold text-slate-400 uppercase tracking-wider">{t.date}</span> <span className="font-mono font-bold text-slate-800">{issueDate}</span></div>
    </div>
  );

  // MODERN — everything centred
  if (layout === 'modern') {
    return (
      <div className="text-center mb-8 pb-4 border-b border-slate-200">
        <div className="flex flex-col items-center">{brandName}{contactLines}</div>
        <h1 className="text-2xl font-light text-slate-800 uppercase tracking-[0.35em] mt-5">{docType}</h1>
        <div className="mt-2"><NoDate center /></div>
        {data.eventName && <div className="text-[11px] font-black text-slate-800 uppercase tracking-tight mt-1">{data.eventName}</div>}
      </div>
    );
  }

  // MINIMAL — thin, understated
  if (layout === 'minimal') {
    return (
      <div className="flex justify-between items-end border-b border-slate-300 pb-2 mb-8">
        <div>{brandName}{contactLines}</div>
        <div className="text-right shrink-0 ml-4">
          <h1 className="text-lg font-bold text-slate-800 uppercase tracking-widest">{docType}</h1>
          <div className="text-[10px] text-slate-500 mt-1">{t.no} <span className="font-mono font-bold text-slate-700">{data.orderId}</span> · {issueDate}</div>
        </div>
      </div>
    );
  }

  // BOLD — brand-coloured band carrying the document type
  if (layout === 'bold') {
    return (
      <div className="mb-8">
        <div className="px-6 py-4 rounded-xl text-white mb-4" style={{ backgroundColor: 'var(--brand-primary)' }}>
          <h1 className="text-2xl font-light uppercase tracking-[0.2em]">{docType}</h1>
        </div>
        <div className="flex justify-between items-start">
          <div>{brandName}{contactLines}</div>
          <div className="text-right shrink-0 ml-4">
            <NoDate />
            {data.eventName && <div className="text-[11px] font-black text-slate-800 uppercase tracking-tight mt-1">{data.eventName}</div>}
          </div>
        </div>
      </div>
    );
  }

  // CLASSIC (default)
  return (
    <div className="flex justify-between items-start border-b-[3px] pb-3 mb-8" style={{ borderColor: 'var(--brand-primary)' }}>
      <div className="max-w-[45%]"><div className="flex flex-col gap-1">{brandName}{contactLines}</div></div>
      <div className="text-right flex-1 ml-4">
        <h1 className="text-2xl md:text-3xl font-light text-slate-800 uppercase tracking-tight mb-3 whitespace-nowrap">{docType}</h1>
        <div className="flex flex-col items-end gap-0 mt-2">
          <NoDate />
          <div className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{data.eventName}</div>
        </div>
      </div>
    </div>
  );
};

export const ClientInfoGrid = ({ data, hideClientInfo = false, appSettings, lang = 'en' }) => {
  const t = docT(lang);
  const tk = getDocTokens(appSettings).infoGrid;
  const location = lang === 'zh' ? cleanLocation(data.venueLocation) : getVenueEn(data.venueLocation, appSettings);
  return (
    <div className={tk.wrap}>
      <div>
        <h3 className={tk.heading}>{t.billTo}</h3>
        {!hideClientInfo ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-black text-slate-900 uppercase tracking-tight leading-tight">{data.clientName}</p>
              {data.companyName && <p className="text-[10px] text-slate-500 font-medium">{data.companyName}</p>}
            </div>
            <div className="space-y-1 pt-1 border-t border-slate-100">
              <div className="flex gap-2 text-xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase w-12 shrink-0 pt-0.5">{t.tel}</span>
                <span className="font-bold text-slate-800">{data.clientPhone}</span>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase w-12 shrink-0 pt-0.5">{t.email}</span>
                <span className="font-bold text-slate-800 break-all flex-1">{data.clientEmail || t.na}</span>
              </div>
            </div>
          </div>
        ) : <div className="py-2 text-xs text-slate-400 italic">{t.clientHidden}</div>}
      </div>
      <div>
        <h3 className={tk.heading}>{t.eventDetails}</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-black text-slate-900 uppercase tracking-tight leading-tight">{data.eventName}</p>
            <p className="text-[10px] text-slate-500 font-medium">{location}</p>
          </div>
          <div className="space-y-1 pt-1 border-t border-slate-100">
            <div className="flex gap-2 text-xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase w-12 shrink-0 pt-0.5">{t.date}</span>
              <span className="font-bold text-slate-800">{formatDocDate(data.date, lang)} ({data.startTime}-{data.endTime})</span>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase w-12 shrink-0 pt-0.5">{t.zh ? '人數' : 'Pax'}</span>
              <span className="font-bold text-slate-800">{data.tableCount} {t.tablesUnit} / {data.guestCount} {t.paxUnit}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ItemTable = ({ billing, setupStr, avStr, decorStr, lang = 'en', showFinancials = false, showPayments = false, showSchedule = false, data = {}, grandTotalLabel = null, appSettings }) => {
  const t = docT(lang);
  const tk = getDocTokens(appSettings).table;
  return (
  <div className={tk.wrap}>
    <table className="w-full text-xs text-left border-collapse">
      <thead className={tk.thead} style={brandBg(tk.brandHead)}>
        <tr>
          <th className={`${tk.th} w-[55%]`}>{t.description}</th>
          <th className={`${tk.th} text-right w-[15%]`}>{t.unitPrice}</th>
          <th className={`${tk.th} text-center w-[10%]`}>{t.qty}</th>
          <th className={`${tk.th} text-right w-[20%]`}>{t.amountHkd}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {billing.parsedMenus.map((m, i) => (
          <tr key={`m-${i}`} className="bg-white break-inside-avoid">
            <td className="py-3 px-4 align-top">
              <p className="font-bold text-slate-900 mb-0.5">{m.title}</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-snug">
                {m.content}
              </p>
            </td>
            <td className="py-3 px-4 text-right align-top font-mono text-slate-600">${formatMoney(m.cleanPrice)}</td>
            <td className="py-3 px-4 text-center align-top text-slate-600">{m.cleanQty}</td>
            <td className="py-3 px-4 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(m.amount)}</td>
          </tr>
        ))}
        {billing.plating && (
          <tr className="bg-white break-inside-avoid">
            <td className="py-3 px-4 align-top">
              <p className="font-bold text-slate-900">{t.platingFee}</p>
            </td>
            <td className="py-3 px-4 text-right align-top font-mono text-slate-600">${formatMoney(billing.plating.price)}</td>
            <td className="py-3 px-4 text-center align-top text-slate-600">{billing.plating.qty}</td>
            <td className="py-3 px-4 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(billing.plating.amount)}</td>
          </tr>
        )}
        {billing.drinks && (
          <tr className="bg-white break-inside-avoid">
            <td className="py-3 px-4 align-top">
              <p className="font-bold text-slate-900 mb-0.5">{t.beveragePackage}</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-snug">{billing.drinks.label}</p>
            </td>
            <td className="py-3 px-4 text-right align-top font-mono text-slate-600">${formatMoney(billing.drinks.price)}</td>
            <td className="py-3 px-4 text-center align-top text-slate-600">{billing.drinks.qty}</td>
            <td className="py-3 px-4 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(billing.drinks.amount)}</td>
          </tr>
        )}
        {billing.setupPackagePrice > 0 && (
          <tr className="bg-white break-inside-avoid">
            <td className="py-3 px-4 align-top">
              <p className="font-bold text-slate-900 mb-0.5">{t.setupPackage}</p>
              <p className="text-xs text-slate-700 leading-snug">{setupStr}</p>
            </td>
            <td className="py-3 px-4 text-right align-top font-mono text-slate-600">${formatMoney(billing.setupPackagePrice)}</td>
            <td className="py-3 px-4 text-center align-top text-slate-600">1</td>
            <td className="py-3 px-4 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(billing.setupPackagePrice)}</td>
          </tr>
        )}
        {billing.avPackagePrice > 0 && (
          <tr className="bg-white break-inside-avoid">
            <td className="py-3 px-4 align-top">
              <p className="font-bold text-slate-900 mb-0.5">{t.avPackage}</p>
              <p className="text-xs text-slate-700 leading-snug">{avStr}</p>
            </td>
            <td className="py-3 px-4 text-right align-top font-mono text-slate-600">${formatMoney(billing.avPackagePrice)}</td>
            <td className="py-3 px-4 text-center align-top text-slate-600">1</td>
            <td className="py-3 px-4 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(billing.avPackagePrice)}</td>
          </tr>
        )}
        {billing.decorPackagePrice > 0 && (
          <tr className="bg-white break-inside-avoid">
            <td className="py-3 px-4 align-top">
              <p className="font-bold text-slate-900 mb-0.5">{t.decorPackage}</p>
              <p className="text-xs text-slate-700 leading-snug">{decorStr}</p>
            </td>
            <td className="py-3 px-4 text-right align-top font-mono text-slate-600">${formatMoney(billing.decorPackagePrice)}</td>
            <td className="py-3 px-4 text-center align-top text-slate-600">1</td>
            <td className="py-3 px-4 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(billing.decorPackagePrice)}</td>
          </tr>
        )}
        {billing.bus && (
          <tr className="bg-white break-inside-avoid">
            <td className="py-3 px-4 align-top">
              <p className="font-bold text-slate-900 mb-0.5">{t.busArrangement}</p>
              <p className="text-[10px] text-slate-500 whitespace-pre-wrap leading-snug">
                {billing.bus.arrivals.length > 0 && `${t.arrivals}: ${billing.bus.arrivals.length} ${t.busesUnit} `}
                {billing.bus.departures.length > 0 && `| ${t.departures}: ${billing.bus.departures.length} ${t.busesUnit}`}
              </p>
            </td>
            <td className="py-3 px-4 text-right align-top font-mono text-slate-600">${formatMoney(billing.bus.amount)}</td>
            <td className="py-3 px-4 text-center align-top text-slate-600">1</td>
            <td className="py-3 px-4 text-right align-top font-bold text-slate-900 font-mono">
              {billing.bus.amount > 0 ? `$${formatMoney(billing.bus.amount)}` : t.comp}
            </td>
          </tr>
        )}
        {billing.parsedCustomItems.map((item, i) => (
          <tr key={`c-${i}`} className="bg-white break-inside-avoid">
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
          <tr className="bg-slate-50/50 break-inside-avoid">
            <td colSpan="3" className="py-2 px-4 text-right font-bold text-slate-500">{t.subtotal}</td>
            <td className="py-2 px-4 text-right font-mono font-bold text-slate-800">${formatMoney(billing.subtotal)}</td>
          </tr>
          {billing.serviceChargeVal > 0 && (
            <tr className="bg-slate-50/50 break-inside-avoid">
              <td colSpan="3" className="py-2 px-4 text-right font-bold text-slate-500">{t.serviceCharge} ({billing.scLabel})</td>
              <td className="py-2 px-4 text-right font-mono font-bold text-slate-800">+${formatMoney(billing.serviceChargeVal)}</td>
            </tr>
          )}
          {billing.discountVal > 0 && (
            <tr className="bg-slate-50/50 break-inside-avoid">
              <td colSpan="3" className="py-2 px-4 text-right font-bold text-rose-600">{t.discount}</td>
              <td className="py-2 px-4 text-right font-mono font-bold text-rose-600">-${formatMoney(billing.discountVal)}</td>
            </tr>
          )}
          {billing.ccSurcharge > 0 && (
            <tr className="bg-slate-50/50 break-inside-avoid">
              <td colSpan="3" className="py-2 px-4 text-right font-bold text-slate-500">{t.ccSurcharge} ({billing.ccSurchargePercent}%)</td>
              <td className="py-2 px-4 text-right font-mono font-bold text-slate-800">+${formatMoney(billing.ccSurcharge)}</td>
            </tr>
          )}
          <tr className={`${tk.grandRow} break-inside-avoid`} style={brandBg(tk.brandGrand)}>
            <td colSpan="3" className="py-3 px-4 text-right font-black uppercase tracking-widest text-base">
              {grandTotalLabel || t.grandTotal}
            </td>
            <td className={`py-3 px-4 text-right font-black text-xl font-mono ${tk.grandValue}`}>${formatMoney(billing.grandTotal)}</td>
          </tr>
        </tbody>
      )}
      {showSchedule && (
        <tbody className="border-t border-slate-200">
          <tr className="bg-slate-50/30 break-inside-avoid">
            <td colSpan="4" className="py-1 px-4 font-black text-[9px] text-[var(--brand-primary)] uppercase tracking-widest">
               {t.paymentSchedule}
            </td>
          </tr>
          {[
            { label: t.payment1Deposit, date: data.deposit1Date, amount: billing.dep1 },
            { label: t.payment2, date: data.deposit2Date, amount: billing.dep2 },
            { label: t.payment3, date: data.deposit3Date, amount: billing.dep3 },
            { label: t.finalBalance, date: data.date, amount: billing.balanceDue }
          ].map((p, i) => p.amount > 0 && (
            <tr key={`s-${i}`} className="bg-white text-slate-500 italic break-inside-avoid">
              <td colSpan="3" className="py-1 px-4 text-right">
                {p.label} ({p.date || t.tbc})
              </td>
              <td className="py-1 px-4 text-right font-mono font-medium">${formatMoney(p.amount)}</td>
            </tr>
          ))}
        </tbody>
      )}
      {showPayments && (
        <tbody className="border-t border-slate-200">
          {[
            { label: t.payment1, date: data.deposit1Date, amount: billing.dep1, received: data.deposit1Received },
            { label: t.payment2, date: data.deposit2Date, amount: billing.dep2, received: data.deposit2Received },
            { label: t.payment3, date: data.deposit3Date, amount: billing.dep3, received: data.deposit3Received }
          ].map((p, i) => p.amount > 0 && (
            <tr key={`p-${i}`} className="bg-white text-slate-500 italic break-inside-avoid">
              <td colSpan="3" className="py-1 px-4 text-right">
                {p.label} ({p.date || t.tbc})
                {p.received && <span className="ml-2 not-italic font-bold text-emerald-600 text-[9px] border border-emerald-200 bg-emerald-50 px-1 rounded">{t.received}</span>}
              </td>
              <td className="py-1 px-4 text-right font-mono font-medium">${formatMoney(p.amount)}</td>
            </tr>
          ))}
          <tr className="bg-white break-inside-avoid">
            <td colSpan="3" className="py-2 px-4 text-right font-bold text-slate-500 uppercase">{t.totalPaid}</td>
            <td className="py-2 px-4 text-right font-mono font-bold text-emerald-600">${formatMoney(billing.totalPaid)}</td>
          </tr>
          <tr className="bg-slate-50 border-t border-slate-200 break-inside-avoid">
            <td colSpan="3" className="py-3 px-4 text-right font-black uppercase tracking-widest text-slate-600">{t.balanceDue}</td>
            <td className="py-3 px-4 text-right font-mono font-black text-xl text-slate-900">${formatMoney(billing.balanceDue)}</td>
          </tr>
        </tbody>
      )}
    </table>
  </div>
  );
};

export const SignatureBox = ({ titleEn, labelEn, labelZh, sigDataUrl, onSign, dateStr, alignRight = false, isAdmin = false, lang = 'en', appSettings }) => {
  const t = docT(lang);
  const line = getDocTokens(appSettings).signature.line;
  return (
  <div className={`w-full max-w-[220px] ${alignRight ? 'ml-auto text-right' : 'mr-auto text-left'}`}>
    <div className={`${line} h-16 mb-3 relative flex items-end ${alignRight ? 'justify-end' : 'justify-start'} bg-slate-50/30`}>
      {!sigDataUrl ? (
        onSign ? (
          <button type="button" onClick={onSign} className={`absolute inset-0 flex items-center justify-center w-full h-full transition-colors cursor-pointer border-2 border-dashed z-10 ${isAdmin ? 'bg-[var(--brand-primary)]/5 hover:bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/40' : 'bg-amber-50 hover:bg-amber-100 border-amber-400'}`}>
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
      <p className="text-[9px] text-slate-400 mt-0.5">{t.signed}: {new Date(dateStr).toLocaleDateString(lang === 'zh' ? 'zh-HK' : 'en-GB')}</p>
    ) : (
      <p className={`text-[9px] text-slate-400 mt-2 flex items-end ${alignRight ? 'justify-end' : 'justify-start'}`}>
        {t.date}: <span className="inline-block border-b border-slate-400 w-24 ml-2 h-3"></span>
      </p>
    )}
  </div>
  );
};