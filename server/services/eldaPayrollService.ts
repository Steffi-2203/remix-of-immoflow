/**
 * ELDA/ÖGK Payroll Service
 * Austrian social security calculation and ELDA-XML generation
 * Based on Austrian SV rates 2025/2026
 */

// ── SV-Sätze 2025/2026 ──────────────────────────────────────────────────
const SV_RATES = {
  // Geringfügigkeitsgrenze 2025
  geringfuegigkeitsgrenze: 518.44,

  // Dienstnehmeranteil (DN) - 18,12%
  dn: {
    kv: 0.0387,   // Krankenversicherung
    pv: 0.1025,   // Pensionsversicherung
    av: 0.03,     // Arbeitslosenversicherung
    ak: 0.005,    // Arbeiterkammer-Umlage
    wf: 0.005,    // Wohnbauförderung
    get total() { return this.kv + this.pv + this.av + this.ak + this.wf; }, // 0.1812
  },

  // Dienstgeberanteil (DG) - 21,23%
  dg: {
    kv: 0.0378,   // Krankenversicherung
    pv: 0.1255,   // Pensionsversicherung
    av: 0.03,     // Arbeitslosenversicherung
    uv: 0.011,    // Unfallversicherung
    iesg: 0.002,  // Insolvenz-Entgeltsicherung
    wf: 0.006,    // Wohnbauförderung
    get total() { return this.kv + this.pv + this.av + this.uv + this.iesg + this.wf; }, // 0.2123
  },

  // Lohnnebenkosten
  db: 0.037,          // Dienstgeberbeitrag (FLAF)
  dz_wien: 0.0036,    // Zuschlag zum DB (Wien)
  kommunalsteuer: 0.03, // Kommunalsteuer
  mvk: 0.0153,        // Mitarbeitervorsorgekasse (ab 2. Monat)

  // Höchstbeitragsgrundlage monatlich 2025
  hoechstbeitragsgrundlage: 6060,
} as const;

// ── Simplified Lohnsteuer brackets 2025 (monthly) ────────────────────────
function calculateLohnsteuer(brutto: number, svDn: number): number {
  const bemessungsgrundlage = brutto - svDn;
  if (bemessungsgrundlage <= 0) return 0;

  // Annualized for bracket calculation
  const annual = bemessungsgrundlage * 12;
  let tax = 0;

  if (annual <= 12816) {
    tax = 0;
  } else if (annual <= 20818) {
    tax = (annual - 12816) * 0.20;
  } else if (annual <= 34513) {
    tax = 1600.40 + (annual - 20818) * 0.30;
  } else if (annual <= 66612) {
    tax = 5709.10 + (annual - 34513) * 0.40;
  } else if (annual <= 99266) {
    tax = 18548.70 + (annual - 66612) * 0.48;
  } else if (annual <= 1000000) {
    tax = 34222.62 + (annual - 99266) * 0.50;
  } else {
    tax = 484589.62 + (annual - 1000000) * 0.55;
  }

  // Monthly
  return roundCents(tax / 12);
}

function roundCents(v: number): number {
  return Math.round(v * 100) / 100;
}

export interface PayrollCalculation {
  bruttolohn: number;
  sv_dn: number;
  sv_dg: number;
  lohnsteuer: number;
  db_beitrag: number;
  dz_beitrag: number;
  kommunalsteuer: number;
  mvk_beitrag: number;
  nettolohn: number;
  gesamtkosten_dg: number;
  ist_geringfuegig: boolean;
}

/**
 * Calculate a full payroll for a given gross salary.
 * For geringfügig employees, SV-DN is not deducted (only UV from DG side).
 */
export function calculatePayroll(
  bruttolohn: number,
  beschaeftigungsart: 'geringfuegig' | 'teilzeit' | 'vollzeit',
  bundesland: string = 'wien',
): PayrollCalculation {
  const istGeringfuegig = beschaeftigungsart === 'geringfuegig'
    || bruttolohn <= SV_RATES.geringfuegigkeitsgrenze;

  // Cap at Höchstbeitragsgrundlage
  const beitragsgrundlage = Math.min(bruttolohn, SV_RATES.hoechstbeitragsgrundlage);

  let svDn: number;
  let svDg: number;
  let lohnsteuer: number;
  let dbBeitrag: number;
  let dzBeitrag: number;
  let kommunalsteuer: number;
  let mvkBeitrag: number;

  if (istGeringfuegig) {
    // Geringfügig: no SV-DN, DG pays only UV (1,1%) + pauschale
    svDn = 0;
    svDg = roundCents(beitragsgrundlage * SV_RATES.dg.uv);
    lohnsteuer = 0;
    dbBeitrag = 0;
    dzBeitrag = 0;
    kommunalsteuer = 0;
    mvkBeitrag = roundCents(beitragsgrundlage * SV_RATES.mvk);
  } else {
    svDn = roundCents(beitragsgrundlage * SV_RATES.dn.total);
    svDg = roundCents(beitragsgrundlage * SV_RATES.dg.total);
    lohnsteuer = calculateLohnsteuer(bruttolohn, svDn);
    dbBeitrag = roundCents(bruttolohn * SV_RATES.db);
    dzBeitrag = roundCents(bruttolohn * (bundesland === 'wien' ? SV_RATES.dz_wien : 0.0036));
    kommunalsteuer = roundCents(bruttolohn * SV_RATES.kommunalsteuer);
    mvkBeitrag = roundCents(beitragsgrundlage * SV_RATES.mvk);
  }

  const nettolohn = roundCents(bruttolohn - svDn - lohnsteuer);
  const gesamtkostenDg = roundCents(bruttolohn + svDg + dbBeitrag + dzBeitrag + kommunalsteuer + mvkBeitrag);

  return {
    bruttolohn: roundCents(bruttolohn),
    sv_dn: svDn,
    sv_dg: svDg,
    lohnsteuer,
    db_beitrag: dbBeitrag,
    dz_beitrag: dzBeitrag,
    kommunalsteuer,
    mvk_beitrag: mvkBeitrag,
    nettolohn,
    gesamtkosten_dg: gesamtkostenDg,
    ist_geringfuegig: istGeringfuegig,
  };
}

