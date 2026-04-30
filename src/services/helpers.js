export const formatMoney = (val) => {
  if (!val && val !== 0) return '0';
  const clean = val.toString().replace(/,/g, '');
  const number = parseFloat(clean);
  if (isNaN(number)) return '0';
  return Math.round(number).toLocaleString('en-US');
};

export const parseMoney = (val) => {
  if (!val) return '';
  return val.toString().replace(/,/g, '');
};

export const formatDateWithDay = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const day = date.toLocaleDateString('en-US', { weekday: 'short' });
  return `${dateStr} (${day})`;
};

export const safeFloat = (val) => {
  if (!val) return 0;
  const clean = val.toString().replace(/,/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Resolves scoped settings for a specific venue, merging global defaults with venue overrides.
 */
export const getScopedSettings = (settings, venueId) => {
  if (!settings) return {};
  
  const base = {
    outlets: settings.outlets || [],
    minSpendRules: settings.minSpendRules || [],
    defaultMenus: settings.defaultMenus || [],
    paymentRules: settings.paymentRules || [],
    rolePermissions: settings.rolePermissions || {},
    defaultFloorplan: settings.defaultFloorplan || { bgImage: '', itemScale: 40 },
    zonesConfig: settings.zonesConfig || [
      { id: 'red', nameZh: '紅區', nameEn: 'Red Zone', color: 'rgba(248, 113, 113, 0.3)' },
      { id: 'yellow', nameZh: '黃區', nameEn: 'Yellow Zone', color: 'rgba(250, 204, 21, 0.3)' },
      { id: 'green', nameZh: '綠區', nameEn: 'Green Zone', color: 'rgba(52, 211, 153, 0.3)' },
      { id: 'blue', nameZh: '藍區', nameEn: 'Blue Zone', color: 'rgba(96, 165, 250, 0.3)' },
    ],
    venueProfiles: settings.venueProfiles || {},
    ...settings
  };

  if (!venueId || venueId === 'all') return base;

  // If specific venue selected, merge venue-specific overrides
  const venueData = settings.venues?.[venueId] || {};
  return {
    ...base,
    ...venueData,
    venueProfile: settings.venueProfiles?.[venueId] || {}
  };
};