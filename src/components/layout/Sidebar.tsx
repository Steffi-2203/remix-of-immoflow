import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  ChevronLeft, 
  ChevronRight, 
  X,
  Shield,
  LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSidebarContext } from '@/contexts/SidebarContext';
import { useIsAdmin } from '@/hooks/useAdmin';
import immoflowLogo from '@/assets/immoflowme-logo.png';
import { navSections } from './SidebarNavData';
import { SidebarSection } from './SidebarSection';

export function Sidebar() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { isOpen, collapsed, closeSidebar, toggleCollapsed } = useSidebarContext();
  const { data: isAdmin } = useIsAdmin();

  const handleLinkClick = () => {
    if (isMobile) {
      closeSidebar();
    }
  };

  const dashboardLink = (showLabel: boolean) => {
    const isActive = location.pathname === '/dashboard';
    return (
      <Link
        to="/dashboard"
        onClick={handleLinkClick}
        title={!showLabel ? 'Dashboard' : undefined}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
          'text-white/80 hover:text-white hover:bg-white/10',
          isActive && 'bg-white/15 text-white'
        )}
      >
        <LayoutDashboard className="h-5 w-5 shrink-0" />
        {showLabel && <span className="flex-1">Dashboard</span>}
      </Link>
    );
  };

  const adminLink = (showLabel: boolean) =>
    isAdmin ? (
      <Link
        to="/admin"
        onClick={handleLinkClick}
        title={!showLabel ? 'Administration' : undefined}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
          'text-white/80 hover:text-white hover:bg-white/10',
          location.pathname.startsWith('/admin') && 'bg-white/15 text-white'
        )}
      >
        <Shield className="h-5 w-5 shrink-0" />
        {showLabel && <span className="flex-1">Administration</span>}
      </Link>
    ) : null;

  // Mobile: overlay sidebar
  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={closeSidebar}
          />
        )}
        <aside
          data-tour="sidebar"
          className={cn(
            'fixed left-0 top-0 z-50 h-screen bg-sidebar border-r border-sidebar-border w-64 transition-transform duration-300 flex flex-col',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
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

          <nav className="flex-1 overflow-y-auto flex flex-col gap-1 p-2 mt-2">
            {dashboardLink(true)}
            {navSections.map((section) => (
              <SidebarSection key={section.label} section={section} collapsed={false} onLinkClick={handleLinkClick} />
            ))}
            {adminLink(true)}
          </nav>

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

      <nav className="flex-1 overflow-y-auto flex flex-col gap-1 p-2 mt-2">
        {dashboardLink(!collapsed)}
        {navSections.map((section) => (
          <SidebarSection key={section.label} section={section} collapsed={collapsed} onLinkClick={handleLinkClick} />
        ))}
        {adminLink(!collapsed)}
      </nav>

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
