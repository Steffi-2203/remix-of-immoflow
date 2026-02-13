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

export interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  tourId?: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    label: 'WEG',
    items: [
      { label: 'Banking', icon: BookOpen, href: '/buchhaltung' },
      { label: 'Einnahmen', icon: Wallet, href: '/zahlungen' },
      { label: 'Ausgaben', icon: Receipt, href: '/kosten' },
      { label: 'Rücklagen', icon: PiggyBank, href: '/budgets' },
      { label: 'BK-Abrechnung', icon: Calculator, href: '/abrechnung' },
      { label: 'Vorschreibung', icon: ClipboardList, href: '/vorschreibungen' },
      { label: 'Reporting', icon: BarChart3, href: '/reports' },
    ],
  },
  {
    label: 'MRG',
    items: [
      { label: 'Banking', icon: BookOpen, href: '/buchhaltung' },
      { label: 'Einnahmen', icon: Wallet, href: '/zahlungen' },
      { label: 'Ausgaben', icon: Receipt, href: '/kosten' },
      { label: 'Mietzins', icon: Landmark, href: '/zahlungen?tab=rent' },
      { label: 'Mahnwesen', icon: AlertTriangle, href: '/mahnwesen' },
      { label: 'BK-Abrechnung', icon: Calculator, href: '/abrechnung' },
      { label: 'Reporting', icon: BarChart3, href: '/reports' },
    ],
  },
  {
    label: 'Stammdaten',
    items: [
      { label: 'Objekte', icon: Building, href: '/liegenschaften' },
      { label: 'Einheiten', icon: Layers, href: '/einheiten' },
      { label: 'Mieter & Eigentümer', icon: Users, href: '/mieter' },
      { label: 'Verträge', icon: FileSignature, href: '/hv-vertraege' },
      { label: 'Dokumente', icon: FileStack, href: '/dokumente' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Benutzer & Rollen', icon: UserCog, href: '/team' },
      { label: 'Organisation', icon: Building2, href: '/einstellungen' },
      { label: 'Einstellungen', icon: Cog, href: '/einstellungen' },
      { label: 'Audit-Log', icon: ScrollText, href: '/reports' },
    ],
  },
];
