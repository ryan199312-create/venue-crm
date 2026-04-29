import React, { useMemo } from 'react';
import { 
  DocumentHeader, 
  ClientInfoGrid, 
  ItemTable, 
  SignatureBox, 
  getPackageStrings,
  getSignatures,
  formatMoney,
  generateBillingSummary,
  onlyChinese,
  formatDateEn,
  getVenueEn
} from './DocumentShared';

export const ContractRenderer = ({ data, appSettings, onSign, isCn = false }) => {
  const billing = useMemo(() => generateBillingSummary(data), [data]);
  const { setupStr, avStr, decorStr } = getPackageStrings(data, !isCn);
  const { clientSig, adminSig } = getSignatures(data, isCn ? 'CONTRACT_CN' : 'CONTRACT');

  const isFullyPaid = data.balanceReceived || (billing.totalPaid > 0 && billing.totalPaid >= billing.grandTotal);

  const displayEventType = useMemo(() => {
    const type = data.eventType || '';
    const match = type.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) return isCn ? match[1] : match[2];
    return type;
  }, [data.eventType, isCn]);

  return (
    <div className="font-sans text-slate-900 w-full max-w-[210mm] print:max-w-none mx-auto bg-white p-[10mm] print:p-0 min-h-[297mm] print:min-h-0 shadow-sm print:shadow-none relative">
      <style>{`@media print { @page { margin: 10mm; size: A4; } body { -webkit-print-color-adjust: exact; } }`}</style>
      
      <DocumentHeader data={data} typeEn="Service Agreement" typeZh={isCn ? "服務合約" : "合約"} />
      
      <div className="bg-slate-50 border border-slate-200 px-8 py-10 rounded-[2rem] mb-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-[#A57C00]"></div>
        <div className="max-w-2xl mx-auto">
          <p className="text-xl font-serif italic text-slate-800 mb-4">
            {isCn ? `感謝您選擇璟瓏軒舉行您的${displayEventType || '活動'}。` : `Thank you for choosing King Lung Heen for your ${displayEventType || 'event'}.`}
          </p>
          <p className="text-sm text-slate-600 leading-relaxed font-medium text-center">
            {isCn 
              ? `我們深感榮幸能參與您於 ${data.date} (${data.startTime}至${data.endTime}) 舉行的重要時刻。坐落於香港故宮文化博物館，我們的場地融合了深厚的文化底蘊與現代優雅。我們的專業團隊致力於提供卓越的服務與精緻的餐飲，確保您的活動圓滿成功且令人難忘。我們誠摯期待與您及您的賓客一同打造這場非凡的慶典。`
              : `We are deeply honored to be part of your special occasion scheduled for ${formatDateEn(data.date)} from ${data.startTime} to ${data.endTime}. Nestled within the Hong Kong Palace Museum, our venue offers a unique blend of cultural heritage and modern elegance. Our dedicated team is committed to providing exceptional service and culinary excellence to ensure your event is truly unforgettable. We look forward to welcoming you and your guests to an extraordinary celebration.`
            }
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8 border-b border-slate-100 pb-8">
        <div>
          <h3 className="text-[10px] font-black text-[#A57C00] uppercase tracking-widest mb-4">Agreement Parties</h3>
          <div className="space-y-4">
             <div>
               <p className="text-[9px] font-bold text-slate-400 uppercase">Provider / 服務提供者</p>
               <p className="text-sm font-black text-slate-800 uppercase tracking-tight">King Lung Heen (璟瓏軒)</p>
             </div>
             <div>
               <p className="text-[9px] font-bold text-slate-400 uppercase">Client / 客戶</p>
               <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{data.clientName}</p>
               {data.companyName && <p className="text-[10px] text-slate-500 font-medium">{data.companyName}</p>}
             </div>
          </div>
        </div>
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
           <h3 className="text-[10px] font-black text-[#A57C00] uppercase tracking-widest mb-4">Event Schedule</h3>
           <div className="space-y-3">
             <div className="flex justify-between items-end border-b border-slate-200 pb-2">
               <span className="text-[10px] font-bold text-slate-400 uppercase">Event Date</span>
               <span className="text-xs font-black text-slate-800">{formatDateEn(data.date)}</span>
             </div>
             <div className="flex justify-between items-end border-b border-slate-200 pb-2">
               <span className="text-[10px] font-bold text-slate-400 uppercase">Venue</span>
               <span className="text-xs font-black text-slate-800">{getVenueEn(data.venueLocation)}</span>
             </div>
             <div className="flex justify-between items-end">
               <span className="text-[10px] font-bold text-slate-400 uppercase">Time Slot</span>
               <span className="text-xs font-black text-slate-800">{data.startTime} - {data.endTime}</span>
             </div>
           </div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-[10px] font-black text-[#A57C00] uppercase tracking-widest mb-4">Services & Minimum Spend</h3>
        <ItemTable 
          billing={billing} 
          setupStr={setupStr} 
          avStr={avStr} 
          decorStr={decorStr} 
          isEn={!isCn} 
          showFinancials={true}
          grandTotalLabel={isCn ? "總合約金額 (Total Agreement Value)" : "Total Agreement Value"}
        />
      </div>

      <div className="page-break"></div>
      
      <div className="page-break"></div>
      
      {/* PAGE 2: TERMS & CONDITIONS */}
      <div className="mt-8 px-4">
        <div className="text-center mb-6">
          <h3 className="inline-block font-black uppercase text-sm tracking-[0.2em] border-b-2 pb-1" style={{ color: '#A57C00', borderColor: '#A57C00' }}>
            {isCn ? '條款及細則' : 'Terms and Conditions'}
          </h3>
        </div>
        <div className="columns-2 gap-10 text-[10px] text-slate-700 leading-relaxed text-justify">
          <div className="font-bold text-slate-900 mb-1 mt-3 underline uppercase">{isCn ? '1. 付款條款' : '1. Payment Terms'}</div>
          <p className="mb-3">
            {isCn ? "付款方式包括現金、信用卡或銀行轉帳（BOC 012-875-2-082180-1）。付款必須在指定的到期日之前進行。最終餘額必須在活動前結清。如選擇進行匯款或信用卡需要額外支付3%的銀行手續費。" : "Payment methods include Cash, Credit Card, or Bank Transfer (BOC 012-875-2-082180-1). Payments must be made before the specified due dates. The final balance must be settled before the event. If payment is made via remittance or credit card, the client will pay a 3% transactional surcharge."}
          </p>
          <div className="font-bold text-slate-900 mb-1 mt-3 underline uppercase">{isCn ? '2. 延期和取消' : '2. Postponement & Cancellation'}</div>
          <p className="mb-3">
            {isCn ? "活動可在提前6個月以上通知的情況下延期一次，需支付改期費 HKD 10,000。取消罰金根據通知的時間而定：確認期（第一次和第二次付款）；提前1個月（最低消費90%）；提前1周（最低消費100%）。" : "The event may be postponed once with over 6 months' notice (subject to a rescheduling fee of HKD 10,000). Cancellation penalties: Confirmed period (forfeiture of 1st and 2nd payments); 1 month prior (90% of minimum spend); 1 week prior (100% of minimum spend)."}
          </p>
          <div className="font-bold text-slate-900 mb-1 mt-3 underline uppercase">{isCn ? '3. 天氣政策' : '3. Weather Policy'}</div>
          <p className="mb-3">
            {isCn ? "在8號風球或以上的情況下，活動可在3個月內免收費重新安排。在3號風球或紅/黃/黑雨的情況下，活動按計劃進行；任何取消將按照條款二處理。" : "In the event of Typhoon Signal No. 8 or warning above, the event may be rescheduled within 3 months without charges. Under Typhoon Signal No. 3 or Red/Yellow/Black Rainstorm Warning, the event will proceed as scheduled; any cancellations follow policy two."}
          </p>
          <div className="font-bold text-slate-900 mb-1 mt-3 underline uppercase">{isCn ? '4. 場地規則' : '4. House Rules'}</div>
          <p className="mb-3">
            {isCn ? "未經同意不得攜帶外部食物/飲品。裝飾必須僅使用“Blu-tack”。禁止吸煙。場地保留停止不安全活動或佈置的權利。場地佈置需活動前30天提交平面圖、施工細節，施工流程及物料清單等。若高於3米裝置，需提交RSE及有效保險單。客戶在簽署合約時，須支付押金作為保障，用於補償因客戶或其委託人員造成的場地及設施損壞或清潔費用（例如嘔吐清潔費）。押金金額HKD 10,000至50,000，若在活動結束後檢查確認未發生損壞，押金將在48小時全額退還；如有損壞或清潔需求，將從押金中扣除相應費用，剩餘部份則予以退還" : "No outside food or drinks may be brought in without permission. Decorations must use only “Blu-tack”. Smoking is prohibited. The venue reserves the right to stop any unsafe activities or setups. A floor plan, construction details, construction process, and materials list must be submitted 30 days prior to the event. For installations exceeding 3 meters in height, an RSE (Responsible Safety) certificate and a valid insurance policy are required. A deposit must be paid upon signing the contract as a guarantee to cover damage to the venue and facilities or cleaning costs (e.g., vomit cleaning fees) caused by the client or their authorized personnel. The deposit amount is HKD 10,000 to 50,000. The deposit will be fully refunded within 48 hours if no damage is found after the event; if damage or cleaning is required, the corresponding cost will be deducted from the deposit, and the remaining amount will be refunded."}
          </p>
          <div className="font-bold text-slate-900 mb-1 mt-3 underline uppercase">{isCn ? '5. 責任' : '5. Liability'}</div>
          <p className="mb-3">
            {isCn ? "客戶對客人或承包商造成的損害負責，並同意對活動造成的損失對場地進行賠償。" : "The Client is liable for damages caused by guests or contractors and agrees to indemnify the venue for any losses arising from the event."}
          </p>
          <div className="font-bold text-slate-900 mb-1 mt-3 underline uppercase">{isCn ? '6. 不可抗力' : '6. Force Majeure'}</div>
          <p className="mb-3">
            {isCn ? "如果場地因政府限制或不可抗力事件導致活動取消，將提供全額退款或免費重新安排。" : "If the event is cancelled due to government restrictions or force majeure, a full refund or free rescheduling will be offered."}
          </p>
          <div className="font-bold text-slate-900 mb-1 mt-3 underline uppercase">{isCn ? '7. 一般條款' : '7. General'}</div>
          <p className="mb-3">
            {isCn ? "本合約受香港法律管轄，相關條款為保密信息。未涵蓋的細節部分可另行撰寫，並需經雙方同意及授權簽署。" : "Governed by HK laws. Terms are confidential. Uncovered details may be drafted separately subject to mutual agreement and authorized signatures."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mt-16 break-inside-avoid">
        <SignatureBox 
           titleEn="For and on behalf of"
           labelEn="KING LUNG HEEN" 
           labelZh="璟瓏軒 簽署及蓋章" 
           sigDataUrl={adminSig} 
           dateStr={data.signatures?.[isCn ? 'CONTRACT_CN' : 'CONTRACT']?.adminDate}
           isAdmin={true}
        />
        <SignatureBox 
           labelEn={data.clientName || "Client Signature"} 
           labelZh="客戶簽署" 
           sigDataUrl={clientSig} 
           onSign={onSign ? () => onSign(isCn ? 'CONTRACT_CN' : 'CONTRACT') : null}
           dateStr={data.signatures?.[isCn ? 'CONTRACT_CN' : 'CONTRACT']?.clientDate || data.clientSignatureDate}
        />
      </div>
    </div>
  );
};

export default ContractRenderer;