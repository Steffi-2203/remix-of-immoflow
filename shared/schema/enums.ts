import { pgEnum } from "drizzle-orm/pg-core";

// ── Auth / Roles ─────────────────────────────────────────────────────────
export const appRoleEnum = pgEnum('app_role', ['admin', 'property_manager', 'finance', 'viewer', 'tester']);
export const inviteStatusEnum = pgEnum('invite_status', ['pending', 'accepted', 'expired', 'cancelled']);

// ── Subscription ─────────────────────────────────────────────────────────
export const subscriptionStatusEnum = pgEnum('subscription_status', ['trial', 'active', 'cancelled', 'expired']);
export const subscriptionTierEnum = pgEnum('subscription_tier', ['starter', 'professional', 'enterprise']);
export const userSubscriptionTierEnum = pgEnum('user_subscription_tier', ['trial', 'inactive', 'starter', 'pro', 'enterprise']);
export const paymentStatusEnum = pgEnum('payment_status', ['active', 'past_due', 'canceled', 'unpaid']);

// ── Property / Unit ──────────────────────────────────────────────────────
export const unitTypeEnum = pgEnum('unit_type', ['wohnung', 'geschaeft', 'garage', 'stellplatz', 'lager', 'sonstiges']);
export const tenantStatusEnum = pgEnum('tenant_status', ['aktiv', 'leerstand', 'beendet']);
export const leaseStatusEnum = pgEnum('lease_status', ['aktiv', 'beendet', 'gekuendigt']);

// ── Billing / Invoices ───────────────────────────────────────────────────
export const invoiceStatusEnum = pgEnum('invoice_status', ['offen', 'bezahlt', 'teilbezahlt', 'ueberfaellig']);
export const paymentTypeEnum = pgEnum('payment_type', ['sepa', 'ueberweisung', 'bar', 'sonstiges']);

// ── Finance / Expenses ───────────────────────────────────────────────────
export const expenseCategoryEnum = pgEnum('expense_category', ['betriebskosten_umlagefaehig', 'instandhaltung']);
export const expenseTypeEnum = pgEnum('expense_type', [
  'versicherung', 'grundsteuer', 'muellabfuhr', 'wasser_abwasser', 'heizung',
  'strom_allgemein', 'hausbetreuung', 'lift', 'gartenpflege', 'schneeraeumung',
  'verwaltung', 'ruecklage', 'reparatur', 'sanierung', 'sonstiges'
]);
export const mrgBkKategorieEnum = pgEnum('mrg_bk_kategorie', [
  'wasserversorgung', 'abwasserentsorgung', 'muellabfuhr', 'kanalraeumung',
  'hausreinigung', 'hausbetreuung', 'rauchfangkehrer', 'schaedlingsbekaempfung',
  'lichtkosten', 'beleuchtung', 'feuerversicherung', 'haftpflichtversicherung',
  'leitungswasserschaden', 'sturmschaden', 'glasversicherung',
  'grundsteuer', 'verwaltung', 'sonstige'
]);
export const settlementStatusEnum = pgEnum('settlement_status', ['entwurf', 'berechnet', 'versendet', 'abgeschlossen']);
export const budgetStatusEnum = pgEnum('budget_status', ['entwurf', 'eingereicht', 'genehmigt', 'abgelehnt']);

// ── Meters / Facility ────────────────────────────────────────────────────
export const meterTypeEnum = pgEnum('meter_type', ['strom', 'gas', 'wasser', 'heizung', 'warmwasser', 'sonstiges']);
export const keyTypeEnum = pgEnum('key_type', ['hauptschluessel', 'wohnungsschluessel', 'kellerschluessel', 'garagenschluessel', 'briefkastenschluessel', 'sonstiges']);
export const keyStatusEnum = pgEnum('key_status', ['vorhanden', 'ausgegeben', 'verloren', 'gesperrt']);

// ── Documents ────────────────────────────────────────────────────────────
export const documentCategoryEnum = pgEnum('document_category', [
  'vertrag', 'rechnung', 'bescheid', 'protokoll', 'korrespondenz',
  'abrechnung', 'mahnung', 'kaution', 'uebergabe', 'sonstiges'
]);

// ── Commercial / Demo ────────────────────────────────────────────────────
export const demoStatusEnum = pgEnum('demo_status', ['pending', 'activated', 'expired', 'converted']);
export const whiteLabelInquiryStatusEnum = pgEnum('white_label_inquiry_status', ['neu', 'kontaktiert', 'demo_vereinbart', 'verhandlung', 'abgeschlossen', 'abgelehnt']);
export const whiteLabelLicenseStatusEnum = pgEnum('white_label_license_status', ['aktiv', 'gekuendigt', 'pausiert', 'abgelaufen']);