// ── ELDA XML Generation ──────────────────────────────────────────────────

interface EmployeeData {
  vorname: string;
  nachname: string;
  svnr: string;
  geburtsdatum: string;
  adresse: string;
  plz: string;
  ort: string;
  eintrittsdatum: string;
  austrittsdatum?: string;
  beschaeftigungsart: string;
  bruttolohn_monatlich: number;
}

interface OrgData {
  name: string;
  dienstgeber_kontonummer?: string;
}

export function generateEldaAnmeldungXml(employee: EmployeeData, org: OrgData): string {
  const now = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<ELDA xmlns="http://www.elda.at/schema/2024">
  <Kopfdaten>
    <Meldungsart>ANMELDUNG</Meldungsart>
    <Erstellungsdatum>${now}</Erstellungsdatum>
    <Dienstgeber>
      <Name>${escapeXml(org.name)}</Name>
      <Kontonummer>${escapeXml(org.dienstgeber_kontonummer || '')}</Kontonummer>
    </Dienstgeber>
  </Kopfdaten>
  <Versicherter>
    <SVNR>${escapeXml(employee.svnr)}</SVNR>
    <Vorname>${escapeXml(employee.vorname)}</Vorname>
    <Nachname>${escapeXml(employee.nachname)}</Nachname>
    <Geburtsdatum>${employee.geburtsdatum}</Geburtsdatum>
    <Adresse>
      <Strasse>${escapeXml(employee.adresse)}</Strasse>
      <PLZ>${escapeXml(employee.plz)}</PLZ>
      <Ort>${escapeXml(employee.ort)}</Ort>
    </Adresse>
    <Beschaeftigungsbeginn>${employee.eintrittsdatum}</Beschaeftigungsbeginn>
    <Beschaeftigungsart>${employee.beschaeftigungsart.toUpperCase()}</Beschaeftigungsart>
    <Beitragsgrundlage>${employee.bruttolohn_monatlich.toFixed(2)}</Beitragsgrundlage>
  </Versicherter>
</ELDA>`;
}

export function generateEldaAbmeldungXml(employee: EmployeeData, org: OrgData): string {
  const now = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<ELDA xmlns="http://www.elda.at/schema/2024">
  <Kopfdaten>
    <Meldungsart>ABMELDUNG</Meldungsart>
    <Erstellungsdatum>${now}</Erstellungsdatum>
    <Dienstgeber>
      <Name>${escapeXml(org.name)}</Name>
      <Kontonummer>${escapeXml(org.dienstgeber_kontonummer || '')}</Kontonummer>
    </Dienstgeber>
  </Kopfdaten>
  <Versicherter>
    <SVNR>${escapeXml(employee.svnr)}</SVNR>
    <Vorname>${escapeXml(employee.vorname)}</Vorname>
    <Nachname>${escapeXml(employee.nachname)}</Nachname>
    <Beschaeftigungsende>${employee.austrittsdatum || now}</Beschaeftigungsende>
    <Abmeldegrund>ENDE_DIENSTVERHAELTNIS</Abmeldegrund>
  </Versicherter>
</ELDA>`;
}

export function generateBeitragsgrundlageXml(
  employees: Array<EmployeeData & { payroll: PayrollCalculation }>,
  org: OrgData,
  year: number,
  month: number,
): string {
  const now = new Date().toISOString().slice(0, 10);
  const zeitraum = `${year}-${String(month).padStart(2, '0')}`;

  const versicherteXml = employees.map(emp => `
    <Versicherter>
      <SVNR>${escapeXml(emp.svnr)}</SVNR>
      <Vorname>${escapeXml(emp.vorname)}</Vorname>
      <Nachname>${escapeXml(emp.nachname)}</Nachname>
      <Beitragsgrundlage>${emp.payroll.bruttolohn.toFixed(2)}</Beitragsgrundlage>
      <SVBeitragDN>${emp.payroll.sv_dn.toFixed(2)}</SVBeitragDN>
      <SVBeitragDG>${emp.payroll.sv_dg.toFixed(2)}</SVBeitragDG>
    </Versicherter>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ELDA xmlns="http://www.elda.at/schema/2024">
  <Kopfdaten>
    <Meldungsart>BEITRAGSGRUNDLAGENMELDUNG</Meldungsart>
    <Erstellungsdatum>${now}</Erstellungsdatum>
    <Zeitraum>${zeitraum}</Zeitraum>
    <Dienstgeber>
      <Name>${escapeXml(org.name)}</Name>
      <Kontonummer>${escapeXml(org.dienstgeber_kontonummer || '')}</Kontonummer>
    </Dienstgeber>
  </Kopfdaten>
  <Versicherte>${versicherteXml}
  </Versicherte>
</ELDA>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
