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
  Key
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSidebarContext } from '@/contexts/SidebarContext';
import { useIsAdmin } from '@/hooks/useAdmin';
import { usePermissions } from '@/hooks/usePermissions';
import { useSubscription, SubscriptionTier } from '@/hooks/useSubscription';
import immoflowLogo from '@/assets/immoflowme-logo.png';

// NavItem interface moved below imports

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
  tourId?: string;
  requiredTier?: SubscriptionTier;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    tourId: 'nav-dashboard'
  },
  {
    label: 'Liegenschaften',
    icon: Building,
    href: '/liegenschaften',
    tourId: 'nav-properties'
  },
  {
    label: 'Einheiten',
    icon: Layers,
    href: '/einheiten',
    tourId: 'nav-units'
  },
  {
    label: 'Mieter',
    icon: Users,
    href: '/mieter',
    tourId: 'nav-tenants'
  },
  {
    label: 'Eigentümer',
    icon: User,
    href: '/eigentuemer',
    tourId: 'nav-owners'
  },
  {
    label: 'Zählerstände',
    icon: Gauge,
    href: '/zaehlerstaende',
    tourId: 'nav-meter-readings'
  },
  {
    label: 'Schlüssel',
    icon: Key,
    href: '/schluessel',
    tourId: 'nav-keys'
  },
  {
    label: 'VPI-Anpassungen',
    icon: TrendingUp,
    href: '/vpi-anpassungen',
    tourId: 'nav-vpi'
  },
  {
    label: 'Mieteinnahmen',
    icon: Wallet,
    href: '/zahlungen'
  },
  {
    label: 'Vorschreibungen',
    icon: FileText,
    href: '/vorschreibungen'
  },
  {
    label: 'Kosten & Belege',
    icon: Receipt,
    href: '/kosten',
    tourId: 'nav-expenses'
  },
  {
    label: 'Banking',
    icon: BookOpen,
    href: '/buchhaltung',
    tourId: 'nav-banking'
  },
  {
    label: 'BK-Abrechnung',
    icon: Calculator,
    href: '/abrechnung'
  },
  {
    label: 'Budgetplanung',
    icon: PiggyBank,
    href: '/budgets',
    tourId: 'nav-budgets',
    requiredTier: 'professional' as SubscriptionTier
  },
  {
    label: 'Mahnwesen',
    icon: AlertTriangle,
    href: '/mahnwesen',
    tourId: 'nav-dunning',
    requiredTier: 'professional' as SubscriptionTier
  },
  {
    label: 'Wartungen & Aufträge',
    icon: Wrench,
    href: '/wartungen',
    tourId: 'nav-maintenance',
    requiredTier: 'professional' as SubscriptionTier
  },
  {
    label: 'Handwerker',
    icon: HardHat,
    href: '/handwerker',
    tourId: 'nav-contractors',
    requiredTier: 'professional' as SubscriptionTier
  },
  {
    label: 'Rechnungsfreigabe',
    icon: CheckSquare,
    href: '/rechnungsfreigabe',
    tourId: 'nav-invoice-approval'
  },
  {
    label: 'Nachrichten',
    icon: MessageSquare,
    href: '/nachrichten',
    tourId: 'nav-messages'
  },
  {
    label: 'Team-Verwaltung',
    icon: Users,
    href: '/team',
    tourId: 'nav-team'
  },
  {
    label: 'Dokumente',
    icon: FileStack,
    href: '/dokumente'
  },
  {
    label: 'Reports',
    icon: TrendingUp,
    href: '/reports',
    tourId: 'nav-reports'
  },
  {
    label: 'Einstellungen',
    icon: Cog,
    href: '/einstellungen',
    tourId: 'nav-settings'
  }
];

export function Sidebar() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { isOpen, collapsed, closeSidebar, toggleCollapsed } = useSidebarContext();
  const { data: isAdmin } = useIsAdmin();
  const permissions = usePermissions();
  const { tier, canAccessFullFeatures } = useSubscription();

  const tierOrder: SubscriptionTier[] = ['starter', 'professional', 'enterprise'];
  const currentTierIndex = tierOrder.indexOf(tier);

  const canAccessItem = (item: NavItem): boolean => {
    if (!item.requiredTier) return true;
    // Admins always have full access regardless of subscription
    if (isAdmin) return true;
    if (!canAccessFullFeatures) return false;
    const requiredTierIndex = tierOrder.indexOf(item.requiredTier);
    return currentTierIndex >= requiredTierIndex;
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
              <img src={immoflowLogo} alt="ImmoflowMe Logo" className="h-12 w-auto" />
              <div className="flex flex-col">
                <span className="font-bold text-white text-lg leading-tight">ImmoflowMe</span>
                <span className="text-xs text-white/60">by ImmoPepper</span>
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
          <nav className="flex-1 overflow-y-auto flex flex-col gap-1 p-2 mt-2">
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
              <p className="text-xs text-sidebar-foreground/50">© 2026 ImmoflowMe by ImmoPepper</p>
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
            <img src={immoflowLogo} alt="ImmoflowMe Logo" className="h-12 w-auto" />
            <div className="flex flex-col">
              <span className="font-bold text-white text-lg leading-tight">ImmoflowMe</span>
              <span className="text-xs text-white/60">by ImmoPepper</span>
            </div>
          </div>
        )}
        {collapsed && (
          <img src={immoflowLogo} alt="ImmoflowMe Logo" className="h-10 w-10 object-contain" />
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
      <nav className="flex-1 overflow-y-auto flex flex-col gap-1 p-2 mt-2">
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
            <p className="text-xs text-sidebar-foreground/50">© 2026 ImmoflowMe by ImmoPepper</p>
          </div>
        </div>
      )}
    </aside>
  );
}
