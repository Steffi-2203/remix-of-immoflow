import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Building, 
  LayoutDashboard, 
  FileStack, 
  TrendingUp, 
  Cog, 
  Wallet, 
  Layers, 
  Calculator, 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Receipt,
  Users,
  User,
  X,
  Shield,
  FileText,
  Wrench,
  CheckSquare,
  MessageSquare,
  HardHat,
  AlertTriangle,
  PiggyBank,
  Lock,
  Gauge,
  Key,
  ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSidebarContext } from '@/contexts/SidebarContext';
import { useIsAdmin } from '@/hooks/useAdmin';
import { usePermissions } from '@/hooks/usePermissions';
import { useSubscription, SubscriptionTier } from '@/hooks/useSubscription';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { useBranding } from '@/contexts/BrandingContext';
import immoflowLogo from '@/assets/immoflowme-logo.png';

// NavItem interface moved below imports

type FeatureKey = 
  | 'canManageOwners' | 'canManageMeters' | 'canManageKeys' | 'canManageVpi'
  | 'canManageBanking' | 'canManageBudgets' | 'canManageDunning' 
  | 'canManageMaintenance' | 'canManageContractors' | 'canManageInvoiceApproval'
  | 'canManageTeam' | 'canManageDocuments' | 'canSendMessages' | 'canViewReports';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
  tourId?: string;
  requiredTier?: SubscriptionTier;
  requiredFeature?: FeatureKey;
  alwaysAllowed?: boolean; // For Dashboard, Units, Tenants, Invoices, Payments, Settlements, Reports, Messages
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    tourId: 'nav-dashboard',
    alwaysAllowed: true // Dashboard für alle sichtbar
  },
  {
    label: 'Liegenschaften',
    icon: Building,
    href: '/liegenschaften',
    tourId: 'nav-properties',
    requiredFeature: 'canManageOwners' // Tester hat maxProperties: 0, sieht diesen Menüpunkt nicht
  },
  {
    label: 'Einheiten',
    icon: Layers,
    href: '/einheiten',
    tourId: 'nav-units',
    alwaysAllowed: true // Tester darf 1 Einheit anlegen
  },
  {
    label: 'Mieter',
    icon: Users,
    href: '/mieter',
    tourId: 'nav-tenants',
    alwaysAllowed: true // Tester darf 3 Mieter anlegen
  },
  {
    label: 'Eigentümer',
    icon: User,
    href: '/eigentuemer',
    tourId: 'nav-owners',
    requiredFeature: 'canManageOwners'
  },
  {
    label: 'Zählerstände',
    icon: Gauge,
    href: '/zaehlerstaende',
    tourId: 'nav-meter-readings',
    requiredFeature: 'canManageMeters'
  },
  {
    label: 'Schlüssel',
    icon: Key,
    href: '/schluessel',
    tourId: 'nav-keys',
    requiredFeature: 'canManageKeys'
  },
  {
    label: 'VPI-Anpassungen',
    icon: TrendingUp,
    href: '/vpi-anpassungen',
    tourId: 'nav-vpi',
    requiredFeature: 'canManageVpi'
  },
  {
    label: 'Mieteinnahmen',
    icon: Wallet,
    href: '/zahlungen',
    requiredFeature: 'canManageBanking' // Tester darf keine Zahlungen verwalten
  },
  {
    label: 'Vorschreibungen',
    icon: FileText,
    href: '/vorschreibungen',
    alwaysAllowed: true // Tester darf Vorschreibungen sehen (für seine Mieter)
  },
  {
    label: 'Kosten & Belege',
    icon: Receipt,
    href: '/kosten',
    tourId: 'nav-expenses',
    alwaysAllowed: true // Tester darf OCR-Rechnungen hochladen (1x)
  },
  {
    label: 'Banking',
    icon: BookOpen,
    href: '/buchhaltung',
    tourId: 'nav-banking',
    requiredFeature: 'canManageBanking'
  },
  {
    label: 'BK-Abrechnung',
    icon: Calculator,
    href: '/abrechnung',
    alwaysAllowed: true // Tester darf Abrechnungen ansehen (canViewSettlements: true für trial)
  },
  {
    label: 'Budgetplanung',
    icon: PiggyBank,
    href: '/budgets',
    tourId: 'nav-budgets',
    requiredFeature: 'canManageBudgets'
  },
  {
    label: 'Mahnwesen',
    icon: AlertTriangle,
    href: '/mahnwesen',
    tourId: 'nav-dunning',
    requiredFeature: 'canManageDunning'
  },
  {
    label: 'Wartungen & Aufträge',
    icon: Wrench,
    href: '/wartungen',
    tourId: 'nav-maintenance',
    requiredFeature: 'canManageMaintenance'
  },
  {
    label: 'Handwerker',
    icon: HardHat,
    href: '/handwerker',
    tourId: 'nav-contractors',
    requiredFeature: 'canManageContractors'
  },
  {
    label: 'Rechnungsfreigabe',
    icon: CheckSquare,
    href: '/rechnungsfreigabe',
    tourId: 'nav-invoice-approval',
    requiredFeature: 'canManageInvoiceApproval'
  },
  {
    label: 'Nachrichten',
    icon: MessageSquare,
    href: '/nachrichten',
    tourId: 'nav-messages',
    requiredFeature: 'canSendMessages'
  },
  {
    label: 'Team-Verwaltung',
    icon: Users,
    href: '/team',
    tourId: 'nav-team',
    requiredFeature: 'canManageTeam'
  },
  {
    label: 'Dokumente',
    icon: FileStack,
    href: '/dokumente',
    requiredFeature: 'canManageDocuments'
  },
  {
    label: 'Reports',
    icon: TrendingUp,
    href: '/reports',
    tourId: 'nav-reports',
    requiredFeature: 'canViewReports'
  },
  {
    label: 'Buchhalter',
    icon: Calculator,
    href: '/buchhalter',
    tourId: 'nav-accountant',
    requiredFeature: 'canManageBanking'
  },
  {
    label: 'Einstellungen',
    icon: Cog,
    href: '/einstellungen',
    tourId: 'nav-settings',
    alwaysAllowed: true // Jeder darf Einstellungen sehen (für Abo-Upgrade)
  },
  {
    label: 'Aktivitätsprotokoll',
    icon: ClipboardList,
    href: '/admin/audit-logs',
    tourId: 'nav-audit-logs',
    requiredFeature: 'canManageTeam' // Nur für Team-Manager und Admin sichtbar
  }
];

