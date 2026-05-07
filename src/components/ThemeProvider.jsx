import React, { useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * ThemeProvider
 * 
 * Injects tenant-specific branding (colors) as CSS variables into the DOM.
 * These variables are consumed by Tailwind CSS (brand-primary, etc.).
 */
export const ThemeProvider = ({ children }) => {
  const { appSettings } = useAuth();

  const brandStyles = useMemo(() => {
    const branding = appSettings?.branding || {};
    
    return {
      '--brand-primary': branding.primaryColor || '#4F46E5',
      '--brand-secondary': branding.secondaryColor || '#1e293b',
      '--brand-accent': branding.accentColor || '#8b5cf6',
    };
  }, [appSettings?.branding]);

  useEffect(() => {
    const branding = appSettings?.branding || {};
    
    // Update Document Title
    if (branding.portalTitle) {
      document.title = branding.portalTitle;
    } else {
      document.title = "VowsOS - Event Management";
    }

    // Update Favicon
    if (branding.faviconUrl) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = branding.faviconUrl;
    }
  }, [appSettings?.branding?.portalTitle, appSettings?.branding?.faviconUrl]);

  return (
    <div style={brandStyles} className="min-h-screen">
      {children}
    </div>
  );
};

export default ThemeProvider;
