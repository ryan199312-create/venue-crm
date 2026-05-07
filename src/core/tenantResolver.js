/**
 * Tenant Resolver
 * 
 * Extracts the tenant ID from the subdomain.
 * Examples:
 * - kinglungheen.localhost:5173 -> tenantId: kinglungheen
 * - vowsos.com -> tenantId: null (Root Domain)
 * - app.vowsos.com -> tenantId: null (Root Domain)
 */

export const getTenantId = () => {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  // 1. Localhost handling
  if (hostname.endsWith('.localhost') || hostname === 'localhost') {
    if (parts.length > 1 && parts[0] !== 'www' && parts[0] !== 'app') {
      return parts[0];
    }
    return null;
  }

  // 2. Vercel / Subdomain Handling
  // If we are on *.vercel.app or *.vowsos.com
  // Root domains like 'venue-crm-klh.vercel.app' have 3 parts.
  // Subdomains like 'kinglungheen.venue-crm-klh.vercel.app' have 4 parts.
  
  const isVercel = hostname.endsWith('.vercel.app');
  
  if (isVercel) {
    // For Vercel, root is usually [project].vercel.app (3 parts)
    if (parts.length > 3) {
      return parts[0];
    }
    return null;
  }

  // 3. Standard Production Domain (e.g., vowsos.com)
  if (parts.length > 2) {
    const subdomain = parts[0];
    if (subdomain !== 'www' && subdomain !== 'app') {
      return subdomain;
    }
  }

  return null;
};

export const isRootDomain = () => {
  return getTenantId() === null;
};
