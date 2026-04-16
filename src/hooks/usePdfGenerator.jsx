import React from 'react';
import { renderToString } from 'react-dom/server';
import { functions, db } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import DocumentRenderer from '../admin/DocumentRenderer';

let cachedTailwindCss = null;

export function usePdfGenerator() {
  const generatePdf = async ({ docType, data, appSettings, download = false, includeSignature = true }) => {
    const pdfData = includeSignature ? data : { 
      ...data, 
      clientSignature: null, 
      clientSignatureDate: null,
      signatures: null 
    };
    
    const htmlContent = renderToString(<DocumentRenderer data={pdfData} printMode={docType} appSettings={appSettings} />);
    
    if (!cachedTailwindCss) {
      try {
        const cssResponse = await fetch(`${window.location.origin}/tailwind-print.css`);
        if (cssResponse.ok) cachedTailwindCss = await cssResponse.text();
      } catch (err) {
        console.warn("Error fetching tailwind-print.css:", err);
      }
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap" rel="stylesheet">
          <style>
            ${cachedTailwindCss || ''}
            body { font-family: 'Noto Sans TC', 'PingFang HK', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @media print { 
              html, body, #root { height: auto !important; min-height: auto !important; overflow: visible !important; position: static !important; display: block !important; } 
            }
          </style>
        </head>
        <body>${htmlContent}</body>
      </html>
    `;

    const sigData = data.signatures?.[docType] || {};
    const legacySig = ['QUOTATION', 'CONTRACT', 'CONTRACT_CN', 'MENU_CONFIRM'].includes(docType) ? data.clientSignature : null;
    const hasClientSig = !!(sigData.client || legacySig);
    const sigTag = (includeSignature && hasClientSig && ['QUOTATION', 'CONTRACT', 'CONTRACT_CN', 'MENU_CONFIRM'].includes(docType)) ? '_Signed' : '';
    
    const safeName = (data.orderId || data.eventName || 'Document').replace(/[\/\\]/g, '-');
    const fileName = `${safeName}_${docType}${sigTag}.pdf`;
    
    const enqueueApi = httpsCallable(functions, 'enqueuePdfJob');
    const { data: { jobId } } = await enqueueApi({ html: fullHtml, fileName, docType });

    return new Promise((resolve, reject) => {
      const jobRef = doc(db, 'artifacts', 'my-venue-crm', 'private', 'data', 'pdf_jobs', jobId);
      const unsubscribe = onSnapshot(jobRef, (snap) => {
        const jobStatus = snap.data();
        if (jobStatus?.status === 'completed') {
          unsubscribe();
          if (download) {
            const a = document.createElement('a');
            a.href = jobStatus.url;
            a.download = fileName;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
          }
          resolve({ url: jobStatus.url, fileName });
        } else if (jobStatus?.status === 'error') {
          unsubscribe();
          reject(new Error(jobStatus.error));
        }
      });
    });
  };

  return { generatePdf };
}