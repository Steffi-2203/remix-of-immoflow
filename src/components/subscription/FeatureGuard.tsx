import { ReactNode } from 'react';
import { useSubscriptionLimits, type UserSubscriptionTier } from '@/hooks/useSubscriptionLimits';
import { useIsAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Crown, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export type FeatureKey = 
  | 'canExport'
  | 'canUpload'
  | 'canViewSettlements'
  | 'canEditSettlements'
  | 'canUseAutomation'
  | 'canSendMessages'
  | 'canViewReports'
  | 'canManageOwners'
  | 'canManageMeters'
  | 'canManageKeys'
  | 'canManageVpi'
  | 'canManageBanking'
  | 'canManageBudgets'
  | 'canManageDunning'
  | 'canManageMaintenance'
  | 'canManageContractors'
  | 'canManageInvoiceApproval'
  | 'canManageTeam'
  | 'canManageDocuments'
  | 'hasFullAccess';

const FEATURE_LABELS: Record<FeatureKey, string> = {
  canExport: 'Export',
  canUpload: 'Upload',
  canViewSettlements: 'Abrechnungen ansehen',
  canEditSettlements: 'Abrechnungen bearbeiten',
  canUseAutomation: 'Automatisierung',
  canSendMessages: 'Nachrichten senden',
  canViewReports: 'Berichte ansehen',
  canManageOwners: 'Eigentümerverwaltung',
  canManageMeters: 'Zählerstanderfassung',
  canManageKeys: 'Schlüsselverwaltung',
  canManageVpi: 'VPI-Indexanpassungen',
  canManageBanking: 'Banking',
  canManageBudgets: 'Budgets',
  canManageDunning: 'Mahnwesen',
  canManageMaintenance: 'Wartungsverwaltung',
  canManageContractors: 'Handwerkerverwaltung',
  canManageInvoiceApproval: 'Rechnungsfreigabe',
  canManageTeam: 'Teamverwaltung',
  canManageDocuments: 'Dokumentenverwaltung',
  hasFullAccess: 'Vollzugriff',
};

const TIER_REQUIRED: Partial<Record<FeatureKey, UserSubscriptionTier>> = {
  canUseAutomation: 'pro',
  hasFullAccess: 'pro',
  canEditSettlements: 'starter',
  canManageOwners: 'starter',
  canManageMeters: 'starter',
  canManageKeys: 'starter',
  canManageVpi: 'starter',
  canManageBanking: 'starter',
  canManageBudgets: 'starter',
  canManageDunning: 'starter',
  canManageMaintenance: 'starter',
  canManageContractors: 'starter',
  canManageInvoiceApproval: 'starter',
  canManageTeam: 'starter',
  canManageDocuments: 'starter',
};

interface UpgradePromptProps {
  feature: FeatureKey;
  tier: UserSubscriptionTier;
  mode?: 'inline' | 'card' | 'minimal';
}

export function UpgradePrompt({ feature, tier, mode = 'inline' }: UpgradePromptProps) {
  const navigate = useNavigate();
  const featureLabel = FEATURE_LABELS[feature];
  const requiredTier = TIER_REQUIRED[feature] || 'starter';
  
  const tierLabel = requiredTier === 'pro' ? 'Pro' : 'Starter';
  const tierPrice = requiredTier === 'pro' ? '299' : '149';

  if (mode === 'minimal') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/pricing')}
        className="gap-1"
        data-testid="button-upgrade-minimal"
      >
        <Lock className="h-3 w-3" />
        Upgrade
      </Button>
    );
  }

  if (mode === 'card') {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown className="h-5 w-5 text-amber-600" />
            {featureLabel} - Upgrade erforderlich
          </CardTitle>
          <CardDescription>
            Diese Funktion ist ab dem {tierLabel}-Plan (€{tierPrice}/Monat) verfügbar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => navigate('/pricing')}
            className="gap-2"
            data-testid="button-upgrade-card"
          >
            <Sparkles className="h-4 w-4" />
            Jetzt upgraden
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
      <Lock className="h-5 w-5 text-amber-600 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
          {featureLabel} ist im {tierLabel}-Plan verfügbar
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Ab €{tierPrice}/Monat
        </p>
      </div>
      <Button
        size="sm"
        onClick={() => navigate('/pricing')}
        data-testid="button-upgrade-inline"
      >
        Upgrade
      </Button>
    </div>
  );
}

interface FeatureGuardProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
  mode?: 'inline' | 'card' | 'minimal' | 'hide';
}

export function FeatureGuard({ 
  feature, 
  children, 
  fallback,
  mode = 'inline' 
}: FeatureGuardProps) {
  const { limits, effectiveTier, isLoading } = useSubscriptionLimits();
  const { data: isAdmin } = useIsAdmin();

  if (isLoading) {
    return null;
  }

  if (isAdmin) {
    return <>{children}</>;
  }

  const hasAccess = limits[feature as keyof typeof limits];
  const canAccess = typeof hasAccess === 'boolean' ? hasAccess : (hasAccess as number) > 0;

  if (canAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (mode === 'hide') {
    return null;
  }

  return <UpgradePrompt feature={feature} tier={effectiveTier} mode={mode} />;
}

interface LimitGuardProps {
  type: 'property' | 'unit' | 'tenant' | 'ocrInvoice' | 'ocrBankStatement';
  currentCount: number;
  children: ReactNode;
  fallback?: ReactNode;
}

export function LimitGuard({ type, currentCount, children, fallback }: LimitGuardProps) {
  const { 
    canCreateProperty, 
    canCreateUnit, 
    canCreateTenant,
    canUploadOcrInvoice,
    canUploadOcrBankStatement,
    effectiveTier,
    isLoading 
  } = useSubscriptionLimits();
  const { data: isAdmin } = useIsAdmin();

  if (isLoading) {
    return null;
  }

  if (isAdmin) {
    return <>{children}</>;
  }

  const checkFunctions = {
    property: canCreateProperty,
    unit: canCreateUnit,
    tenant: canCreateTenant,
    ocrInvoice: canUploadOcrInvoice,
    ocrBankStatement: canUploadOcrBankStatement,
  };

  const canCreate = checkFunctions[type](currentCount);

  if (canCreate) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const limitLabels = {
    property: 'Liegenschaften',
    unit: 'Einheiten',
    tenant: 'Mieter',
    ocrInvoice: 'OCR-Rechnungen',
    ocrBankStatement: 'OCR-Kontoauszüge',
  };

  return (
    <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
      <Lock className="h-5 w-5 text-amber-600 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
          Limit für {limitLabels[type]} erreicht
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Upgrade für mehr Kapazität
        </p>
      </div>
    </div>
  );
}

export function useFeatureAccess(feature: FeatureKey): boolean {
  const { limits, isLoading } = useSubscriptionLimits();
  const { data: isAdmin } = useIsAdmin();

  if (isLoading) {
    return false;
  }

  if (isAdmin) {
    return true;
  }

  const hasAccess = limits[feature as keyof typeof limits];
  return typeof hasAccess === 'boolean' ? hasAccess : (hasAccess as number) > 0;
}
