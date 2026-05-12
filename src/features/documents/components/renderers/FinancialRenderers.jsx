import React, { useMemo } from 'react';
import { 
  DocumentHeader, 
  BrandedFooter,
  ClientInfoGrid, 
  ItemTable, 
  SignatureBox, 
  getPackageStrings,
  getSignatures,
  formatMoney,
  generateBillingSummary,
  formatBoldText,
  PaymentMethodBlock
} from './DocumentShared';

const InvoiceReceiptLayout = ({ data, typeEn, typeZh, billing, setupStr, avStr, decorStr, onSign, printMode, appSettings }) => {
  const { clientSig, adminSig } = getSignatures(data, printMode);
  const isCn = printMode === 'INVOICE' || printMode === 'RECEIPT' ? false : false; // Placeholder if we add CN versions later, but for now we look at the specific renderer
  
  // For Financial docs, we usually default to English for professional standard in HK, 
  // but let's make it respect the type passed.
  const useEn = true; 

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

      <DocumentHeader data={data} typeEn={typeEn} typeZh={typeZh} appSettings={appSettings} />
      <ClientInfoGrid data={data} appSettings={appSettings} />
      <ItemTable 
        billing={billing} 
        setupStr={setupStr} 
        avStr={avStr} 
        decorStr={decorStr} 
        isEn={useEn} 
        showFinancials={true} 
        showPayments={printMode === 'INVOICE' || printMode === 'RECEIPT'}
        showSchedule={printMode === 'QUOTATION'}
        data={data}
      />

      <PaymentMethodBlock appSettings={appSettings} venueId={data.venueId} printMode={printMode} isCn={!useEn} />

      {printMode === 'QUOTATION' && (
        <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-500 italic leading-relaxed break-inside-avoid">
          <p className="mb-2">本文及其附件由璟瓏軒發出，內容屬於機密，僅供收件人使用，未經璟瓏軒事先批准，不得複製或披露；其應妥善保管，保持機密，且不得用於與此次活動無關的任何用途。</p>
          <p>This document and its attachments are issued by King Lung Heen and are confidential for the use of the intended recipient only. They may not be reproduced or disclosed without the prior approval of King Lung Heen. They should be kept secure and confidential and must not be used for any purpose unrelated to this event.</p>
        </div>
      )}

      {(printMode === 'QUOTATION' || (printMode !== 'INVOICE' && printMode !== 'RECEIPT')) && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start break-inside-avoid">
          <div className="text-[10px] text-slate-500 leading-relaxed">
            {printMode === 'QUOTATION' && (appSettings?.venueProfiles?.[data.venueId]?.paymentTermsQuotation || appSettings?.venueProfile?.paymentTermsQuotation) && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-800 uppercase mb-2 tracking-wider">Payment Terms</h4>
                <div className="whitespace-pre-wrap">
                  {formatBoldText(appSettings?.venueProfiles?.[data.venueId]?.paymentTermsQuotation || appSettings?.venueProfile?.paymentTermsQuotation)}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {printMode === 'QUOTATION' ? (
              <div className="flex justify-end">
                <SignatureBox 
                  titleEn="Confirmed & Accepted by"
                  labelEn={data.clientName || "Client Signature"} 
                  labelZh={useEn ? "" : "客戶簽署"} 
                  sigDataUrl={clientSig} 
                  onSign={onSign ? () => onSign(printMode) : null}
                  dateStr={data.signatures?.[printMode]?.clientDate}
                  alignRight={true}
                />
              </div>
            ) : (printMode !== 'INVOICE' && printMode !== 'RECEIPT') ? (
              <div className="grid grid-cols-2 gap-6">
                <SignatureBox 
                  labelEn="Authorized Signature" 
                  labelZh={useEn ? "" : `${appSettings?.venueProfile?.nameZh || '管理員'} 簽署及蓋章`} 
                  sigDataUrl={adminSig} 
                  dateStr={data.signatures?.[printMode]?.adminDate}
                  isAdmin={true}
                  alignRight={false}
                />
                <SignatureBox 
                  labelEn={data.clientName || "Client Signature"} 
                  labelZh={useEn ? "" : "客戶簽署"} 
                  sigDataUrl={clientSig} 
                  onSign={onSign ? () => onSign(printMode) : null}
                  dateStr={data.signatures?.[printMode]?.clientDate}
                  alignRight={true}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export const QuotationRenderer = ({ data, appSettings, onSign }) => {
  const billing = useMemo(() => data ? generateBillingSummary(data, appSettings) : {}, [data, appSettings]);
  const { setupStr, avStr, decorStr } = data ? getPackageStrings(data, true) : { setupStr: '', avStr: '', decorStr: '' };
  if (!data) return null;
  return <InvoiceReceiptLayout data={data} typeEn="Quotation" typeZh="報價單" billing={billing} setupStr={setupStr} avStr={avStr} decorStr={decorStr} onSign={onSign} printMode="QUOTATION" appSettings={appSettings} />;
};

export const InvoiceRenderer = ({ data, appSettings, onSign }) => {
  const billing = useMemo(() => data ? generateBillingSummary(data, appSettings) : {}, [data, appSettings]);
  const { setupStr, avStr, decorStr } = data ? getPackageStrings(data, true) : { setupStr: '', avStr: '', decorStr: '' };
  if (!data) return null;
  return <InvoiceReceiptLayout data={data} typeEn="Invoice" typeZh="發票" billing={billing} setupStr={setupStr} avStr={avStr} decorStr={decorStr} onSign={onSign} printMode="INVOICE" appSettings={appSettings} />;
};

export const ReceiptRenderer = ({ data, appSettings, onSign }) => {
  const billing = useMemo(() => data ? generateBillingSummary(data, appSettings) : {}, [data, appSettings]);
  const { setupStr, avStr, decorStr } = data ? getPackageStrings(data, true) : { setupStr: '', avStr: '', decorStr: '' };
  if (!data) return null;
  return <InvoiceReceiptLayout data={data} typeEn="Receipt" typeZh="收據" billing={billing} setupStr={setupStr} avStr={avStr} decorStr={decorStr} onSign={onSign} printMode="RECEIPT" appSettings={appSettings} />;
};