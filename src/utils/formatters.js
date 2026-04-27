export const formatMoney = (val) => {
  if (!val && val !== 0) return '0';
  return Math.round(parseFloat(val)).toLocaleString('en-US');
};

export const parseMoney = (val) => {
  if (!val && val !== 0) return 0;
  if (typeof val === 'number') return val;
  const parsed = parseFloat(val.toString().replace(/,/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

export const safeFloat = (val) => {
  const parsed = parseMoney(val);
  return isNaN(parsed) ? 0 : parsed;
};