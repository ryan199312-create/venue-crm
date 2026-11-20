import React from 'react';
import { renderToString } from 'react-dom/server';
import { storage, auth } from '../../../core/firebase';
import { ref, uploadString } from 'firebase/storage';
import DocumentRouter from '../components/DocumentRouter';
import { getDocStyle } from '../docStyles';
import { useAuth } from '../../../context/AuthContext';

const PDF_ENDPOINT = 'https://asia-east2-event-management-system-9f764.cloudfunctions.net/enqueuePdfJob';

// Turn SDK / network failures into something staff can act on. When the Firebase project's
// billing is disabled, Storage answers 402 and Cloud Run rejects the request before any CORS
// headers are added, so the browser only ever sees a generic "Failed to fetch".
function describePdfError(err, stage) {
  const msg = err?.message || String(err);
  const serverResponse = err?.serverResponse || err?.customData?.serverResponse || '';
  if (/\b402\b|billing|payment required/i.test(`${msg} ${serverResponse}`)) {
    return 'Firebase 專案帳單已停用 (Firebase billing is disabled for this project — re-enable it in Google Cloud)';
  }
  if (err instanceof TypeError && /fetch/i.test(msg)) {
    return stage === 'generate'
      ? '無法連接 PDF 服務 (Cannot reach the PDF service — check the project billing / function deployment)'
      : '無法連接 Firebase Storage (Cannot reach Firebase Storage)';
  }
  if (err?.code === 'storage/unauthorized') {
    return '沒有上傳權限 (No permission to upload the document payload)';
  }
  return msg;
}

// Open a URL in a new tab. By the time the PDF is ready the click's user activation has
// expired, so a popup blocker may refuse — report that instead of failing silently.
function openInNewTab(url) {
  // (Not the 'noopener' feature string: that makes window.open return null even on success.)
  const win = window.open(url, '_blank');
  if (!win) throw new Error('瀏覽器阻擋了彈出視窗，請允許此網站的彈出視窗 (The browser blocked the popup — allow popups for this site)');
  try { win.opener = null; } catch { /* cross-origin — ignore */ }
}

// Save a cross-origin file under its own name. A plain <a download> is ignored for
// cross-origin URLs (the browser navigates to the PDF instead), so fetch the bytes and save
// them from a blob: URL. firebasestorage.googleapis.com answers with
// Access-Control-Allow-Origin: * so this needs no bucket CORS config. If the fetch fails
// anyway, fall back to opening the file in a new tab.
async function downloadFile(url, fileName) {
  let objectUrl = null;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    objectUrl = URL.createObjectURL(blob);
  } catch (err) {
    console.warn('[PDF] Could not fetch the file for download, opening it instead:', err);
    openInNewTab(url);
    return;
  }
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Give the browser time to start the download before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60 * 1000);
}

export function usePdfGenerator() {
  const { appId } = useAuth();

  /**
   * Render a document to PDF via the enqueuePdfJob Cloud Function.
   *   download: save the file to disk (under its generated name)
   *   silent:   neither download nor open — the caller only wants { url, fileName }
   *   (default) open the PDF in a new tab
   */
  const generatePdf = async ({ docType, data, appSettings, download = false, lang = 'en', silent = false }) => {
    const docFont = getDocStyle(appSettings).font;
    const jobId = Math.random().toString(36).substring(7);
    const fileName = `${data.orderId}_${docType}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // 1. Render HTML
    const html = renderToString(
      <DocumentRouter data={data} printMode={docType} appSettings={appSettings} lang={lang} />
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
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=Noto+Serif+TC:wght@400;500;700;900&display=swap');

            body {
              font-family: ${docFont} !important;
              margin: 0 !important; padding: 0 !important; background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            /* Document design style: force the chosen font through the whole document,
               overriding renderers' hardcoded .font-sans (mirrors the on-screen rule). */
            .doc-font-root, .doc-font-root * { font-family: ${docFont} !important; }

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

    // 2. Upload HTML to Storage (avoids the Firestore 1MB limit)
    const htmlPath = `pdf_payloads/${appId}/${jobId}.html`;
    const htmlRef = ref(storage, htmlPath);
    try {
      await uploadString(htmlRef, styledHtml, 'raw', { contentType: 'text/html' });
    } catch (err) {
      throw new Error(describePdfError(err, 'upload'));
    }

    // 3. Generate. enqueuePdfJob renders synchronously and answers with the file URL, so
    //    there is no job document to wait on. (Plain fetch rather than httpsCallable for
    //    CORS stability; the ID token lets the function authorise + tenant-scope the job.)
    const idToken = await auth.currentUser?.getIdToken();
    let response;
    try {
      response = await fetch(PDF_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {})
        },
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
    } catch (err) {
      throw new Error(describePdfError(err, 'generate'));
    }

    if (!response.ok) {
      const body = (await response.text().catch(() => '')).slice(0, 200);
      throw new Error(`PDF 服務錯誤 (PDF service error) ${response.status}: ${body}`);
    }

    const payload = await response.json().catch(() => ({}));
    const url = payload?.data?.url;
    if (!url) throw new Error('PDF 服務沒有回傳檔案 (The PDF service returned no file URL)');

    // 4. Deliver
    if (download) {
      await downloadFile(url, fileName);
    } else if (!silent) {
      openInNewTab(url);
    }
    return { url, fileName };
  };

  return { generatePdf };
}
