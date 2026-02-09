import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import {
  X,
  Shield,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSidebarContext } from '@/contexts/SidebarContext';
import { useIsAdmin } from '@/hooks/useAdmin';
import immoflowLogo from '@/assets/immoflowme-logo.png';
import { navSections } from './SidebarNavData';

export function Sidebar() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { isOpen, collapsed, closeSidebar, toggleCollapsed } = useSidebarContext();
  const { data: isAdmin } = useIsAdmin();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const handleLinkClick = () => {
    if (isMobile) {
      closeSidebar();
    }
  };

  const toggleSection = (label: string) => {
    setActiveSection(activeSection === label ? null : label);
  };

  const activeSectionData = navSections.find((s) => s.label === activeSection);

  // Determine if a section contains the current route
  const getSectionForPath = (path: string) =>
    navSections.find((s) => s.items.some((i) => path.startsWith(i.href)));

  const currentSection = getSectionForPath(location.pathname);

  const isDashboardActive = location.pathname === '/dashboard';

  // Rail content (shared between mobile & desktop)
  const railContent = (showLabels: boolean) => (
    <>
      {/* Dashboard shortcut */}
      <Link
        to="/dashboard"
        onClick={handleLinkClick}
        title="Dashboard"
        className={cn(
          'flex flex-col items-center gap-1 rounded-lg px-2 py-3 text-xs font-medium transition-all',
          'text-white/70 hover:text-white hover:bg-white/10',
          isDashboardActive && 'bg-white/15 text-white'
        )}
      >
        <LayoutDashboard className="h-5 w-5" />
        {showLabels && <span>Dashboard</span>}
      </Link>

      {/* Section buttons */}
      {navSections.map((section) => {
        const isActive = activeSection === section.label;
        const containsCurrent = currentSection?.label === section.label;
        return (
          <button
            key={section.label}
            onClick={() => toggleSection(section.label)}
            title={section.label}
            className={cn(
              'w-12 h-12 flex items-center justify-center rounded-lg text-xs font-medium transition-colors',
              'hover:bg-white/10',
              (isActive || containsCurrent)
                ? 'bg-white/15 text-white'
                : 'text-white/50'
            )}
          >
            {section.label}
          </button>
        );
      })}

      {/* Admin link */}
      {isAdmin && (
        <Link
          to="/admin"
          onClick={handleLinkClick}
          title="Administration"
          className={cn(
            'flex flex-col items-center gap-1 rounded-lg px-2 py-3 text-xs font-medium transition-all',
            'text-white/70 hover:text-white hover:bg-white/10',
            location.pathname.startsWith('/admin') && 'bg-white/15 text-white'
          )}
        >
          <Shield className="h-5 w-5" />
          {showLabels && <span>Admin</span>}
        </Link>
      )}
    </>
  );

  // Items panel content
  const itemsPanel = (
    <div className="w-56 py-4 px-3 flex flex-col gap-0.5 border-r border-sidebar-border">
      <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/50">
        {activeSection}
      </p>
      {activeSectionData?.items.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={handleLinkClick}
            className="block px-3 py-2 rounded-md text-sm text-white/60 hover:bg-white/10 transition-colors"
            activeClassName="bg-white/15 text-white"
          >
            {item.label}
          </NavLink>
      ))}
    </div>
  );

  // --- Mobile ---
  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => {
              closeSidebar();
              setActiveSection(null);
            }}
          />
        )}
        <aside
          data-tour="sidebar"
          className={cn(
            'fixed left-0 top-0 z-50 h-screen bg-sidebar border-r border-sidebar-border transition-transform duration-300 flex',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Left rail */}
          <div className="w-20 flex flex-col border-r border-sidebar-border shrink-0">
            <div className="flex h-16 items-center justify-center border-b border-sidebar-border shrink-0">
              <img src={immoflowLogo} alt="ImmoflowMe Logo" className="h-10 w-10 object-contain" />
            </div>
            <nav className="flex-1 overflow-y-auto flex flex-col gap-1 p-1.5 mt-1">
              {railContent(true)}
            </nav>
            <div className="shrink-0 p-2 border-t border-sidebar-border">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-sidebar-accent/50 text-white hover:bg-sidebar-accent w-full"
                onClick={() => {
                  closeSidebar();
                  setActiveSection(null);
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Right panel */}
          {activeSectionData && (
            <div className="w-56 overflow-y-auto">
              {itemsPanel}
            </div>
          )}
        </aside>
      </>
    );
  }

  // --- Desktop ---
  const panelOpen = !!activeSectionData;

  return (
    <aside
      data-tour="sidebar"
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex',
        panelOpen ? 'w-[17.5rem]' : 'w-16'
      )}
    >
      {/* Left rail */}
      <div className="w-16 bg-sidebar text-sidebar-foreground flex flex-col items-center py-4 gap-2 border-r border-sidebar-border shrink-0">
        <div className="flex h-16 items-center justify-center border-b border-sidebar-border shrink-0">
          <img src={immoflowLogo} alt="ImmoflowMe Logo" className="h-10 w-10 object-contain" />
        </div>
        <nav className="flex-1 overflow-y-auto flex flex-col gap-0.5 p-1.5 mt-1">
          {railContent(false)}
        </nav>
        <div className="shrink-0 p-2 border-t border-sidebar-border text-center">
          <p className="text-[9px] text-sidebar-foreground/40">© 2026</p>
        </div>
      </div>

      {/* Right panel */}
      {panelOpen && (
        <div className="flex-1 overflow-y-auto">
          {itemsPanel}
        </div>
      )}
    </aside>
  );
}
