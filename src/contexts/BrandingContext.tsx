import { createContext, useContext, useMemo } from 'react';
import { useOrganization } from '@/hooks/useOrganization';

interface BrandingConfig {
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  supportEmail: string;
  isLoading: boolean;
}

const DEFAULT_BRANDING: BrandingConfig = {
  brandName: 'ImmoflowMe',
  logoUrl: null,
  primaryColor: '#1e40af',
  supportEmail: 'kontakt@immoflowme.at',
  isLoading: false,
};

const BrandingContext = createContext<BrandingConfig>(DEFAULT_BRANDING);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { data: organization, isLoading } = useOrganization();

  const branding = useMemo<BrandingConfig>(() => {
    if (isLoading) {
      return { ...DEFAULT_BRANDING, isLoading: true };
    }

    return {
      brandName: organization?.brandName || DEFAULT_BRANDING.brandName,
      logoUrl: organization?.logoUrl || DEFAULT_BRANDING.logoUrl,
      primaryColor: organization?.primaryColor || DEFAULT_BRANDING.primaryColor,
      supportEmail: organization?.supportEmail || DEFAULT_BRANDING.supportEmail,
      isLoading: false,
    };
  }, [organization, isLoading]);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}

export { DEFAULT_BRANDING };
