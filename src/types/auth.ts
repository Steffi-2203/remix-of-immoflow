import type { User, Session, AuthError } from '@supabase/supabase-js';

// ── Auth hook return types ──────────────────────────────────────────

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export interface SignInResult {
  data: { user: User; session: Session } | null;
  error: AuthError | null;
}

export interface SignUpResult {
  data: { user: User | null; session: Session | null } | null;
  error: AuthError | null;
}

export interface SignOutResult {
  error: AuthError | null;
}

export interface AuthActions {
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
    companyName?: string,
    inviteToken?: string,
  ) => Promise<SignUpResult>;
  signOut: () => Promise<SignOutResult>;
}

export type UseAuthReturn = AuthState & AuthActions;

// ── Backend-not-configured sentinel ─────────────────────────────────

export class BackendNotConfiguredError extends Error {
  constructor() {
    super('Backend nicht konfiguriert');
    this.name = 'BackendNotConfiguredError';
  }
}

// ── Role & Permission types ─────────────────────────────────────────

export type AppRole =
  | 'admin'
  | 'property_manager'
  | 'finance'
  | 'viewer'
  | 'tester'
  | 'auditor'
  | 'ops';

export interface PermissionEntry {
  resource: string;
  action: string;
}

export interface PermissionOverrideEntry extends PermissionEntry {
  allowed: boolean;
}

export interface PermissionCheckResult {
  allowed: boolean;
}

export interface Permissions {
  canViewFinances: boolean;
  canEditFinances: boolean;
  canViewFullTenantData: boolean;
  canManageMaintenance: boolean;
  canApproveInvoices: boolean;
  canSendMessages: boolean;
  canManageUsers: boolean;
  role: string | null;
  isAdmin: boolean;
  isPropertyManager: boolean;
  isFinance: boolean;
  isViewer: boolean;
  isTester: boolean;
  isLoading: boolean;
}

// ── Toast helper type ───────────────────────────────────────────────

export interface ToastOptions {
  title: string;
  description: string;
  variant: 'default' | 'destructive';
}

export type ToastFn = (options: ToastOptions) => void;

// ── Password leak check ─────────────────────────────────────────────

export interface PasswordLeakResult {
  leaked: boolean;
  count: number;
}
