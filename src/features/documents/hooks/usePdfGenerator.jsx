import React from 'react';
import { renderToString } from 'react-dom/server';
import { functions, db, storage } from '../../../core/firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import DocumentRouter from '../components/DocumentRouter';
import { useAuth } from '../../../context/AuthContext';

export function usePdfGenerator() {
  const { appId } = useAuth();
  
  const generatePdf = async ({ docType, data, appSettings, download = false }) => {
    const jobId = Math.random().toString(36).substring(7);
    const fileName = `${data.orderId}_${docType}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // 1. Render HTML
    const html = renderToString(
      <DocumentRouter data={data} printMode={docType} appSettings={appSettings} />
    );

    // Extract Theme Variables for the PDF
    const rootStyle = getComputedStyle(document.documentElement);
    const themeVars = `
      :root {
        --brand-primary: ${rootStyle.getPropertyValue('--brand-primary') || '#4F46E5'};
        --brand-secondary: ${rootStyle.getPropertyValue('--brand-secondary') || '#1e293b'};
        --brand-accent: ${rootStyle.getPropertyValue('--brand-accent') || '#8b5cf6'};
      }
    `;

    // Add styles and Paged.js logic for the PDF (Matching Native Printer)
    const styledHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            ${themeVars}
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap');
            
            body { 
              font-family: 'Noto Sans TC', sans-serif !important; 
              margin: 0 !important; padding: 0 !important; background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            /* PAGED.JS ENGINE CONFIGURATION (MATCHING NATIVE) */
            @page {
              size: A4;
              margin: 15mm 15mm 15mm 15mm;

              @bottom-left {
                content: element(footerLeft);
                font-size: 8px; color: #64748b; font-family: sans-serif;
                text-transform: uppercase; border-top: 0.5pt solid #cbd5e1;
                padding-top: 1.5mm; white-space: nowrap;
              }

              @bottom-right {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 8px; color: #0f172a; font-family: sans-serif; font-weight: bold;
                border-top: 0.5pt solid #cbd5e1; padding-top: 1.5mm; text-align: right;
              }
            }

            .running-footer-left { position: running(footerLeft); }
            .pagedjs-footer-source { position: absolute; top: 0; left: 0; visibility: hidden; height: 0; width: 0; overflow: hidden; }
            .page-break { page-break-after: always !important; break-after: page !important; }
            .break-inside-avoid { break-inside: avoid !important; }
            
            /* PDF Specific Tweaks */
            .print-page { box-shadow: none !important; margin: 0 !important; border: none !important; }
            @page:blank { display: none !important; }
          </style>
        </head>
        <body class="bg-white">
          <div class="print-container">
            ${html}
          </div>
          
          <script src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"></script>
          <script>
            // Signal to Puppeteer that we use Paged.js
            window.PagedConfig = {
              auto: true,
              after: (flow) => {
                // Set a flag that the Cloud Function can wait for
                window.status = 'ready_to_print';
                console.log('Paged.js layout complete');
              }
            };
          </script>
        </body>
      </html>
    `;

    // 2. Upload HTML to Storage (Avoid Firestore 1MB limit)
    const htmlPath = `pdf_payloads/${appId}/${jobId}.html`;
    const htmlRef = ref(storage, htmlPath);
    await uploadString(htmlRef, styledHtml, 'raw', { contentType: 'text/html' });

    // 3. Call Enqueue Function (Manual fetch for CORS stability)
    const response = await fetch('https://asia-east2-event-management-system-9f764.cloudfunctions.net/enqueuePdfJob', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        appId, 
        htmlPath, 
        fileName, 
        docType, 
        jobId,
        orderId: data.orderId,
        eventName: data.eventName
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to enqueue PDF job: ${await response.text()}`);
    }

    const { data: { jobId: confirmedJobId } } = await response.json();

    // 4. Listen for completion
    return new Promise((resolve, reject) => {
      const unsub = onSnapshot(doc(db, 'artifacts', appId, 'private', 'data', 'pdf_jobs', jobId), (snap) => {
        const jobStatus = snap.data();
        if (jobStatus?.status === 'completed') {
          unsub();
          if (download) {
            const link = document.createElement('a');
            link.href = jobStatus.url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } else {
            // Open in new tab
            window.open(jobStatus.url, '_blank');
          }
          resolve({ url: jobStatus.url, fileName });
        } else if (jobStatus?.status === 'error') {
          unsub();
          reject(new Error(jobStatus.error));
        }
      });
    });
  };

  return { generatePdf };
}
