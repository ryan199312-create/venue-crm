/**
 * Native (browser) printing of documents — the "原生列印 (Native)" button.
 *
 * The rendered document HTML is written into a hidden iframe, paginated there by Paged.js
 * (running footer + "Page X of Y"), and the iframe then prints itself.
 *
 * It must never print a half-paginated document. Paged.js moves <body> into a <template>
 * and re-adds the content one page per animation frame, so print() during that run outputs
 * only the pages built so far (or a blank page) — the old "only the first page prints" bug.
 * Printing therefore waits for Paged.js to finish; if it can't (CDN blocked, a crash, or far
 * too slow) the iframe is rebuilt without Paged.js and printed natively, so the output is
 * always the complete document.
 */

// Pinned on purpose: the bare unpkg URL silently follows new releases.
// Keep in sync with the <link rel="preload"> in index.html.
export const PAGED_POLYFILL_URL = 'https://unpkg.com/pagedjs@0.4.3/dist/paged.polyfill.min.js';

// Paged.js usually finishes in 1–4 s, but a first print on a cold cache also downloads ~4 MB
// of Noto Sans TC before laying out page 1. Beyond this, print natively instead of waiting.
const DEFAULT_TIMEOUT_MS = 15000;

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Runs inside the print iframe: prints exactly once, and only a complete document.
// Kept as a plain string (not a function's source) so build tooling can never rewrite it.
const IFRAME_RUNTIME = `(function (opts) {
  var finished = false;
  var paginated = false;

  function printNow() {
    if (finished) return;
    finished = true;
    window.print();
    window.parent.postMessage('print_done', '*');
  }

  // Paged.js unavailable, crashed or too slow: the parent reprints without it.
  function fallback() {
    if (finished) return;
    finished = true;
    window.parent.postMessage('print_fallback', '*');
  }

  // Stylesheets, images and fonts loaded, plus one frame so everything is painted.
  function whenReady() {
    var loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise(function (resolve) {
      window.addEventListener('load', function () { resolve(); }, { once: true });
    });
    return loaded.then(function () {
      var pending = Array.prototype.filter.call(document.images, function (img) { return !img.complete; });
      return Promise.all(pending.map(function (img) {
        return new Promise(function (resolve) {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        });
      }));
    }).then(function () {
      void document.body.offsetHeight; // lay out now so the fonts the page uses start loading
      return document.fonts ? document.fonts.ready : null;
    }).then(function () {
      return new Promise(function (resolve) { requestAnimationFrame(function () { resolve(); }); });
    });
  }

  // Safety net. Once pagination has finished the output is complete, so print it even if an
  // asset is still hanging; before that, never print a partially paginated document.
  setTimeout(function () {
    if (!opts.paged || paginated) printNow(); else fallback();
  }, opts.timeoutMs);

  if (!opts.paged) {
    whenReady().then(printNow);
    return;
  }

  // The polyfill reads PagedConfig once, when it loads, so this must exist first. With
  // auto:false we start Paged.js ourselves and so know exactly when it has finished or failed.
  window.PagedConfig = { auto: false };

  var script = document.createElement('script');
  script.src = opts.polyfillUrl;
  script.crossOrigin = 'anonymous'; // same request mode as the preload in index.html, so it hits that cache
  script.onerror = fallback;
  script.onload = function () {
    function run() {
      var flow;
      try { flow = window.PagedPolyfill.preview(); } catch (e) { fallback(); return; }
      flow.then(function () {
        paginated = true;
        return whenReady().then(printNow);
      }, fallback);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
    else run();
  };
  document.head.appendChild(script);
})`;

// The app's stylesheets, so the iframe renders the document exactly like the preview.
function collectAppStyles() {
  return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((s) => {
      const html = s.outerHTML;
      // Skip obviously irrelevant or massive third-party styles that don't affect layout
      if (html.includes('google-analytics') || html.includes('hot-update') || html.includes('vite/client')) return '';
      if (s.tagName === 'LINK' && (html.includes('fontawesome') || html.includes('inter-font'))) return '';
      return html;
    })
    .join('\n');
}

// Brand colours are CSS variables set at runtime on <html>; carry them over.
function collectThemeVars() {
  const rootStyle = getComputedStyle(document.documentElement);
  return `
    :root {
      --brand-primary: ${rootStyle.getPropertyValue('--brand-primary') || '#4F46E5'};
      --brand-secondary: ${rootStyle.getPropertyValue('--brand-secondary') || '#1e293b'};
      --brand-accent: ${rootStyle.getPropertyValue('--brand-accent') || '#8b5cf6'};
    }
  `;
}

