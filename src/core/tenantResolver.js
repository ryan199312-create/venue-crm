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

  // Localhost handling (e.g., kinglungheen.localhost)
  if (hostname.endsWith('.localhost') || hostname === 'localhost') {
    if (parts.length > 1 && parts[0] !== 'www' && parts[0] !== 'app') {
      return parts[0];
    }
    return null;
  }

  // Production domain handling (e.g., kinglungheen.vowsos.com)
  // Assuming the main domain has 2 parts (vowsos.com)
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
