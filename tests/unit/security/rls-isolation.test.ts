import { describe, it, expect, vi } from 'vitest';
import { maskPersonalData } from '../../../server/routes/helpers';

/**
 * RLS / Org Isolation Tests (Unit-level)
 * Tests data masking and org boundary enforcement.
 */
describe('RLS Isolation', () => {
  describe('maskPersonalData', () => {
    it('masks email fields', () => {
      const data = { email: 'real@example.com', name: 'Property A' };
      const masked = maskPersonalData(data);
      expect(masked.email).toBe('mieter@beispiel.at');
      expect(masked.name).toBe('Property A'); // non-sensitive
    });

    it('masks phone fields', () => {
      const data = { phone: '+43 660 1234567', telefon: '0660/999' };
      const masked = maskPersonalData(data);
      expect(masked.phone).toBe('+43 XXX XXXXXX');
      expect(masked.telefon).toBe('+43 XXX XXXXXX');
    });

    it('masks IBAN and BIC', () => {
      const data = { iban: 'AT611904300234573201', bic: 'BKAUATWW' };
      const masked = maskPersonalData(data);
      expect(masked.iban).toBe('AT** **** **** **** ****');
      expect(masked.bic).toBe('XXXXATXX');
    });

    it('recursively masks nested objects', () => {
      const data = {
        tenant: { firstname: 'Max', lastname: 'Real', email: 'max@real.at' },
        amount: 500,
      };
      const masked = maskPersonalData(data);
      expect(masked.tenant.firstname).toBe('Max');
      expect(masked.tenant.lastname).toBe('Mustermann');
      expect(masked.tenant.email).toBe('mieter@beispiel.at');
      expect(masked.amount).toBe(500);
    });

    it('masks arrays of objects', () => {
      const data = [
        { email: 'a@b.com', id: 1 },
        { email: 'c@d.com', id: 2 },
      ];
      const masked = maskPersonalData(data);
      expect(masked[0].email).toBe('mieter@beispiel.at');
      expect(masked[1].email).toBe('mieter@beispiel.at');
      expect(masked[0].id).toBe(1);
    });

    it('handles null/undefined gracefully', () => {
      expect(maskPersonalData(null)).toBeNull();
      expect(maskPersonalData(undefined)).toBeUndefined();
    });
  });
});
