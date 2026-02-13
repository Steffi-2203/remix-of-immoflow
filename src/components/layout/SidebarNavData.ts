import {
  Building,
  Layers,
  Users,
  Wallet,
  Receipt,
  BookOpen,
  Calculator,
  FileStack,
  TrendingUp,
  Cog,
  PiggyBank,
  Shield,
  FileSignature,
  ClipboardList,
  Landmark,
  BarChart3,
  UserCog,
  Building2,
  ScrollText,
  AlertTriangle,
} from 'lucide-react';
import type { AppRole } from '@/hooks/useUserRole';

export interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  tourId?: string;
  /** Roles allowed to see this item. If omitted, visible to all authenticated users. */
  allowedRoles?: AppRole[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
  /** Roles allowed to see this entire section. If omitted, visible to all. */
  allowedRoles?: AppRole[];
}

export const navSections: NavSection[] = [
  {
    label: 'WEG',
    items: [
      { label: 'Banking', icon: BookOpen, href: '/buchhaltung', allowedRoles: ['admin', 'finance', 'property_manager'] },
      { label: 'Einnahmen', icon: Wallet, href: '/zahlungen', allowedRoles: ['admin', 'finance', 'property_manager'] },
      { label: 'Ausgaben', icon: Receipt, href: '/kosten', allowedRoles: ['admin', 'finance', 'property_manager'] },
      { label: 'Rücklagen', icon: PiggyBank, href: '/budgets', allowedRoles: ['admin', 'finance'] },
      { label: 'BK-Abrechnung', icon: Calculator, href: '/abrechnung', allowedRoles: ['admin', 'finance', 'property_manager'] },
      { label: 'Vorschreibung', icon: ClipboardList, href: '/vorschreibungen', allowedRoles: ['admin', 'finance', 'property_manager'] },
      { label: 'Reporting', icon: BarChart3, href: '/reports' },
    ],
  },
  {
    label: 'MRG',
    items: [
      { label: 'Banking', icon: BookOpen, href: '/buchhaltung', allowedRoles: ['admin', 'finance', 'property_manager'] },
      { label: 'Einnahmen', icon: Wallet, href: '/zahlungen', allowedRoles: ['admin', 'finance', 'property_manager'] },
      { label: 'Ausgaben', icon: Receipt, href: '/kosten', allowedRoles: ['admin', 'finance', 'property_manager'] },
      { label: 'Mietzins', icon: Landmark, href: '/zahlungen?tab=rent', allowedRoles: ['admin', 'finance', 'property_manager'] },
      { label: 'Mahnwesen', icon: AlertTriangle, href: '/mahnwesen', allowedRoles: ['admin', 'finance'] },
      { label: 'BK-Abrechnung', icon: Calculator, href: '/abrechnung', allowedRoles: ['admin', 'finance', 'property_manager'] },
      { label: 'Reporting', icon: BarChart3, href: '/reports' },
    ],
  },
  {
    label: 'Stammdaten',
    items: [
      { label: 'Objekte', icon: Building, href: '/liegenschaften' },
      { label: 'Einheiten', icon: Layers, href: '/einheiten' },
      { label: 'Mieter & Eigentümer', icon: Users, href: '/mieter' },
      { label: 'Verträge', icon: FileSignature, href: '/hv-vertraege', allowedRoles: ['admin', 'property_manager'] },
      { label: 'Dokumente', icon: FileStack, href: '/dokumente' },
    ],
  },
  {
    label: 'System',
    allowedRoles: ['admin', 'ops'],
    items: [
      { label: 'Benutzer & Rollen', icon: UserCog, href: '/team' },
      { label: 'Organisation', icon: Building2, href: '/einstellungen' },
      { label: 'Einstellungen', icon: Cog, href: '/einstellungen' },
      { label: 'Audit-Log', icon: ScrollText, href: '/reports' },
    ],
  },
];

/**
 * Filter nav sections and items based on user role.
 * If role is null/undefined (not loaded yet), returns all sections (permissive default).
 */
export function getFilteredNavSections(role: AppRole | null | undefined): NavSection[] {
  if (!role) return navSections;

  // Testers see everything (for QA purposes)
  if (role === 'tester') return navSections;

  return navSections
    .filter(section => !section.allowedRoles || section.allowedRoles.includes(role))
    .map(section => ({
      ...section,
      items: section.items.filter(item => !item.allowedRoles || item.allowedRoles.includes(role)),
    }))
    .filter(section => section.items.length > 0);
}
