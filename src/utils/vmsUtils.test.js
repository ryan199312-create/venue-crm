import { describe, test, expect } from 'vitest';
import { 
  safeFloat, 
  formatMoney, 
  parseMoney, 
  formatDateWithDay,
  generateBillingSummary,
  getOverdueStatus
} from './vmsUtils.js';

describe('vmsUtils', () => {
  describe('safeFloat', () => {
    test('should handle valid number strings', () => {
      expect(safeFloat('123.45')).toBe(123.45);
    });

    test('should handle strings with commas', () => {
      expect(safeFloat('1,234.56')).toBe(1234.56);
    });

    test('should handle empty or null values', () => {
      expect(safeFloat('')).toBe(0);
      expect(safeFloat(null)).toBe(0);
      expect(safeFloat(undefined)).toBe(0);
    });

    test('should handle invalid numbers', () => {
      expect(safeFloat('abc')).toBe(0);
    });
  });

  describe('formatMoney', () => {
    test('should format numbers with commas', () => {
      expect(formatMoney(1234.56)).toBe('1,235'); // Math.round(1234.56) = 1235
    });

    test('should handle strings with commas', () => {
      expect(formatMoney('1,234.56')).toBe('1,235');
    });

    test('should handle zero', () => {
      expect(formatMoney(0)).toBe('0');
    });

    test('should handle null/undefined', () => {
      expect(formatMoney(null)).toBe('0');
      expect(formatMoney(undefined)).toBe('0');
    });
  });

  describe('parseMoney', () => {
    test('should remove commas', () => {
      expect(parseMoney('1,234.56')).toBe('1234.56');
    });

    test('should return empty string for null/undefined', () => {
      expect(parseMoney(null)).toBe('');
      expect(parseMoney(undefined)).toBe('');
    });
  });

  describe('formatDateWithDay', () => {
    test('should format date correctly', () => {
      const result = formatDateWithDay('2024-04-19');
      expect(result).toContain('2024-04-19');
      expect(result).toContain('(Fri)');
    });

    test('should handle empty input', () => {
      expect(formatDateWithDay('')).toBe('-');
      expect(formatDateWithDay(null)).toBe('-');
    });
  });

  describe('generateBillingSummary', () => {
    const mockEventData = {
      menus: [
        { price: '1000', qty: '2', applySC: true },
        { price: '500', qty: '1', applySC: false }
      ],
      servingStyle: '位上',
      platingFee: '10',
      tableCount: '20',
      platingFeeApplySC: true,
      drinksPrice: '100',
      drinksQty: '20',
      drinksPackage: 'Standard',
      drinksApplySC: true,
      setupPackagePrice: '500',
      setupApplySC: true,
      avPackagePrice: '300',
      avApplySC: true,
      decorPackagePrice: '200',
      decorApplySC: true,
      customItems: [
        { price: '100', qty: '1', applySC: true }
      ],
      enableServiceCharge: true,
      discount: '100',
      paymentMethod: '信用卡',
      deposit1: '1000',
      deposit1Received: true
    };

    test('should calculate subtotal correctly', () => {
      const summary = generateBillingSummary(mockEventData);
      expect(summary.subtotal).toBe(5800);
    });

    test('should calculate service charge correctly', () => {
      const summary = generateBillingSummary(mockEventData);
      expect(summary.serviceChargeVal).toBe(530);
    });

    test('should calculate grand total correctly', () => {
      const summary = generateBillingSummary(mockEventData);
      expect(summary.grandTotal).toBe(6417);
    });
  });

  describe('getOverdueStatus', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    test('should return Paid if balanceDue <= 0', () => {
      const data = { date: futureDateStr, deposit1: '100', deposit1Received: true, menus: [{price: '100', qty: '1'}], enableServiceCharge: false };
      const status = getOverdueStatus(data);
      expect(status.label).toBe('Paid');
    });

    test('should return Pending if far in future', () => {
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 30);
      const data = { date: farFuture.toISOString().split('T')[0], menus: [{price: '100', qty: '1'}], enableServiceCharge: false };
      const status = getOverdueStatus(data);
      expect(status.label).toBe('Pending');
    });
  });
});
