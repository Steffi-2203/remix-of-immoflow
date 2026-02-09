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
      { label: 'Banking', icon: BookOpen, href: '/weg/banking' },
      { label: 'Einnahmen', icon: Wallet, href: '/weg/einnahmen' },
      { label: 'Ausgaben', icon: Receipt, href: '/weg/ausgaben' },
      { label: 'Rücklagen', icon: PiggyBank, href: '/weg/ruecklagen' },
      { label: 'BK-Abrechnung', icon: Calculator, href: '/weg/bk' },
      { label: 'Vorschreibung', icon: ClipboardList, href: '/weg/vorschreibung' },
      { label: 'Reporting', icon: BarChart3, href: '/weg/reporting' },
    ],
  },
  {
    label: 'MRG',
    items: [
      { label: 'Banking', icon: BookOpen, href: '/mrg/banking' },
      { label: 'Einnahmen', icon: Wallet, href: '/mrg/einnahmen' },
      { label: 'Ausgaben', icon: Receipt, href: '/mrg/ausgaben' },
      { label: 'Mietzins', icon: Landmark, href: '/mrg/mietzins' },
      { label: 'Mahnwesen', icon: AlertTriangle, href: '/mrg/mahnwesen' },
      { label: 'BK-Abrechnung', icon: Calculator, href: '/mrg/bk' },
      { label: 'Reporting', icon: BarChart3, href: '/mrg/reporting' },
    ],
  },
  {
    label: 'Stammdaten',
    items: [
      { label: 'Objekte', icon: Building, href: '/stammdaten/objekte' },
      { label: 'Einheiten', icon: Layers, href: '/stammdaten/einheiten' },
      { label: 'Mieter & Eigentümer', icon: Users, href: '/stammdaten/personen' },
      { label: 'Verträge', icon: FileSignature, href: '/stammdaten/vertraege' },
      { label: 'Dokumente', icon: FileStack, href: '/stammdaten/dokumente' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Benutzer & Rollen', icon: UserCog, href: '/system/users' },
      { label: 'Organisation', icon: Building2, href: '/system/org' },
      { label: 'Einstellungen', icon: Cog, href: '/system/settings' },
      { label: 'Audit-Log', icon: ScrollText, href: '/system/audit' },
    ],
  },
];