export function Sidebar() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { isOpen, collapsed, closeSidebar, toggleCollapsed } = useSidebarContext();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const permissions = usePermissions();
  const { tier, canAccessFullFeatures, isLoading: isSubscriptionLoading } = useSubscription();
  const { limits, isLoading: isLimitsLoading } = useSubscriptionLimits();
  const branding = useBranding();

  const tierOrder: SubscriptionTier[] = ['starter', 'professional', 'enterprise'];
  const currentTierIndex = tierOrder.indexOf(tier);
  
  const isDataLoading = isAdminLoading || isSubscriptionLoading || isLimitsLoading;

  const canAccessItem = (item: NavItem): boolean => {
    // During loading, allow all items to prevent flickering disabled state
    if (isDataLoading) return true;
    
    // Admins always have full access regardless of subscription
    if (isAdmin) return true;
    
    // Items marked as alwaysAllowed are accessible to everyone
    if (item.alwaysAllowed) return true;
    
    // Check feature-based restrictions (for Tester/Trial users)
    if (item.requiredFeature) {
      const featureValue = limits[item.requiredFeature];
      if (typeof featureValue === 'boolean' && !featureValue) {
        return false;
      }
    }
    
    // Check tier-based restrictions (legacy)
    if (item.requiredTier) {
      if (!canAccessFullFeatures) return false;
      const requiredTierIndex = tierOrder.indexOf(item.requiredTier);
      return currentTierIndex >= requiredTierIndex;
    }
    
    return true;
  };

  // All nav items are now in the main navItems array
  const allNavItems = navItems;

  const handleLinkClick = () => {
    // Close sidebar on mobile after clicking a link
    if (isMobile) {
      closeSidebar();
    }
  };

  // Mobile: overlay sidebar
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {isOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={closeSidebar}
          />
        )}
        
        {/* Sidebar */}
        <aside 
          data-tour="sidebar"
          className={cn(
            'fixed left-0 top-0 z-50 h-screen bg-sidebar border-r border-sidebar-border w-64 transition-transform duration-300 flex flex-col',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Header with close button */}
          <div className="flex h-20 items-center justify-between px-4 border-b border-sidebar-border shrink-0">
            <div className="flex items-center gap-3">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={`${branding.brandName} Logo`} className="h-12 w-auto max-w-[120px] object-contain" />
              ) : (
                <img src={immoflowLogo} alt={`${branding.brandName} Logo`} className="h-12 w-auto" />
              )}
              <div className="flex flex-col">
                <span className="font-bold text-white text-lg leading-tight">{branding.brandName}</span>
                {!branding.logoUrl && <span className="text-xs text-white/60">by ImmoPepper</span>}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 bg-sidebar-accent/50 text-white hover:bg-sidebar-accent"
              onClick={closeSidebar}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation - scrollable */}
          <nav className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 p-2 mt-2">
            {allNavItems.map(item => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/' && location.pathname.startsWith(item.href));
              const hasAccess = canAccessItem(item);
              return (
                <Link 
                  key={item.href} 
                  to={hasAccess ? item.href : '/einstellungen?tab=subscription'}
                  onClick={handleLinkClick}
                  data-tour={item.tourId}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    'text-white/80 hover:text-white hover:bg-white/10',
                    isActive && hasAccess && 'bg-white/15 text-white',
                    !hasAccess && 'opacity-60'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {!hasAccess && (
                    <Lock className="h-4 w-4 text-white/50" />
                  )}
                  {item.badge && hasAccess && (
                    <span className="rounded-full bg-sidebar-primary px-2 py-0.5 text-xs text-sidebar-primary-foreground">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
            {isAdmin && (
              <Link 
                to="/admin"
                onClick={handleLinkClick}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  'text-white/80 hover:text-white hover:bg-white/10',
                  location.pathname.startsWith('/admin') && 'bg-white/15 text-white'
                )}
              >
                <Shield className="h-5 w-5 shrink-0" />
                <span className="flex-1">Administration</span>
              </Link>
            )}
          </nav>

          {/* Footer - fixed at bottom */}
          <div className="shrink-0 p-4 border-t border-sidebar-border">
            <div className="rounded-lg bg-sidebar-accent p-3">
              <p className="text-xs text-sidebar-foreground/50">© 2026 {branding.brandName}</p>
            </div>
          </div>
        </aside>
      </>
    );
  }

  // Desktop: regular sidebar
  return (
    <aside 
      data-tour="sidebar"
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-20 items-center justify-between px-4 border-b border-sidebar-border shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-3">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={`${branding.brandName} Logo`} className="h-12 w-auto max-w-[120px] object-contain" />
            ) : (
              <img src={immoflowLogo} alt={`${branding.brandName} Logo`} className="h-12 w-auto" />
            )}
            <div className="flex flex-col">
              <span className="font-bold text-white text-lg leading-tight">{branding.brandName}</span>
              {!branding.logoUrl && <span className="text-xs text-white/60">by ImmoPepper</span>}
            </div>
          </div>
        )}
        {collapsed && (
          branding.logoUrl ? (
            <img src={branding.logoUrl} alt={`${branding.brandName} Logo`} className="h-10 w-10 object-contain" />
          ) : (
            <img src={immoflowLogo} alt={`${branding.brandName} Logo`} className="h-10 w-10 object-contain" />
          )
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 bg-sidebar-accent/50 text-white hover:bg-sidebar-accent" 
          onClick={toggleCollapsed}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      {/* Navigation - scrollable */}
      <nav className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 p-2 mt-2">
        {allNavItems.map(item => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href));
          const hasAccess = canAccessItem(item);
          return (
            <Link 
              key={item.href} 
              to={hasAccess ? item.href : '/einstellungen?tab=subscription'} 
              title={collapsed ? item.label : undefined}
              data-tour={item.tourId}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                'text-white/80 hover:text-white hover:bg-white/10',
                isActive && hasAccess && 'bg-white/15 text-white',
                !hasAccess && 'opacity-60'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {!hasAccess && (
                    <Lock className="h-4 w-4 text-white/50" />
                  )}
                  {item.badge && hasAccess && (
                    <span className="rounded-full bg-sidebar-primary px-2 py-0.5 text-xs text-sidebar-primary-foreground">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
        {isAdmin && (
          <Link 
            to="/admin"
            title={collapsed ? 'Administration' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
              'text-white/80 hover:text-white hover:bg-white/10',
              location.pathname.startsWith('/admin') && 'bg-white/15 text-white'
            )}
          >
            <Shield className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="flex-1">Administration</span>}
          </Link>
        )}
      </nav>

      {/* Footer - fixed at bottom */}
      {!collapsed && (
        <div className="shrink-0 p-4 border-t border-sidebar-border">
          <div className="rounded-lg bg-sidebar-accent p-3">
            <p className="text-xs text-sidebar-foreground/50">© 2026 {branding.brandName}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
