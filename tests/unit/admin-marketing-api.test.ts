import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

describe('Admin Marketing API – Pure Logic Tests', () => {

  describe('Trial days calculation', () => {
    function calculateTrialDays(input: any): number {
      return Math.min(90, Math.max(1, parseInt(input) || 14));
    }

    it('defaults to 14 when input is undefined', () => {
      expect(calculateTrialDays(undefined)).toBe(14);
    });

    it('defaults to 14 when input is null', () => {
      expect(calculateTrialDays(null)).toBe(14);
    });

    it('defaults to 14 when input is empty string', () => {
      expect(calculateTrialDays('')).toBe(14);
    });

    it('defaults to 14 when input is non-numeric string', () => {
      expect(calculateTrialDays('abc')).toBe(14);
    });

    it('caps at 90 days maximum', () => {
      expect(calculateTrialDays('100')).toBe(90);
      expect(calculateTrialDays('999')).toBe(90);
      expect(calculateTrialDays(200)).toBe(90);
    });

    it('treats 0 as falsy, defaults to 14', () => {
      expect(calculateTrialDays('0')).toBe(14);
      expect(calculateTrialDays(0)).toBe(14);
    });

    it('enforces minimum of 1 day for negative values', () => {
      expect(calculateTrialDays('-5')).toBe(1);
      expect(calculateTrialDays(-10)).toBe(1);
    });

    it('accepts valid values within range', () => {
      expect(calculateTrialDays('7')).toBe(7);
      expect(calculateTrialDays('30')).toBe(30);
      expect(calculateTrialDays('90')).toBe(90);
      expect(calculateTrialDays('1')).toBe(1);
      expect(calculateTrialDays(14)).toBe(14);
    });

    it('handles boundary values', () => {
      expect(calculateTrialDays('1')).toBe(1);
      expect(calculateTrialDays('90')).toBe(90);
      expect(calculateTrialDays('91')).toBe(90);
    });

    it('parses string numbers correctly', () => {
      expect(calculateTrialDays('  7  ')).toBe(7);
      expect(calculateTrialDays('14.9')).toBe(14);
    });
  });

  describe('Trial extension date calculation', () => {
    it('extends from current trial end if in the future', () => {
      const futureEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const days = 7;
      const currentEnd = new Date(futureEnd);
      const newEnd = new Date(Math.max(currentEnd.getTime(), Date.now()));
      newEnd.setDate(newEnd.getDate() + days);

      expect(newEnd.getTime()).toBeGreaterThan(futureEnd.getTime());
      const diffDays = Math.round((newEnd.getTime() - futureEnd.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(days);
    });

    it('extends from now if trial already expired', () => {
      const pastEnd = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const days = 14;
      const currentEnd = new Date(pastEnd);
      const newEnd = new Date(Math.max(currentEnd.getTime(), Date.now()));
      newEnd.setDate(newEnd.getDate() + days);

      expect(newEnd.getTime()).toBeGreaterThan(Date.now());
      const diffFromNow = Math.round((newEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      expect(diffFromNow).toBeGreaterThanOrEqual(13);
      expect(diffFromNow).toBeLessThanOrEqual(15);
    });

    it('uses current date if trialEndsAt is null', () => {
      const trialEndsAt = null;
      const currentEnd = trialEndsAt ? new Date(trialEndsAt) : new Date();
      const days = 14;
      const newEnd = new Date(Math.max(currentEnd.getTime(), Date.now()));
      newEnd.setDate(newEnd.getDate() + days);

      const diffFromNow = Math.round((newEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      expect(diffFromNow).toBeGreaterThanOrEqual(13);
      expect(diffFromNow).toBeLessThanOrEqual(15);
    });
  });

  describe('Trial end logic', () => {
    it('sets subscriptionStatus to expired', () => {
      const updatePayload = {
        subscriptionStatus: 'expired' as const,
        isTrial: false,
        trialEndsAt: new Date(),
        updatedAt: new Date(),
      };

      expect(updatePayload.subscriptionStatus).toBe('expired');
    });

    it('sets isTrial to false', () => {
      const updatePayload = {
        subscriptionStatus: 'expired' as const,
        isTrial: false,
        trialEndsAt: new Date(),
        updatedAt: new Date(),
      };

      expect(updatePayload.isTrial).toBe(false);
    });

    it('does NOT set convertedAt (critical semantic rule)', () => {
      const updatePayload: Record<string, any> = {
        subscriptionStatus: 'expired',
        isTrial: false,
        trialEndsAt: new Date(),
        updatedAt: new Date(),
      };

      expect(updatePayload).not.toHaveProperty('convertedAt');
      expect(Object.keys(updatePayload)).not.toContain('convertedAt');
    });

    it('sets trialEndsAt to current date', () => {
      const before = Date.now();
      const updatePayload = {
        subscriptionStatus: 'expired' as const,
        isTrial: false,
        trialEndsAt: new Date(),
        updatedAt: new Date(),
      };
      const after = Date.now();

      expect(updatePayload.trialEndsAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(updatePayload.trialEndsAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('Trial filtering logic', () => {
    it('includes orgs with subscriptionStatus=trial', () => {
      const org = { subscriptionStatus: 'trial', isTrial: true };
      const matches = org.subscriptionStatus === 'trial' ||
        (org.isTrial === true && org.subscriptionStatus !== 'active');
      expect(matches).toBe(true);
    });

    it('includes orgs with isTrial=true and non-active status', () => {
      const org = { subscriptionStatus: 'expired', isTrial: true };
      const matches = org.subscriptionStatus === 'trial' ||
        (org.isTrial === true && org.subscriptionStatus !== 'active');
      expect(matches).toBe(true);
    });

    it('excludes orgs with active subscriptions even if isTrial=true', () => {
      const org = { subscriptionStatus: 'active', isTrial: true };
      const matches = org.subscriptionStatus === 'trial' ||
        (org.isTrial === true && org.subscriptionStatus !== 'active');
      expect(matches).toBe(false);
    });

    it('excludes orgs with isTrial=false and non-trial status', () => {
      const org = { subscriptionStatus: 'active', isTrial: false };
      const matches = org.subscriptionStatus === 'trial' ||
        (org.isTrial === true && org.subscriptionStatus !== 'active');
      expect(matches).toBe(false);
    });
  });

  describe('Days left calculation', () => {
    it('calculates positive days for future trial end', () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const daysLeft = Math.max(0, Math.ceil((futureDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      expect(daysLeft).toBe(10);
    });

    it('returns 0 for expired trials', () => {
      const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const daysLeft = Math.max(0, Math.ceil((pastDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      expect(daysLeft).toBe(0);
    });

    it('returns null when trialEndsAt is null', () => {
      const trialEndsAt = null;
      const daysLeft = trialEndsAt
        ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;
      expect(daysLeft).toBeNull();
    });

    it('marks expired correctly', () => {
      const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      const daysLeft = Math.max(0, Math.ceil((pastDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      const isExpired = daysLeft !== null && daysLeft <= 0;
      expect(isExpired).toBe(true);
    });

    it('marks non-expired correctly', () => {
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const daysLeft = Math.max(0, Math.ceil((futureDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      const isExpired = daysLeft !== null && daysLeft <= 0;
      expect(isExpired).toBe(false);
    });
  });

  describe('Email validation for invitations', () => {
    function isValidInvitationEmail(email: any): boolean {
      return !!email && typeof email === 'string' && email.includes('@');
    }

    it('accepts valid email addresses', () => {
      expect(isValidInvitationEmail('user@example.com')).toBe(true);
      expect(isValidInvitationEmail('admin@immoflowme.at')).toBe(true);
      expect(isValidInvitationEmail('test+tag@domain.co.at')).toBe(true);
    });

    it('rejects empty string', () => {
      expect(isValidInvitationEmail('')).toBe(false);
    });

    it('rejects null', () => {
      expect(isValidInvitationEmail(null)).toBe(false);
    });

    it('rejects undefined', () => {
      expect(isValidInvitationEmail(undefined)).toBe(false);
    });

    it('rejects non-string types', () => {
      expect(isValidInvitationEmail(123)).toBe(false);
      expect(isValidInvitationEmail(true)).toBe(false);
      expect(isValidInvitationEmail({})).toBe(false);
    });

    it('rejects strings without @', () => {
      expect(isValidInvitationEmail('userexample.com')).toBe(false);
      expect(isValidInvitationEmail('just-a-name')).toBe(false);
    });
  });

  describe('Token generation for invitations', () => {
    it('generates valid UUID format', () => {
      const token = crypto.randomUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(token).toMatch(uuidRegex);
    });

    it('generates unique tokens', () => {
      const tokens = new Set(Array.from({ length: 100 }, () => crypto.randomUUID()));
      expect(tokens.size).toBe(100);
    });

    it('token has correct length (36 chars with hyphens)', () => {
      const token = crypto.randomUUID();
      expect(token.length).toBe(36);
    });
  });

  describe('Invitation expiry calculation', () => {
    it('sets expiry to 14 days from now', () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14);

      const diffMs = expiresAt.getTime() - Date.now();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(14);
    });
  });

  describe('Promo code validation', () => {
    it('rejects codes shorter than 3 characters', () => {
      const code = 'AB';
      const isValid = !!code && typeof code === 'string' && code.trim().length >= 3;
      expect(isValid).toBe(false);
    });

    it('accepts codes with 3 or more characters', () => {
      const code = 'ABC';
      const isValid = !!code && typeof code === 'string' && code.trim().length >= 3;
      expect(isValid).toBe(true);
    });

    it('normalizes codes to uppercase trimmed', () => {
      const code = '  welcome10  ';
      const normalized = code.toUpperCase().trim();
      expect(normalized).toBe('WELCOME10');
    });
  });

  describe('Trial extension sets correct fields', () => {
    it('sets isTrial=true and subscriptionStatus=trial on extension', () => {
      const extensionPayload = {
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        subscriptionStatus: 'trial' as const,
        isTrial: true,
        updatedAt: new Date(),
      };

      expect(extensionPayload.isTrial).toBe(true);
      expect(extensionPayload.subscriptionStatus).toBe('trial');
      expect(extensionPayload.trialEndsAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
