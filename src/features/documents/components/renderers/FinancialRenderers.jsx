import React, { useMemo } from 'react';
import { 
  DocumentHeader, 
  ClientInfoGrid, 
  ItemTable, 
  SignatureBox, 
  getPackageStrings,
  getSignatures,
  formatMoney,
  generateBillingSummary
} from './DocumentShared';

const InvoiceReceiptLayout = ({ data, typeEn, typeZh, billing, setupStr, avStr, decorStr, onSign, printMode, appSettings }) => {
  const { clientSig, adminSig } = getSignatures(data, printMode);
  
  return (
    <div className="font-sans text-slate-900 w-full max-w-[210mm] print:max-w-none mx-auto bg-white p-[10mm] print:p-0 min-h-[297mm] print:min-h-0 shadow-sm print:shadow-none relative">
      <style>{`@media print { @page { margin: 10mm; size: A4; } body { -webkit-print-color-adjust: exact; } }`}</style>
      
      <DocumentHeader data={data} typeEn={typeEn} typeZh={typeZh} />
      <ClientInfoGrid data={data} appSettings={appSettings} />
      <ItemTable 
        billing={billing} 
        setupStr={setupStr} 
        avStr={avStr} 
        decorStr={decorStr} 
        isEn={true} 
        showFinancials={true} 
        showPayments={printMode === 'INVOICE' || printMode === 'RECEIPT'}
        data={data}
      />

      <div className="mt-12 break-inside-avoid">
        {printMode === 'QUOTATION' ? (
          <div className="flex justify-end">
            <SignatureBox 
              labelEn={data.clientName || "Client Signature"} 
              labelZh="客戶簽署" 
              sigDataUrl={clientSig} 
              onSign={onSign ? () => onSign(printMode) : null}
              dateStr={data.signatures?.[printMode]?.clientDate}
              alignRight={true}
            />
          </div>
        ) : (printMode !== 'INVOICE' && printMode !== 'RECEIPT') ? (
          <div className="grid grid-cols-2 gap-12">
            <SignatureBox 
              labelEn="Authorized Signature" 
              labelZh="璟瓏軒 簽署及蓋章" 
              sigDataUrl={adminSig} 
              dateStr={data.signatures?.[printMode]?.adminDate}
              isAdmin={true}
              alignRight={false}
            />
            <SignatureBox 
              labelEn={data.clientName || "Client Signature"} 
              labelZh="客戶簽署" 
              sigDataUrl={clientSig} 
              onSign={onSign ? () => onSign(printMode) : null}
              dateStr={data.signatures?.[printMode]?.clientDate}
              alignRight={true}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const QuotationRenderer = ({ data, appSettings, onSign }) => {
  const billing = useMemo(() => generateBillingSummary(data), [data]);
  const { setupStr, avStr, decorStr } = getPackageStrings(data, true);
  return <InvoiceReceiptLayout data={data} typeEn="Quotation" typeZh="報價單" billing={billing} setupStr={setupStr} avStr={avStr} decorStr={decorStr} onSign={onSign} printMode="QUOTATION" appSettings={appSettings} />;
};

export const InvoiceRenderer = ({ data, appSettings, onSign }) => {
  const billing = useMemo(() => generateBillingSummary(data), [data]);
  const { setupStr, avStr, decorStr } = getPackageStrings(data, true);
  return <InvoiceReceiptLayout data={data} typeEn="Invoice" typeZh="發票" billing={billing} setupStr={setupStr} avStr={avStr} decorStr={decorStr} onSign={onSign} printMode="INVOICE" appSettings={appSettings} />;
};

export const ReceiptRenderer = ({ data, appSettings, onSign }) => {
  const billing = useMemo(() => generateBillingSummary(data), [data]);
  const { setupStr, avStr, decorStr } = getPackageStrings(data, true);
  return <InvoiceReceiptLayout data={data} typeEn="Receipt" typeZh="收據" billing={billing} setupStr={setupStr} avStr={avStr} decorStr={decorStr} onSign={onSign} printMode="RECEIPT" appSettings={appSettings} />;
};