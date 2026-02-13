import { describe, it, expect } from 'vitest';
import { isUnauthorizedError } from '@/lib/auth-utils';
import type {
  PermissionEntry,
  Permissions,
  AppRole,
  ToastOptions,
  PasswordLeakResult,
  BackendNotConfiguredError as BackendNotConfiguredErrorType,
} from '@/types/auth';
import { BackendNotConfiguredError } from '@/types/auth';

// ── isUnauthorizedError ─────────────────────────────────────────────

describe('isUnauthorizedError', () => {
  it('returns true for 401 Unauthorized error', () => {
    expect(isUnauthorizedError(new Error('401: Unauthorized'))).toBe(true);
  });

  it('returns true for 401 with extra text', () => {
    expect(isUnauthorizedError(new Error('401: Token Unauthorized'))).toBe(true);
  });

  it('returns false for 403 error', () => {
    expect(isUnauthorizedError(new Error('403: Forbidden'))).toBe(false);
  });

  it('returns false for generic error', () => {
    expect(isUnauthorizedError(new Error('Network error'))).toBe(false);
  });

  it('returns false for empty message', () => {
    expect(isUnauthorizedError(new Error(''))).toBe(false);
  });
});

// ── BackendNotConfiguredError ───────────────────────────────────────

describe('BackendNotConfiguredError', () => {
  it('has correct name', () => {
    const err = new BackendNotConfiguredError();
    expect(err.name).toBe('BackendNotConfiguredError');
  });

  it('has correct message', () => {
    const err = new BackendNotConfiguredError();
    expect(err.message).toBe('Backend nicht konfiguriert');
  });

  it('is an instance of Error', () => {
    const err = new BackendNotConfiguredError();
    expect(err).toBeInstanceOf(Error);
  });
});

// ── Auth type compile-time checks ───────────────────────────────────

describe('Auth type safety', () => {
  it('PermissionEntry enforces resource and action', () => {
    const entry: PermissionEntry = { resource: 'invoices', action: 'read' };
    expect(entry.resource).toBe('invoices');
    expect(entry.action).toBe('read');
  });

  it('AppRole union accepts valid roles', () => {
    const validRoles: AppRole[] = ['admin', 'property_manager', 'finance', 'viewer', 'tester', 'auditor', 'ops'];
    expect(validRoles).toHaveLength(7);
  });

  it('ToastOptions requires variant as union', () => {
    const opts: ToastOptions = { title: 'Test', description: 'desc', variant: 'destructive' };
    expect(opts.variant).toBe('destructive');
  });

  it('PasswordLeakResult has correct shape', () => {
    const result: PasswordLeakResult = { leaked: true, count: 500 };
    expect(result.leaked).toBe(true);
    expect(result.count).toBe(500);
  });

  it('Permissions interface has all required flags', () => {
    const perms: Permissions = {
      canViewFinances: true,
      canEditFinances: false,
      canViewFullTenantData: true,
      canManageMaintenance: false,
      canApproveInvoices: false,
      canSendMessages: true,
      canManageUsers: false,
      role: 'viewer',
      isAdmin: false,
      isPropertyManager: false,
      isFinance: false,
      isViewer: true,
      isTester: false,
      isLoading: false,
    };
    expect(perms.role).toBe('viewer');
    expect(Object.keys(perms)).toHaveLength(14);
  });
});
