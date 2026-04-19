/**
 * Validates an email address.
 * @param email 
 * @returns boolean
 */
export const isValidEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Checks if a string is empty or only whitespace.
 * @param str 
 * @returns boolean
 */
export const isEmpty = (str: string | null | undefined): boolean => {
  return !str || str.trim().length === 0;
};

/**
 * Validates a phone number (basic).
 * @param phone 
 * @returns boolean
 */
export const isValidPhone = (phone: string): boolean => {
  // Basic validation for 8+ digits
  const re = /^\d{8,}$/;
  return re.test(phone.replace(/\s/g, ''));
};

/**
 * Checks if a value is a valid number.
 * @param val 
 * @returns boolean
 */
export const isNumber = (val: any): boolean => {
  if (typeof val === 'number') return !isNaN(val);
  if (typeof val === 'string') {
    if (val.trim() === '') return false;
    return !isNaN(Number(val));
  }
  return false;
};
