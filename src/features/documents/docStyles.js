// Document design styles. A single value (branding.docStyle) drives the whole
// document look — typography (font) + header treatment — across every generated
// document. Header keys map to the variants in DocumentShared/DocumentHeader.
export const DOC_STYLES = {
  elegant: { label: '典雅', en: 'Elegant', font: "'Noto Serif TC', 'Songti TC', Georgia, 'Times New Roman', serif", header: 'modern' },
  classic: { label: '經典', en: 'Classic', font: "'Noto Sans TC', system-ui, sans-serif", header: 'classic' },
  minimal: { label: '簡約', en: 'Minimal', font: "'Noto Sans TC', system-ui, sans-serif", header: 'minimal' },
  modern:  { label: '現代', en: 'Modern',  font: "'Noto Sans TC', system-ui, sans-serif", header: 'bold' },
};

export const DOC_STYLE_ORDER = ['elegant', 'classic', 'minimal', 'modern'];

export const resolveDocStyleId = (appSettings) => {
  const id = appSettings?.branding?.docStyle;
  return DOC_STYLES[id] ? id : 'classic';
};

export const getDocStyle = (appSettings) => DOC_STYLES[resolveDocStyleId(appSettings)];
