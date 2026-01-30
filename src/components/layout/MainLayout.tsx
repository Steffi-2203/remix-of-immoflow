import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SidebarProvider, useSidebarContext } from '@/contexts/SidebarContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { AlertTriangle } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

function DemoBanner() {
  return (
    <div className="bg-amber-500/90 text-amber-950 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
      <AlertTriangle className="h-4 w-4" />
      <span>Demo-Modus – Alle Änderungen sind nur virtuell und werden nicht gespeichert</span>
    </div>
  );
}

function MainLayoutContent({ children, title, subtitle }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const { collapsed } = useSidebarContext();
  const { isTester } = usePermissions();

  return (
    <div className="min-h-screen bg-background">
      {isTester && <DemoBanner />}
      <Sidebar />
      <div 
        className={cn(
          'transition-all duration-300',
          isMobile ? 'pl-0' : (collapsed ? 'pl-16' : 'pl-64')
        )}
      >
        <Header title={title} subtitle={subtitle} />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <MainLayoutContent title={title} subtitle={subtitle}>
        {children}
      </MainLayoutContent>
    </SidebarProvider>
  );
}
