import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// UI language for the admin console. The app's strings are authored as
// "中文 (English)"; splitBilingual() returns just the side for the active
// language, so converting a screen is only wrapping its strings in L().
const STORAGE_KEY = 'vowsos_ui_lang';

/**
 * Given a bilingual label, return only the part for `lang` ('zh' | 'en').
 * Handles both orders: "中文 (English)" and "English (中文)". A trailing
 * "(...)" is only treated as a translation when the two sides are in
 * different scripts — so "服務費 (10%)" or "第一期 (訂金)" are left intact.
 */
export function splitBilingual(str, lang) {
  if (typeof str !== 'string' || !str) return str;
  const m = str.match(/^([\s\S]*?)\s*\(([^()]+)\)\s*$/);
  if (!m) return str;
  const base = m[1].trim();
  const paren = m[2].trim();
  // A parenthetical containing a digit is a measurement/percentage/quantity
  // ("(10%)", "(1.2m)", "(6ft)"), never a translation — leave the whole string.
  if (/\d/.test(paren)) return str;
  const han = /[一-鿿]/;
  const latin = /[A-Za-z]/;
  // "中文 (English)"
  if (han.test(base) && latin.test(paren) && !han.test(paren)) {
    return lang === 'en' ? paren : base;
  }
  // "English (中文)"
  if (latin.test(base) && han.test(paren) && !latin.test(paren)) {
    return lang === 'en' ? base : paren;
  }
  return str;
}

const LanguageContext = createContext({ lang: 'zh', setLang: () => {}, L: (s) => s });

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'zh'; } catch { return 'zh'; }
  });

  const setLang = useCallback((next) => {
    setLangState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { document.documentElement.lang = lang === 'en' ? 'en' : 'zh-HK'; } catch { /* ignore */ }
  }, [lang]);

  const L = useCallback((s) => splitBilingual(s, lang), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, L }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => useContext(LanguageContext);
