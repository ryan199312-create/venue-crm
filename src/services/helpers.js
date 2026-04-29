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