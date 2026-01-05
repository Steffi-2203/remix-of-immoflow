import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Building, LayoutDashboard, FileStack, TrendingUp, Cog, Wallet, Layers, Calculator, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import immoflowLogo from '@/assets/immoflow-logo.png';
interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
}
const navItems: NavItem[] = [{
  label: 'Dashboard',
  icon: LayoutDashboard,
  href: '/'
}, {
  label: 'Liegenschaften',
  icon: Building,
  href: '/liegenschaften'
}, {
  label: 'Einheiten',
  icon: Layers,
  href: '/einheiten'
}, {
  label: 'Zahlungen',
  icon: Wallet,
  href: '/zahlungen'
}, {
  label: 'Buchhaltung',
  icon: BookOpen,
  href: '/buchhaltung'
}, {
  label: 'BK-Abrechnung',
  icon: Calculator,
  href: '/abrechnung'
}, {
  label: 'Dokumente',
  icon: FileStack,
  href: '/dokumente'
}, {
  label: 'Reports',
  icon: TrendingUp,
  href: '/reports'
}, {
  label: 'Einstellungen',
  icon: Cog,
  href: '/einstellungen'
}];
export function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  return <aside className={cn('fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300', collapsed ? 'w-16' : 'w-64')}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && <div className="flex items-center gap-2">
            <img src={immoflowLogo} alt="ImmoFlow Logo" className="h-12 w-auto" />
          </div>}
        {collapsed && <img src={immoflowLogo} alt="ImmoFlow Logo" className="h-10 w-10 object-contain" />}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-2 mt-2">
        {navItems.map(item => {
        const isActive = location.pathname === item.href || item.href !== '/' && location.pathname.startsWith(item.href);
        return <Link 
            key={item.href} 
            to={item.href} 
            title={collapsed ? item.label : undefined} 
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
              'text-white/80 hover:text-white hover:bg-white/10',
              isActive && 'bg-white/15 text-white'
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <>
                <span className="flex-1">{item.label}</span>
                {item.badge && <span className="rounded-full bg-sidebar-primary px-2 py-0.5 text-xs text-sidebar-primary-foreground">
                    {item.badge}
                  </span>}
              </>}
          </Link>;
      })}
      </nav>

      {/* Footer */}
      {!collapsed && <div className="absolute bottom-4 left-4 right-4">
          <div className="rounded-lg bg-sidebar-accent p-3">
            <p className="text-xs text-sidebar-foreground/70">Version 1.0.0</p>
            <p className="text-xs text-sidebar-foreground/50 mt-1">© 2026 ImmoFlow</p>
          </div>
        </div>}
    </aside>;
}