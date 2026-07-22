// Document design styles. A single value (branding.docStyle) drives the WHOLE
// document look — typography (font), header treatment, and per-element design
// tokens (tables, section titles, info grids, signatures) — across every
// generated document. Header keys map to variants in DocumentShared/DocumentHeader.
//
// Token brand-fill flags (brandHead / brandGrand / brandBg) tell components to
// apply an inline backgroundColor: var(--brand-primary) — used by the Modern style.
export const DOC_STYLES = {
  elegant: {
    label: '典雅', en: 'Elegant',
    font: "'Noto Serif TC', 'Songti TC', Georgia, 'Times New Roman', serif",
    header: 'modern',
    t: {
      table: {
        wrap: 'mb-8 border-t border-b border-slate-300',
        thead: 'border-b border-[var(--brand-primary)]', brandHead: false,
        th: 'py-3 px-3 uppercase tracking-[0.25em] text-[var(--brand-primary)] font-semibold text-[10px]',
        cell: 'py-3.5 px-3',
        grandRow: 'border-t-2 border-double border-[var(--brand-primary)]', brandGrand: false,
        grandValue: 'text-[var(--brand-primary)]',
      },
      section: { title: 'text-[11px] font-semibold text-[var(--brand-primary)] uppercase tracking-[0.35em] border-b border-slate-200 pb-2 mb-4', brandBg: false },
      infoGrid: {
        wrap: 'grid grid-cols-2 gap-12 mb-8 border-y border-slate-200 py-6',
        heading: 'text-[10px] font-semibold text-[var(--brand-primary)] uppercase tracking-[0.3em] mb-3 pb-1.5 border-b border-slate-200',
      },
      signature: { line: 'border-b border-slate-500' },
    },
  },
  classic: {
    label: '經典', en: 'Classic',
    font: "'Noto Sans TC', system-ui, sans-serif",
    header: 'classic',
    t: {
      table: {
        wrap: 'mb-8 rounded-xl border border-slate-200 shadow-sm box-decoration-clone',
        thead: 'bg-slate-50 border-b border-slate-200', brandHead: false,
        th: 'py-2 px-4 uppercase tracking-wider text-slate-500 font-bold',
        cell: 'py-3 px-4',
        grandRow: 'bg-slate-50 border-t-2 border-slate-900', brandGrand: false,
        grandValue: 'text-[var(--brand-primary)]',
      },
      section: { title: 'text-[11px] font-black text-[var(--brand-primary)] uppercase tracking-widest border-b border-slate-200 pb-1.5 mb-3', brandBg: false },
      infoGrid: {
        wrap: 'grid grid-cols-2 gap-12 mb-8 bg-slate-50/50 p-6 rounded-2xl border border-slate-100',
        heading: 'text-[10px] font-black text-[var(--brand-primary)] uppercase tracking-widest mb-3 border-b border-slate-200 pb-1.5',
      },
      signature: { line: 'border-b-2 border-slate-800' },
    },
  },
  minimal: {
    label: '簡約', en: 'Minimal',
    font: "'Noto Sans TC', system-ui, sans-serif",
    header: 'minimal',
    t: {
      table: {
        wrap: 'mb-8',
        thead: 'border-b border-slate-300', brandHead: false,
        th: 'py-2 px-2 uppercase tracking-wider text-slate-400 font-semibold text-[10px]',
        cell: 'py-2.5 px-2',
        grandRow: 'border-t border-slate-400', brandGrand: false,
        grandValue: 'text-slate-900',
      },
      section: { title: 'text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] pb-1.5 mb-3 border-b border-slate-200', brandBg: false },
      infoGrid: {
        wrap: 'grid grid-cols-2 gap-12 mb-8 pb-6 border-b border-slate-200',
        heading: 'text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 pb-1.5 border-b border-slate-100',
      },
      signature: { line: 'border-b border-slate-800' },
    },
  },
  modern: {
    label: '現代', en: 'Modern',
    font: "'Noto Sans TC', system-ui, sans-serif",
    header: 'bold',
    t: {
      table: {
        wrap: 'mb-8 rounded-2xl shadow-md border border-slate-100 box-decoration-clone',
        thead: 'text-white', brandHead: true,
        th: 'py-3 px-4 uppercase tracking-wider font-bold text-[10px] text-white',
        cell: 'py-3 px-4',
        grandRow: 'text-white', brandGrand: true,
        grandValue: 'text-white',
      },
      section: { title: 'inline-block text-[11px] font-black text-white uppercase tracking-widest px-3 py-1 rounded-md mb-3', brandBg: true },
      infoGrid: {
        wrap: 'grid grid-cols-2 gap-8 mb-8 bg-slate-50 p-6 rounded-2xl',
        heading: 'text-[10px] font-black uppercase tracking-widest mb-3 text-[var(--brand-primary)]',
      },
      signature: { line: 'border-b-2 border-slate-900' },
    },
  },
};

export const DOC_STYLE_ORDER = ['elegant', 'classic', 'minimal', 'modern'];

export const resolveDocStyleId = (appSettings) => {
  const id = appSettings?.branding?.docStyle;
  return DOC_STYLES[id] ? id : 'classic';
};

export const getDocStyle = (appSettings) => DOC_STYLES[resolveDocStyleId(appSettings)];

// Convenience: the design-token bundle for the active style.
export const getDocTokens = (appSettings) => getDocStyle(appSettings).t;

// Inline brand background helper for token brand-fill flags.
export const brandBg = (on) => (on ? { backgroundColor: 'var(--brand-primary)' } : undefined);
