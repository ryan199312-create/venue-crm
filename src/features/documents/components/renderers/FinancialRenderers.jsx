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
import { docT } from '../../docStrings';

const InvoiceReceiptLayout = ({ data, typeEn, typeZh, billing, setupStr, avStr, decorStr, onSign, printMode, appSettings, lang = 'en' }) => {
  const { clientSig, adminSig } = getSignatures(data, printMode);
  const useEn = lang !== 'zh'; // 'zh' -> Chinese, anything else -> English
  const t = docT(lang);

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

      <DocumentHeader data={data} typeEn={typeEn} typeZh={typeZh} appSettings={appSettings} lang={lang} />
      <ClientInfoGrid data={data} appSettings={appSettings} lang={lang} />
      <ItemTable
        billing={billing}
        setupStr={setupStr}
        avStr={avStr}
        decorStr={decorStr}
        lang={lang}
        appSettings={appSettings}
        showFinancials={true}
        showPayments={printMode === 'INVOICE' || printMode === 'RECEIPT'}
        showSchedule={printMode === 'QUOTATION'}
        data={data}
      />

      <PaymentMethodBlock appSettings={appSettings} venueId={data.venueId} printMode={printMode} lang={lang} />

      {printMode === 'QUOTATION' && (() => {
        // Tenant-specific confidentiality notice: use the venue's own settings, or a
        // neutral default built from the tenant's name (never another tenant's).
        const profile = appSettings?.venueProfiles?.[data.venueId] || appSettings?.venueProfile || {};
        const vZh = profile.nameZh || appSettings?.venueName || '本公司';
        const vEn = profile.nameEn || 'the venue';
        const noticeZh = profile.confidentialityNoticeZh
          || `本文及其附件由${vZh}發出，內容屬於機密，僅供收件人使用，未經${vZh}事先批准，不得複製或披露；其應妥善保管，保持機密，且不得用於與此次活動無關的任何用途。`;
        const noticeEn = profile.confidentialityNoticeEn
          || `This document and its attachments are issued by ${vEn} and are confidential for the use of the intended recipient only. They may not be reproduced or disclosed without prior approval. They should be kept secure and confidential and must not be used for any purpose unrelated to this event.`;
        return (
          <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-500 italic leading-relaxed break-inside-avoid">
            <p className="mb-2 whitespace-pre-line">{noticeZh}</p>
            <p className="whitespace-pre-line">{noticeEn}</p>
          </div>
        );
      })()}

      {(printMode === 'QUOTATION' || (printMode !== 'INVOICE' && printMode !== 'RECEIPT')) && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start break-inside-avoid">
          <div className="text-[10px] text-slate-500 leading-relaxed">
            {printMode === 'QUOTATION' && (appSettings?.venueProfiles?.[data.venueId]?.paymentTermsQuotation || appSettings?.venueProfile?.paymentTermsQuotation) && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-800 uppercase mb-2 tracking-wider">{t.paymentTerms}</h4>
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
                  titleEn={t.confirmedAcceptedBy}
                  labelEn={data.clientName || t.clientSignature}
                  labelZh=""
                  sigDataUrl={clientSig}
                  onSign={onSign ? () => onSign(printMode) : null}
                  dateStr={data.signatures?.[printMode]?.clientDate}
                  alignRight={true}
                  lang={lang}
                  appSettings={appSettings}
                />
              </div>
            ) : (printMode !== 'INVOICE' && printMode !== 'RECEIPT') ? (
              <div className="grid grid-cols-2 gap-6">
                <SignatureBox
                  labelEn={useEn ? 'Authorized Signature' : `${appSettings?.venueProfile?.nameZh || '管理員'} 簽署及蓋章`}
                  labelZh=""
                  sigDataUrl={adminSig}
                  dateStr={data.signatures?.[printMode]?.adminDate}
                  isAdmin={true}
                  alignRight={false}
                  lang={lang}
                  appSettings={appSettings}
                />
                <SignatureBox
                  labelEn={data.clientName || t.clientSignature}
                  labelZh=""
                  sigDataUrl={clientSig}
                  onSign={onSign ? () => onSign(printMode) : null}
                  dateStr={data.signatures?.[printMode]?.clientDate}
                  alignRight={true}
                  lang={lang}
                  appSettings={appSettings}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export const QuotationRenderer = ({ data, appSettings, onSign, lang = 'en' }) => {
  const billing = useMemo(() => data ? generateBillingSummary(data, appSettings) : {}, [data, appSettings]);
  const { setupStr, avStr, decorStr } = data ? getPackageStrings(data, lang !== 'zh') : { setupStr: '', avStr: '', decorStr: '' };
  if (!data) return null;
  return <InvoiceReceiptLayout data={data} typeEn="Quotation" typeZh="報價單" billing={billing} setupStr={setupStr} avStr={avStr} decorStr={decorStr} onSign={onSign} printMode="QUOTATION" appSettings={appSettings} lang={lang} />;
};

export const InvoiceRenderer = ({ data, appSettings, onSign, lang = 'en' }) => {
  const billing = useMemo(() => data ? generateBillingSummary(data, appSettings) : {}, [data, appSettings]);
  const { setupStr, avStr, decorStr } = data ? getPackageStrings(data, lang !== 'zh') : { setupStr: '', avStr: '', decorStr: '' };
  if (!data) return null;
  return <InvoiceReceiptLayout data={data} typeEn="Invoice" typeZh="發票" billing={billing} setupStr={setupStr} avStr={avStr} decorStr={decorStr} onSign={onSign} printMode="INVOICE" appSettings={appSettings} lang={lang} />;
};

export const ReceiptRenderer = ({ data, appSettings, onSign, lang = 'en' }) => {
  const billing = useMemo(() => data ? generateBillingSummary(data, appSettings) : {}, [data, appSettings]);
  const { setupStr, avStr, decorStr } = data ? getPackageStrings(data, lang !== 'zh') : { setupStr: '', avStr: '', decorStr: '' };
  if (!data) return null;
  return <InvoiceReceiptLayout data={data} typeEn="Receipt" typeZh="收據" billing={billing} setupStr={setupStr} avStr={avStr} decorStr={decorStr} onSign={onSign} printMode="RECEIPT" appSettings={appSettings} lang={lang} />;
};