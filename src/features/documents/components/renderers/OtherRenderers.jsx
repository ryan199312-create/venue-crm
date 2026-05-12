import React, { useMemo } from 'react';
import { AlertTriangle, Coffee, Plus } from 'lucide-react';
import { 
  DocumentHeader, 
  ClientInfoGrid, 
  SignatureBox,
  getSignatures,
  onlyChinese,
  onlyEnglish,
  formatMoney,
  formatDateEn,
  formatDateWithDay,
  generateBillingSummary,
  shouldShowField
} from './DocumentShared';

export const AddendumRenderer = ({ data, onSign, onAdminSign, appSettings }) => {
  if (!data) return null;
  const printMode = 'ADDENDUM';
  const { clientSig, adminSig, sigData } = getSignatures(data, printMode);

  // Master Calculation
  const billing = generateBillingSummary(data, appSettings);

  // Separate custom items into original vs addendum
  const originalCustomItems = billing.parsedCustomItems.filter(item => !item.isAddendum);
  const addendumItems = billing.parsedCustomItems.filter(item => item.isAddendum);

  // Compute pure Addendum Impact (including its share of Service Charge and Credit Card fees)
  let addendumSubtotal = 0;
  let addendumSC = 0;
  addendumItems.forEach(item => {
    addendumSubtotal += item.amount;
    if (item.applySC !== false && data.enableServiceCharge !== false) {
       addendumSC += item.amount * 0.1;
    }
  });
  const addendumTotal = addendumSubtotal + addendumSC;
  const ccMultiplier = data.paymentMethod === '信用卡' ? (1 + (billing.ccSurchargePercent / 100)) : 1;
  const finalAddendumTotal = Math.round(addendumTotal * ccMultiplier);
  
  // Original Total is mathematically derived to ensure it perfectly adds up
  const originalGrandTotal = billing.grandTotal - finalAddendumTotal;

  return (
    <div className="font-sans text-slate-900 w-full max-w-[210mm] print:max-w-none mx-auto bg-white p-[10mm] print:p-0 min-h-0 print:min-h-0 shadow-sm print:shadow-none relative flex flex-col text-sm leading-relaxed">
      <style>{`
        @media print { 
          body { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
            background: white;
          }
          .page-break { page-break-after: always !important; break-after: page !important; display: block; height: 0; width: 100%; clear: both; }
        }
      `}</style>
      
      <DocumentHeader data={data} typeEn="ADDENDUM" typeZh="合約附加條款" appSettings={appSettings} />
      <ClientInfoGrid data={data} appSettings={appSettings} />

      <div className="my-8 space-y-2">
        <p className="text-xs text-slate-600 leading-relaxed">
          This addendum is part of the original agreement for event <strong className="text-slate-800">"{data.eventName}"</strong> (Order ID: {data.orderId}) dated {formatDateEn(data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt || data.date)}. The following items are to be added to the event scope and total cost. All other terms and conditions of the original agreement remain in full force and effect.
        </p>
        <p className="text-xs text-slate-500 leading-relaxed">
          此附加條款為活動「{data.eventName}」（訂單編號：{data.orderId}）於 {formatDateEn(data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt || data.date)} 簽訂之原始合約的一部分。以下項目將被新增至活動範圍及總費用中。原始合約中的所有其他條款及細則將繼續維持其全部效力。
        </p>
      </div>

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
            <tr className="bg-slate-100/50"><td colSpan="4" className="py-2 px-4 font-black uppercase text-slate-700 tracking-widest text-[10px]">Original Agreement (原合約項目)</td></tr>
            
            {billing.parsedMenus.map((m, i) => (
              <tr key={`om-${i}`} className="bg-white"><td className="py-2 px-4 font-medium text-slate-600">{m.title}</td><td className="py-2 px-4 text-right font-mono text-slate-500">${formatMoney(m.cleanPrice)}</td><td className="py-2 px-4 text-center text-slate-500">{m.cleanQty}</td><td className="py-2 px-4 text-right font-mono font-medium text-slate-600">${formatMoney(m.amount)}</td></tr>
            ))}
            {billing.plating && (
              <tr className="bg-white"><td className="py-2 px-4 font-medium text-slate-600">Plating Service Fee (位上服務費)</td><td className="py-2 px-4 text-right font-mono text-slate-500">${formatMoney(billing.plating.price)}</td><td className="py-2 px-4 text-center text-slate-500">{billing.plating.qty}</td><td className="py-2 px-4 text-right font-mono font-medium text-slate-600">${formatMoney(billing.plating.amount)}</td></tr>
            )}
            {billing.drinks && (
              <tr className="bg-white"><td className="py-2 px-4 font-medium text-slate-600">Beverage Package (酒水套餐)</td><td className="py-2 px-4 text-right font-mono text-slate-500">${formatMoney(billing.drinks.price)}</td><td className="py-2 px-4 text-center text-slate-500">{billing.drinks.qty}</td><td className="py-2 px-4 text-right font-mono font-medium text-slate-600">${formatMoney(billing.drinks.amount)}</td></tr>
            )}
            {billing.setupPackagePrice > 0 && (
              <tr className="bg-white"><td className="py-2 px-4 font-medium text-slate-600">Setup & Reception (舞台與接待設備)</td><td className="py-2 px-4 text-right font-mono text-slate-500">${formatMoney(billing.setupPackagePrice)}</td><td className="py-2 px-4 text-center text-slate-500">1</td><td className="py-2 px-4 text-right font-mono font-medium text-slate-600">${formatMoney(billing.setupPackagePrice)}</td></tr>
            )}
            {billing.avPackagePrice > 0 && (
              <tr className="bg-white"><td className="py-2 px-4 font-medium text-slate-600">AV Equipment Package (影音設備)</td><td className="py-2 px-4 text-right font-mono text-slate-500">${formatMoney(billing.avPackagePrice)}</td><td className="py-2 px-4 text-center text-slate-500">1</td><td className="py-2 px-4 text-right font-mono font-medium text-slate-600">${formatMoney(billing.avPackagePrice)}</td></tr>
            )}
            {billing.decorPackagePrice > 0 && (
              <tr className="bg-white"><td className="py-2 px-4 font-medium text-slate-600">Venue Decoration Package (場地佈置)</td><td className="py-2 px-4 text-right font-mono text-slate-500">${formatMoney(billing.decorPackagePrice)}</td><td className="py-2 px-4 text-center text-slate-500">1</td><td className="py-2 px-4 text-right font-mono font-medium text-slate-600">${formatMoney(billing.decorPackagePrice)}</td></tr>
            )}
            {billing.bus && (
              <tr className="bg-white"><td className="py-2 px-4 font-medium text-slate-600">Bus Arrangement (旅遊巴安排)</td><td className="py-2 px-4 text-right font-mono text-slate-500">${formatMoney(billing.bus.amount)}</td><td className="py-2 px-4 text-center text-slate-500">1</td><td className="py-2 px-4 text-right font-mono font-medium text-slate-600">${formatMoney(billing.bus.amount)}</td></tr>
            )}
            {originalCustomItems.map((item, i) => (
              <tr key={`oc-${i}`} className="bg-white"><td className="py-2 px-4 font-medium text-slate-600">{item.name}</td><td className="py-2 px-4 text-right font-mono text-slate-500">${formatMoney(item.cleanPrice)}</td><td className="py-2 px-4 text-center text-slate-500">{item.cleanQty}</td><td className="py-2 px-4 text-right font-mono font-medium text-slate-600">${formatMoney(item.amount)}</td></tr>
            ))}

            <tr className="bg-slate-50 border-t border-slate-200 text-slate-500">
              <td colSpan="3" className="py-1 px-4 text-right">Original Subtotal (原合約小計):</td>
              <td className="py-1 px-4 text-right font-mono font-medium">${formatMoney(billing.subtotal - addendumSubtotal)}</td>
            </tr>
            {billing.serviceChargeVal - addendumSC > 0 && (
              <tr className="bg-slate-50 text-slate-500">
                <td colSpan="3" className="py-1 px-4 text-right">Original Service Charge (原合約服務費):</td>
                <td className="py-1 px-4 text-right font-mono font-medium">+${formatMoney(billing.serviceChargeVal - addendumSC)}</td>
              </tr>
            )}
            {billing.ccSurcharge > 0 && data.paymentMethod === '信用卡' && (
              <tr className="bg-slate-50 text-slate-500">
                <td colSpan="3" className="py-1 px-4 text-right">Original CC Surcharge ({billing.ccSurchargePercent}%):</td>
                <td className="py-1 px-4 text-right font-mono font-medium">+${formatMoney(Math.round((billing.subtotal - addendumSubtotal + (billing.serviceChargeVal - addendumSC) - billing.discountVal) * (billing.ccSurchargePercent / 100)))}</td>
              </tr>
            )}
            <tr className="bg-slate-100/80 border-b-4 border-slate-200">
              <td colSpan="3" className="py-2 px-4 text-right font-bold text-slate-700">Original Grand Total (原合約總金額):</td>
              <td className="py-2 px-4 text-right font-mono font-bold text-slate-800">${formatMoney(originalGrandTotal)}</td>
            </tr>

            {/* Addendum Items */}
            {addendumItems.length > 0 && (
              <>
                <tr className="bg-[var(--brand-primary)]/5 border-t-2 border-[var(--brand-primary)]/20"><td colSpan="4" className="py-2 px-4 font-black uppercase text-[var(--brand-primary)] tracking-widest text-[10px]">Addendum Items (新增項目)</td></tr>
                {addendumItems.map((item, i) => (
                  <tr key={`add-${i}`} className="bg-white">
                    <td className="py-2 px-4 font-bold text-[var(--brand-primary)] flex items-center"><Plus size={12} className="mr-2 text-[var(--brand-primary)]"/>{item.name}</td>
                    <td className="py-2 px-4 text-right font-mono text-[var(--brand-primary)]">${formatMoney(item.cleanPrice)}</td>
                    <td className="py-2 px-4 text-center text-[var(--brand-primary)]">{item.cleanQty}</td>
                    <td className="py-2 px-4 text-right font-mono font-bold text-[var(--brand-primary)]">+ ${formatMoney(item.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-[var(--brand-primary)]/5"><td colSpan="3" className="py-2 px-4 text-right font-bold text-[var(--brand-primary)]">Additional Cost (新增費用):</td><td className="py-2 px-4 text-right font-mono font-bold text-[var(--brand-primary)]">+ ${formatMoney(finalAddendumTotal)}</td></tr>
              </>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-800 text-white font-bold border-t-4 border-[var(--brand-primary)]">
              <td colSpan="3" className="py-3 px-4 text-right uppercase tracking-widest">New Grand Total (更新後總金額):</td>
              <td className="py-3 px-4 text-right font-mono text-lg">${formatMoney(billing.grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-auto pt-12 flex justify-between items-end break-inside-avoid">
        <SignatureBox titleEn="For and on behalf of" labelEn={appSettings?.venueProfile?.nameEn || 'Venue Management'} labelZh="Authorized Signature & Chop" sigDataUrl={adminSig} onSign={onAdminSign} isAdmin={true} dateStr={sigData.adminDate} />
        <SignatureBox titleEn="Confirmed & Accepted by" labelEn={data.clientName} labelZh="Client Signature / Company Chop" sigDataUrl={clientSig} onSign={onSign} dateStr={sigData.clientDate} alignRight={true} />
      </div>
    </div>
  );
};

export const InternalNotesRenderer = ({ data, appSettings }) => {
  if (!data) return null;
  return (
    <div className="font-sans text-slate-900 w-full max-w-[210mm] print:max-w-none mx-auto bg-white p-[10mm] print:p-0 min-h-0 print:min-h-0 shadow-sm print:shadow-none relative flex flex-col">
      <style>{`
        @media print { 
          body { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
            background: white;
          }
          .page-break { page-break-after: always !important; break-after: page !important; display: block; height: 0; width: 100%; clear: both; }
        }
      `}</style>
      <DocumentHeader data={data} typeEn="INTERNAL NOTES" typeZh="內部備註" appSettings={appSettings} />
      <ClientInfoGrid data={data} appSettings={appSettings} />
      <div className="mt-8 flex-1">
        <h3 className="text-sm font-black uppercase tracking-widest pb-2 border-b-2 inline-block border-slate-800 text-slate-800 mb-4">
          備註內容 (Notes Content)
        </h3>
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
          {data.remarks || data.generalRemarks || '(無內容)'}
        </div>
      </div>
    </div>
  );
};

export const MenuConfirmRenderer = ({ data, menuId, onSign, appSettings, language = 'BILINGUAL' }) => {
  if (!data) return null;
  const menu = data.menus && data.menus.find(m => String(m.id) === String(menuId)) ? data.menus.find(m => String(m.id) === String(menuId)) : (data.menus?.[0] || null);
  if (!menu) return <div className="p-10 text-center text-red-500 font-bold">Error: Menu Data Not Found</div>;

  const docType = `MENU_CONFIRM_${menu.id}`;
  const { clientSig, adminSig } = getSignatures(data, docType);

  let displayContent = menu.content;
  if (language === 'CHINESE') displayContent = onlyChinese(menu.content);
  if (language === 'ENGLISH') displayContent = onlyEnglish(menu.content);

  const fontSize = data.printSettings?.menu?.fontSizeOverride || 18;
  
  const validityDate = useMemo(() => {
    if (data.printSettings?.menu?.validityDateOverride) return data.printSettings.menu.validityDateOverride;
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [data.printSettings?.menu?.validityDateOverride]);

  return (
    <div className="font-sans text-slate-900 w-full max-w-[210mm] print:max-w-none mx-auto bg-white p-[10mm] print:p-0 min-h-0 print:min-h-0 shadow-sm print:shadow-none relative">
      <style>{`
        @media print { 
          body { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
            background: white;
          }
          .page-break { page-break-after: always !important; break-after: page !important; display: block; height: 0; width: 100%; clear: both; }
        }
      `}</style>
      
      <DocumentHeader data={data} typeEn="Menu Confirmation" typeZh="菜單確認表" appSettings={appSettings} />
      <ClientInfoGrid data={data} appSettings={appSettings} />

      <div className="flex flex-col items-center bg-slate-50/50 rounded-2xl border border-slate-200 p-8 shadow-inner mb-12">
        <div className="w-full max-w-lg">
           <div className="text-center border-b-2 border-slate-200 pb-4 mb-8">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{menu.title || 'Wedding Menu'}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">
                {language === 'CHINESE' ? '已選擇菜譜內容' : (language === 'ENGLISH' ? 'Selected Course Arrangement' : 'Selected Course Arrangement (已選擇菜譜內容)')}
              </p>
           </div>
           
           <div className="space-y-6">
              <p 
                className="font-bold text-slate-800 leading-loose text-center whitespace-pre-wrap font-serif"
                style={{ fontSize: `${fontSize}px` }}
              >
                {displayContent}
              </p>
           </div>

           {((data.allergies && shouldShowField(data, 'MENU_CONFIRM', 'allergies', true, true)) || 
             (data.specialMenuReq && shouldShowField(data, 'MENU_CONFIRM', 'specialMenuReq', true, true))) && (
             <div className="mt-8 p-4 border border-amber-200 bg-amber-50/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-amber-600" />
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">特別飲食要求 (Dietary Requirements)</span>
                </div>
                <div className="space-y-2 text-xs font-bold text-amber-900 leading-relaxed">
                  {data.allergies && shouldShowField(data, 'MENU_CONFIRM', 'allergies', true, true) && (
                    <div className="flex gap-2">
                      <span className="text-amber-500 shrink-0">•</span>
                      <p>食物過敏: {data.allergies}</p>
                    </div>
                  )}
                  {data.specialMenuReq && shouldShowField(data, 'MENU_CONFIRM', 'specialMenuReq', true, true) && (
                    <div className="flex gap-2">
                      <span className="text-amber-500 shrink-0">•</span>
                      <p>特別安排: {data.specialMenuReq}</p>
                    </div>
                  )}
                </div>
             </div>
           )}

           <div className="mt-12 pt-6 border-t border-slate-200 flex justify-center">
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Offer Valid Until (有效期至)</span>
                <span className="text-xs font-black text-slate-800 uppercase">{validityDate}</span>
              </div>
           </div>
        </div>
      </div>

      <div className="mt-8 text-center px-4 break-inside-avoid">
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em] mb-3">RSVP</h4>
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-600 leading-relaxed">
            Please confirm your selection by signing and returning this form. <br/>
            Any dietary adjustments should be finalized at least 14 days prior to the event.
          </p>
          <p className="text-[11px] font-bold text-slate-600 leading-relaxed">
            請簽妥此表格並回傳以確認上述選擇。 <br/>
            所有特殊飲食要求請於活動日期前至少 14 天確認。
          </p>
        </div>
      </div>

      <div className="mt-12 break-inside-avoid">
        <SignatureBox 
           labelEn={data.clientName || "Client Signature"} 
           labelZh="客戶簽署" 
           sigDataUrl={clientSig} 
           onSign={onSign ? () => onSign(docType) : null}
           dateStr={data.signatures?.[docType]?.clientDate}
        />
      </div>
    </div>
  );
};