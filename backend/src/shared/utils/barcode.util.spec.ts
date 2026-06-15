import { eanCheckDigit, randomEan13 } from './barcode.util';

describe('barcode.util', () => {
  describe('eanCheckDigit', () => {
    it('computes the standard EAN-13 check digit', () => {
      // Known EAN-13 values (first 12 digits → expected check digit).
      expect(eanCheckDigit('400638133393')).toBe('1');
      expect(eanCheckDigit('590123412345')).toBe('7');
    });
  });

  describe('randomEan13', () => {
    it('produces 13 numeric digits with a valid check digit', () => {
      for (let i = 0; i < 100; i++) {
        const code = randomEan13();
        expect(code).toMatch(/^\d{13}$/);
        expect(code[12]).toBe(eanCheckDigit(code.slice(0, 12)));
      }
    });
  });
});
