import { describe, test, expect } from 'vitest';
import { 
  formatMoney, 
  parseMoney, 
  formatDateWithDay, 
  safeFloat 
} from './helpers.js';

describe('helpers', () => {
  describe('safeFloat', () => {
    test('should handle valid number strings', () => {
      expect(safeFloat('123.45')).toBe(123.45);
    });
    test('should handle strings with commas', () => {
      expect(safeFloat('1,234.56')).toBe(1234.56);
    });
  });

  describe('formatMoney', () => {
    test('should format numbers with commas', () => {
      expect(formatMoney(1234.56)).toBe('1,235');
    });
  });

  describe('parseMoney', () => {
    test('should remove commas', () => {
      expect(parseMoney('1,234.56')).toBe('1234.56');
    });
  });

  describe('formatDateWithDay', () => {
    test('should format date correctly', () => {
      const result = formatDateWithDay('2024-04-19');
      expect(result).toContain('2024-04-19');
      expect(result).toContain('(Fri)');
    });
  });
});
