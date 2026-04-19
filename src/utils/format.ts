/**
 * Formats a number or string as a currency-style string with thousands separators.
 * @param val The value to format
 * @returns A formatted string
 */
export const formatMoney = (val: string | number | null | undefined): string => {
  if (val === undefined || val === null || (val === '' && val !== 0)) return '0';
  const clean = val.toString().replace(/,/g, '');
  const number = parseFloat(clean);
  if (isNaN(number)) return '0';
  return Math.round(number).toLocaleString('en-US');
};

/**
 * Parses a currency-style string back to a numeric string (removes commas).
 * @param val The string to parse
 * @returns A numeric string
 */
export const parseMoney = (val: string | number | null | undefined): string => {
  if (!val) return '';
  return val.toString().replace(/,/g, '');
};

/**
 * Safely converts a value to a float, handling commas and invalid inputs.
 * @param val The value to convert
 * @returns A float number
 */
export const safeFloat = (val: any): number => {
  if (!val) return 0;
  const clean = val.toString().replace(/,/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Formats a decimal to a percentage string.
 * @param val The value to format
 * @returns A percentage string
 */
export const formatPercent = (val: number): string => {
  return `${(val * 100).toFixed(0)}%`;
};
