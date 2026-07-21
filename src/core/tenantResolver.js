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
    return null; // bare localhost = NO default tenant. Use <tenant>.localhost for a tenant.
  }

  // 2. Production / Vercel Handling
  const isVercel = hostname.endsWith('.vercel.app');
  
  if (isVercel) {
    if (parts.length > 3) {
      return parts[0];
    }
    return 'my-venue-crm'; // Default for the main Vercel URL
  }

  // 3. Standard Production Domain
  if (parts.length > 2) {
    const subdomain = parts[0];
    if (subdomain !== 'www' && subdomain !== 'app') {
      return subdomain;
    }
  }

  return 'my-venue-crm'; // Absolute fallback
};

export const isRootDomain = () => {
  // In hybrid mode, we don't treat the root as a "Super Admin only" zone
  // unless specifically navigating to /super-admin.
  const hostname = window.location.hostname;
  if (hostname === 'localhost') return true; // bare localhost = root/marketing (no default tenant)
  const rawParts = hostname.split('.');
  // Treat the "www" host as the root/marketing domain too (e.g. www.vowsos.com),
  // since Vercel may redirect the apex vowsos.com -> www.vowsos.com.
  const parts = rawParts[0] === 'www' ? rawParts.slice(1) : rawParts;

  if (hostname.endsWith('.localhost')) return parts.length === 1;
  if (hostname.endsWith('.vercel.app')) return parts.length === 3;
  return parts.length === 2;
};
