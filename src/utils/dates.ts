/**
 * Formats a date string to include the shorthand day of the week.
 * @param dateStr ISO date string (YYYY-MM-DD)
 * @returns Formatted string (e.g., "2023-10-27 (Fri)")
 */
export const formatDateWithDay = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = date.toLocaleDateString('en-US', { weekday: 'short' });
  return `${dateStr} (${day})`;
};

/**
 * Checks if a date is in the past.
 * @param date Input date
 * @returns boolean
 */
export const isPast = (date: Date | string): boolean => {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
};

/**
 * Calculates the number of days between two dates.
 * @param date1 First date
 * @param date2 Second date
 * @returns Number of days
 */
export const daysBetween = (date1: Date | string, date2: Date | string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Returns a human-readable relative time string.
 * @param date Date to compare
 * @returns string
 */
export const getRelativeTime = (date: Date | string): string => {
  const d = new Date(date);
  const now = new Date();
  const diffDays = daysBetween(now, d);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0) return `In ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
};
