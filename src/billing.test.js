import { describe, test, expect } from 'vitest';
import { 
  generateBillingSummary, 
  calculateDepartmentSplit 
} from './billing.js';

describe('billing', () => {
  describe('generateBillingSummary', () => {
    const mockEventData = {
      menus: [
        { price: '1000', qty: '2', applySC: true }
      ],
      enableServiceCharge: true,
      discount: '0',
      paymentMethod: '現金'
    };

    test('should calculate basics correctly', () => {
      const summary = generateBillingSummary(mockEventData);
      expect(summary.subtotal).toBe(2000);
      expect(summary.serviceChargeVal).toBe(200);
      expect(summary.grandTotal).toBe(2200);
    });
  });

  describe('calculateDepartmentSplit', () => {
    const mockData = {
      menus: [
        { 
          price: '1000', 
          qty: '2', 
          allocation: { kitchen: '800', bar: '200' } 
        },
        {
          price: '500',
          qty: '1'
          // no allocation, should go to kitchen
        }
      ],
      drinksPrice: '100',
      drinksQty: '10',
      drinkAllocation: { bar: '100' },
      customItems: [
        { price: '50', qty: '2', category: 'other' }
      ]
    };

    test('should split departments correctly', () => {
      const split = calculateDepartmentSplit(mockData);
      // kitchen: 800*2 + 500*1 = 2100
      // bar: 200*2 + 100*10 = 1400
      // other: 50*2 = 100
      expect(split.kitchen).toBe(2100);
      expect(split.bar).toBe(1400);
      expect(split.other).toBe(100);
    });
  });
});
