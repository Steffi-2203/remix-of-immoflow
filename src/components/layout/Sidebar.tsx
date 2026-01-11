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
  X,
  Shield,
  FileText,
  Wrench,
  CheckSquare,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSidebarContext } from '@/contexts/SidebarContext';
import { useIsAdmin } from '@/hooks/useAdmin';
import { usePermissions } from '@/hooks/usePermissions';
import immoflowLogo from '@/assets/immoflowme-logo.png';

// NavItem interface moved below imports

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
  tourId?: string;
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

  // Role-based navigation items
  const roleBasedItems: NavItem[] = [
    ...(permissions.canManageMaintenance || permissions.isAdmin ? [{
      label: 'Wartungen & Aufträge',
      icon: Wrench,
      href: '/wartungen',
      tourId: 'nav-maintenance'
    }] : []),
    ...(permissions.canApproveInvoices || permissions.isAdmin ? [{
      label: 'Rechnungsfreigabe',
      icon: CheckSquare,
      href: '/rechnungsfreigabe',
      tourId: 'nav-invoice-approval'
    }] : []),
    ...(permissions.canSendMessages || permissions.isAdmin ? [{
      label: 'Nachrichten',
      icon: MessageSquare,
      href: '/nachrichten',
      tourId: 'nav-messages'
    }] : []),
  ];

  // Combine base nav items with role-based items (insert before Einstellungen)
  const allNavItems = [
    ...navItems.slice(0, -1), // All items except Einstellungen
    ...roleBasedItems,
    navItems[navItems.length - 1] // Einstellungen at the end
  ];

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
            'fixed left-0 top-0 z-50 h-screen bg-sidebar border-r border-sidebar-border w-64 transition-transform duration-300',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Header with close button */}
          <div className="flex h-20 items-center justify-between px-4 border-b border-sidebar-border">
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
              className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={closeSidebar}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1 p-2 mt-2">
            {allNavItems.map(item => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/' && location.pathname.startsWith(item.href));
              return (
                <Link 
                  key={item.href} 
                  to={item.href}
                  onClick={handleLinkClick}
                  data-tour={item.tourId}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    'text-white/80 hover:text-white hover:bg-white/10',
                    isActive && 'bg-white/15 text-white'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
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

          {/* Footer */}
          <div className="absolute bottom-4 left-4 right-4">
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
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-20 items-center justify-between px-4 border-b border-sidebar-border">
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
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent" 
          onClick={toggleCollapsed}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-2 mt-2">
        {allNavItems.map(item => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href));
          return (
            <Link 
              key={item.href} 
              to={item.href} 
              title={collapsed ? item.label : undefined}
              data-tour={item.tourId}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                'text-white/80 hover:text-white hover:bg-white/10',
                isActive && 'bg-white/15 text-white'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
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

      {/* Footer */}
      {!collapsed && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="rounded-lg bg-sidebar-accent p-3">
            <p className="text-xs text-sidebar-foreground/50">© 2026 ImmoflowMe by ImmoPepper</p>
          </div>
        </div>
      )}
    </aside>
  );
}
