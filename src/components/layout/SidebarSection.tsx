import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { NavSection } from './SidebarNavData';

interface SidebarSectionProps {
  section: NavSection;
  collapsed: boolean;
  onLinkClick?: () => void;
}

export function SidebarSection({ section, collapsed, onLinkClick }: SidebarSectionProps) {
  const location = useLocation();
  const sectionActive = section.items.some(
    (item) => location.pathname === item.href || location.pathname.startsWith(item.href + '/')
  );

  if (collapsed) {
    return (
      <div className="flex flex-col gap-0.5">
        {section.items.map((item) => {
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              to={item.href}
              title={item.label}
              onClick={onLinkClick}
              className={cn(
                'flex items-center justify-center rounded-lg p-2.5 text-sm font-medium transition-all',
                'text-white/80 hover:text-white hover:bg-white/10',
                isActive && 'bg-white/15 text-white'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <Collapsible defaultOpen={sectionActive}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/50 hover:text-white/70 transition-colors">
        <span className="flex-1 text-left">{section.label}</span>
        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [[data-state=closed]_&]:rotate-[-90deg]" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-0.5 pl-1">
          {section.items.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onLinkClick}
                data-tour={item.tourId}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                  'text-white/80 hover:text-white hover:bg-white/10',
                  isActive && 'bg-white/15 text-white'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