function buildPrintHtml({ title, appStyles, themeVars, content, paged, timeoutMs }) {
  const runtimeOpts = JSON.stringify({ paged, polyfillUrl: PAGED_POLYFILL_URL, timeoutMs });
  return `<!DOCTYPE html>
<html>
  <head>
    <title>${escapeHtml(title)}</title>
    <meta charset="UTF-8">
    ${appStyles}
    <style>
      /* NATIVE FONT LOADING (an @import is only valid as the first rule of a stylesheet) */
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap');

      ${themeVars}

      /* RESET & BASE */
      body {
        font-family: 'Noto Sans TC', sans-serif !important;
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .print-container {
        display: block !important;
        position: static !important;
        width: 100% !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      /* PAGED.JS ENGINE CONFIGURATION */
      @page {
        size: A4;
        margin: 15mm 15mm 15mm 15mm;

        @bottom-left {
          content: element(footerLeft);
          font-size: 8px;
          color: #64748b;
          font-family: sans-serif;
          text-transform: uppercase;
          border-top: 0.5pt solid #cbd5e1;
          padding-top: 1.5mm;
          white-space: nowrap;
        }

        @bottom-right {
          content: "Page " counter(page) " of " counter(pages);
          font-size: 8px;
          color: #0f172a;
          font-family: sans-serif;
          font-weight: bold;
          border-top: 0.5pt solid #cbd5e1;
          padding-top: 1.5mm;
          text-align: right;
        }
      }

      /* MAP DATA TO PAGED.JS ELEMENTS */
      .running-footer-left { position: running(footerLeft); }

      /* HIDE SOURCE ELEMENTS ONLY AFTER RUNNING */
      .pagedjs-footer-source {
        position: absolute;
        top: 0;
        left: 0;
        visibility: hidden;
        height: 0;
        width: 0;
        overflow: hidden;
      }

      .page-break { page-break-after: always !important; break-after: page !important; }
      .break-inside-avoid { break-inside: avoid !important; }
      .print-page { box-shadow: none !important; margin: 0 !important; }

      /* PREVENT TRAILING BLANK PAGES */
      @page:blank { display: none !important; }
    </style>
  </head>
  <body>
    <div class="print-container">
      ${content}
    </div>
    <script>${IFRAME_RUNTIME}(${runtimeOpts});</script>
  </body>
</html>`;
}

/**
 * Prints rendered document HTML through a hidden iframe (Paged.js first, native fallback).
 * Calls `onDone` once the print dialog has closed. Returns a cancel function that tears the
 * print down early (used when a newer print supersedes it).
 */
export function printHtmlDocument({ title, content, onDone, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const appStyles = collectAppStyles();
  const themeVars = collectThemeVars();
  let iframe = null;
  let ended = false;

  const mount = (paged) => {
    if (iframe) iframe.remove();
    document.getElementById('print-iframe')?.remove();
    iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    // A4-sized rather than 1px: Paged.js measures pages at this viewport, then Chrome prints its
    // sheets on a 210mm-wide page. Responsive (md:) classes must resolve the same both times, or
    // content reflows after measuring and is clipped at the sheet edge.
    iframe.style.cssText = 'position:fixed; left:-10000px; top:0; width:210mm; height:297mm; border:0; opacity:0; pointer-events:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(buildPrintHtml({ title, appStyles, themeVars, content, paged, timeoutMs }));
    doc.close();
  };

  const end = (removeAfterMs) => {
    if (ended) return;
    ended = true;
    window.removeEventListener('message', onMessage);
    const frame = iframe;
    // Keep the iframe a moment after print() returns: some browsers are still spooling it.
    setTimeout(() => frame?.remove(), removeAfterMs);
  };

  function onMessage(event) {
    if (!iframe || event.source !== iframe.contentWindow) return;
    if (event.data === 'print_fallback') {
      console.warn('[Print] Paged.js failed or timed out; printing without it.');
      mount(false);
    } else if (event.data === 'print_done') {
      end(1000);
      onDone?.();
    }
  }

  window.addEventListener('message', onMessage);
  try {
    mount(true);
  } catch (err) {
    end(0);
    throw err;
  }
  return () => end(0);
}
