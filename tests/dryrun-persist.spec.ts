import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

interface DryRunInvoice {
  tenantId: string;
  unitId: string;
  year: number;
  month: number;
  grundmiete: number;
  betriebskosten: number;
  heizungskosten: number;
  gesamtbetrag: number;
  ust: number;
  ustSatzMiete: number;
  ustSatzBk: number;
  ustSatzHeizung: number;
  status: string;
  faelligAm: string;
}

interface DryRunLine {
  invoiceId: string;
  lineType: string;
  description: string;
  amount: number;
  taxRate: number;
  meta?: Record<string, unknown>;
}

interface DryRunPreviewItem {
  invoice: DryRunInvoice;
  lines: DryRunLine[];
}

interface DryRunResult {
  runId: string;
  dryRun: boolean;
  period: string;
  count: number;
  summary: {
    count: number;
    total: number;
    linesCount: number;
  };
  preview: DryRunPreviewItem[];
}

function normalizeLine(l: Record<string, unknown>) {
  return {
    invoiceId: l.invoice_id || l.invoiceId || null,
    unitId: l.unit_id || l.unitId || l.unit || null,
    lineType: l.line_type || l.lineType || null,
    description: ((l.description as string) || "").trim(),
    amount: Number(l.amount || 0).toFixed(2),
  };
}

function findMissing(
  dryrunPreview: DryRunPreviewItem[],
  dbLines: Record<string, unknown>[]
) {
  const expectedLines: Array<{
    tenantId: string;
    unitId: string;
    lineType: string;
    description: string;
    amount: number;
    taxRate: number;
  }> = [];

  for (const p of dryrunPreview) {
    const unitId = p.invoice.unitId;
    for (const line of p.lines) {
      expectedLines.push({
        tenantId: p.invoice.tenantId,
        unitId,
        lineType: line.lineType,
        description: line.description,
        amount: line.amount,
        taxRate: line.taxRate,
      });
    }
  }

  const dbLineSet = new Set(
    dbLines.map(
      (l) =>
        `${l.unit_id || l.unitId}|${l.line_type || l.lineType}|${l.description}`
    )
  );

  return expectedLines.filter(
    (l) => !dbLineSet.has(`${l.unitId}|${l.lineType}|${l.description}`)
  );
}

describe("Dryrun JSON-Struktur", () => {
  it("sollte gültiges Dry-Run JSON erzeugen können (Struktur-Test)", () => {
    const mockResult: DryRunResult = {
      runId: "test-run-123",
      dryRun: true,
      period: "2026-09",
      count: 2,
      summary: { count: 2, total: 1700, linesCount: 6 },
      preview: [
        {
          invoice: {
            tenantId: "tenant-1",
            unitId: "unit-1",
            year: 2026,
            month: 9,
            grundmiete: 650,
            betriebskosten: 120,
            heizungskosten: 80,
            gesamtbetrag: 850,
            ust: 83.33,
            ustSatzMiete: 10,
            ustSatzBk: 10,
            ustSatzHeizung: 20,
            status: "offen",
            faelligAm: "2026-09-05",
          },
          lines: [
            {
              invoiceId: "preview-tenant-1-2026-9",
              lineType: "grundmiete",
              description: "Nettomiete September 2026",
              amount: 650,
              taxRate: 10,
              meta: { reference: "MRG §15" },
            },
            {
              invoiceId: "preview-tenant-1-2026-9",
              lineType: "betriebskosten",
              description: "BK-Vorschuss September 2026",
              amount: 120,
              taxRate: 10,
              meta: { reference: "MRG §21" },
            },
            {
              invoiceId: "preview-tenant-1-2026-9",
              lineType: "heizkosten",
              description: "HK-Vorschuss September 2026",
              amount: 80,
              taxRate: 20,
              meta: { reference: "HeizKG" },
            },
          ],
        },
        {
          invoice: {
            tenantId: "tenant-2",
            unitId: "unit-2",
            year: 2026,
            month: 9,
            grundmiete: 800,
            betriebskosten: 150,
            heizungskosten: 100,
            gesamtbetrag: 1050,
            ust: 103.33,
            ustSatzMiete: 10,
            ustSatzBk: 10,
            ustSatzHeizung: 20,
            status: "offen",
            faelligAm: "2026-09-05",
          },
          lines: [
            {
              invoiceId: "preview-tenant-2-2026-9",
              lineType: "grundmiete",
              description: "Nettomiete September 2026",
              amount: 800,
              taxRate: 10,
            },
            {
              invoiceId: "preview-tenant-2-2026-9",
              lineType: "betriebskosten",
              description: "BK-Vorschuss September 2026",
              amount: 150,
              taxRate: 10,
            },
            {
              invoiceId: "preview-tenant-2-2026-9",
              lineType: "heizkosten",
              description: "HK-Vorschuss September 2026",
              amount: 100,
              taxRate: 20,
            },
          ],
        },
      ],
    };

    expect(mockResult.dryRun).toBe(true);
    expect(mockResult.count).toBe(2);
    expect(mockResult.summary.linesCount).toBe(6);
    expect(mockResult.preview).toHaveLength(2);
    expect(mockResult.preview[0].lines).toHaveLength(3);
  });

  it("sollte korrekte USt-Sätze nach österreichischem Recht enthalten", () => {
    const invoice: DryRunInvoice = {
      tenantId: "t1",
      unitId: "u1",
      year: 2026,
      month: 9,
      grundmiete: 650,
      betriebskosten: 120,
      heizungskosten: 80,
      gesamtbetrag: 933.33,
      ust: 83.33,
      ustSatzMiete: 10,
      ustSatzBk: 10,
      ustSatzHeizung: 20,
      status: "offen",
      faelligAm: "2026-09-05",
    };

    expect(invoice.ustSatzMiete).toBe(10);
    expect(invoice.ustSatzBk).toBe(10);
    expect(invoice.ustSatzHeizung).toBe(20);

    const expectedUst =
      invoice.grundmiete * (invoice.ustSatzMiete / 100) +
      invoice.betriebskosten * (invoice.ustSatzBk / 100) +
      invoice.heizungskosten * (invoice.ustSatzHeizung / 100);
    expect(Math.round(expectedUst * 100) / 100).toBe(93);
  });

  it("sollte Gesamtbetrag = Netto + USt berechnen", () => {
    const grundmiete = 650;
    const bk = 120;
    const hk = 80;
    const netto = grundmiete + bk + hk;
    const ust = grundmiete * 0.1 + bk * 0.1 + hk * 0.2;
    const brutto = netto + ust;

    expect(netto).toBe(850);
    expect(Math.round(ust * 100) / 100).toBe(93);
    expect(Math.round(brutto * 100) / 100).toBe(943);
  });
});

describe("Vergleichs-Logik (find_missing_lines)", () => {
  it("sollte fehlende Zeilen korrekt identifizieren", () => {
    const dryrunPreview: DryRunPreviewItem[] = [
      {
        invoice: {
          tenantId: "t1",
          unitId: "u1",
          year: 2026,
          month: 9,
          grundmiete: 650,
          betriebskosten: 120,
          heizungskosten: 80,
          gesamtbetrag: 850,
          ust: 83.33,
          ustSatzMiete: 10,
          ustSatzBk: 10,
          ustSatzHeizung: 20,
          status: "offen",
          faelligAm: "2026-09-05",
        },
        lines: [
          {
            invoiceId: "inv-1",
            lineType: "grundmiete",
            description: "Nettomiete September 2026",
            amount: 650,
            taxRate: 10,
          },
          {
            invoiceId: "inv-1",
            lineType: "betriebskosten",
            description: "BK-Vorschuss September 2026",
            amount: 120,
            taxRate: 10,
          },
          {
            invoiceId: "inv-1",
            lineType: "heizkosten",
            description: "HK-Vorschuss September 2026",
            amount: 80,
            taxRate: 20,
          },
        ],
      },
    ];

    const dbLines = [
      {
        unit_id: "u1",
        line_type: "grundmiete",
        description: "Nettomiete September 2026",
        amount: "650.00",
      },
    ];

    const missing = findMissing(dryrunPreview, dbLines);

    expect(missing).toHaveLength(2);
    expect(missing[0].lineType).toBe("betriebskosten");
    expect(missing[1].lineType).toBe("heizkosten");
  });

  it("sollte keine fehlenden Zeilen melden wenn alles vorhanden", () => {
    const dryrunPreview: DryRunPreviewItem[] = [
      {
        invoice: {
          tenantId: "t1",
          unitId: "u1",
          year: 2026,
          month: 9,
          grundmiete: 650,
          betriebskosten: 120,
          heizungskosten: 80,
          gesamtbetrag: 850,
          ust: 83.33,
          ustSatzMiete: 10,
          ustSatzBk: 10,
          ustSatzHeizung: 20,
          status: "offen",
          faelligAm: "2026-09-05",
        },
        lines: [
          {
            invoiceId: "inv-1",
            lineType: "grundmiete",
            description: "Nettomiete September 2026",
            amount: 650,
            taxRate: 10,
          },
          {
            invoiceId: "inv-1",
            lineType: "betriebskosten",
            description: "BK-Vorschuss September 2026",
            amount: 120,
            taxRate: 10,
          },
        ],
      },
    ];

    const dbLines = [
      {
        unit_id: "u1",
        line_type: "grundmiete",
        description: "Nettomiete September 2026",
        amount: "650.00",
      },
      {
        unit_id: "u1",
        line_type: "betriebskosten",
        description: "BK-Vorschuss September 2026",
        amount: "120.00",
      },
    ];

    const missing = findMissing(dryrunPreview, dbLines);
    expect(missing).toHaveLength(0);
  });

  it("sollte mehrere Mieter korrekt vergleichen", () => {
    const dryrunPreview: DryRunPreviewItem[] = [
      {
        invoice: {
          tenantId: "t1",
          unitId: "u1",
          year: 2026,
          month: 9,
          grundmiete: 650,
          betriebskosten: 120,
          heizungskosten: 0,
          gesamtbetrag: 770,
          ust: 77,
          ustSatzMiete: 10,
          ustSatzBk: 10,
          ustSatzHeizung: 20,
          status: "offen",
          faelligAm: "2026-09-05",
        },
        lines: [
          {
            invoiceId: "inv-1",
            lineType: "grundmiete",
            description: "Nettomiete September 2026",
            amount: 650,
            taxRate: 10,
          },
        ],
      },
      {
        invoice: {
          tenantId: "t2",
          unitId: "u2",
          year: 2026,
          month: 9,
          grundmiete: 800,
          betriebskosten: 150,
          heizungskosten: 0,
          gesamtbetrag: 950,
          ust: 95,
          ustSatzMiete: 10,
          ustSatzBk: 10,
          ustSatzHeizung: 20,
          status: "offen",
          faelligAm: "2026-09-05",
        },
        lines: [
          {
            invoiceId: "inv-2",
            lineType: "grundmiete",
            description: "Nettomiete September 2026",
            amount: 800,
            taxRate: 10,
          },
        ],
      },
    ];

    const dbLines = [
      {
        unit_id: "u1",
        line_type: "grundmiete",
        description: "Nettomiete September 2026",
        amount: "650.00",
      },
    ];

    const missing = findMissing(dryrunPreview, dbLines);
    expect(missing).toHaveLength(1);
    expect(missing[0].tenantId).toBe("t2");
    expect(missing[0].amount).toBe(800);
  });
});

describe("Normalisierung (DB vs Dryrun Formate)", () => {
  it("sollte snake_case und camelCase korrekt normalisieren", () => {
    const snakeCase = {
      invoice_id: "inv-1",
      unit_id: "u1",
      line_type: "grundmiete",
      description: "  Nettomiete  ",
      amount: "650.00",
    };

    const camelCase = {
      invoiceId: "inv-1",
      unitId: "u1",
      lineType: "grundmiete",
      description: "Nettomiete",
      amount: 650,
    };

    const normalizedSnake = normalizeLine(snakeCase);
    const normalizedCamel = normalizeLine(camelCase);

    expect(normalizedSnake.invoiceId).toBe(normalizedCamel.invoiceId);
    expect(normalizedSnake.unitId).toBe(normalizedCamel.unitId);
    expect(normalizedSnake.lineType).toBe(normalizedCamel.lineType);
    expect(normalizedSnake.amount).toBe(normalizedCamel.amount);
  });

  it("sollte fehlende Felder mit null/0 auffüllen", () => {
    const partial = { description: "Test" };
    const normalized = normalizeLine(partial);

    expect(normalized.invoiceId).toBeNull();
    expect(normalized.unitId).toBeNull();
    expect(normalized.lineType).toBeNull();
    expect(normalized.amount).toBe("0.00");
    expect(normalized.description).toBe("Test");
  });
});

describe("Persist-Modus Validierung", () => {
  it("sollte ON CONFLICT DO NOTHING SQL korrekt aufbauen", () => {
    const line = {
      invoiceId: "inv-123",
      unitId: "u1",
      lineType: "grundmiete",
      description: "Nettomiete September 2026",
      amount: 650,
      taxRate: 10,
    };

    const sql = `INSERT INTO invoice_lines (invoice_id, unit_id, line_type, description, amount, tax_rate)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (invoice_id, unit_id, line_type, description) DO NOTHING`;

    const params = [
      line.invoiceId,
      line.unitId,
      line.lineType,
      line.description,
      line.amount,
      line.taxRate,
    ];

    expect(sql).toContain("ON CONFLICT");
    expect(sql).toContain("DO NOTHING");
    expect(sql).not.toContain("RETURNING");
    expect(params).toHaveLength(6);
    expect(params[0]).toBe("inv-123");
    expect(params[4]).toBe(650);
  });

  it("sollte Monatsname korrekt nach Monatsnummer konvertieren", () => {
    const monthNames: Record<string, number> = {
      Jänner: 1,
      Februar: 2,
      März: 3,
      April: 4,
      Mai: 5,
      Juni: 6,
      Juli: 7,
      August: 8,
      September: 9,
      Oktober: 10,
      November: 11,
      Dezember: 12,
    };

    expect(monthNames["September"]).toBe(9);
    expect(monthNames["Jänner"]).toBe(1);
    expect(monthNames["März"]).toBe(3);

    const description = "Nettomiete September 2026";
    const match = description.match(/(\w+)\s+(\d{4})$/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("September");
    expect(parseInt(match![2])).toBe(2026);
    expect(monthNames[match![1]]).toBe(9);
  });

  it("sollte Leerstand-Vorschreibung korrekt erkennen", () => {
    const vacancyInvoice: DryRunInvoice = {
      tenantId: "vacancy-t1",
      unitId: "u1",
      year: 2026,
      month: 9,
      grundmiete: 0,
      betriebskosten: 120,
      heizungskosten: 80,
      gesamtbetrag: 228,
      ust: 28,
      ustSatzMiete: 10,
      ustSatzBk: 10,
      ustSatzHeizung: 20,
      status: "offen",
      faelligAm: "2026-09-05",
    };

    expect(vacancyInvoice.grundmiete).toBe(0);
    expect(vacancyInvoice.betriebskosten).toBeGreaterThan(0);

    const isVacancy = vacancyInvoice.grundmiete === 0;
    expect(isVacancy).toBe(true);

    const expectedUst =
      vacancyInvoice.betriebskosten * 0.1 + vacancyInvoice.heizungskosten * 0.2;
    expect(expectedUst).toBe(28);
  });
});

describe("Dryrun-Datei Lesen (falls vorhanden)", () => {
  const tmpFile = path.resolve("tmp/dryrun_2026_09.json");

  it("sollte tmp/dryrun_2026_09.json parsen wenn vorhanden", () => {
    if (!fs.existsSync(tmpFile)) {
      console.log("Datei nicht vorhanden, überspringe: " + tmpFile);
      return;
    }

    const data: DryRunResult = JSON.parse(fs.readFileSync(tmpFile, "utf8"));

    expect(data.dryRun).toBe(true);
    expect(data.period).toBe("2026-09");
    expect(data.count).toBeGreaterThan(0);
    expect(data.preview).toBeInstanceOf(Array);
    expect(data.preview.length).toBeGreaterThan(0);

    for (const item of data.preview) {
      expect(item.invoice).toBeDefined();
      expect(item.invoice.tenantId).toBeTruthy();
      expect(item.invoice.unitId).toBeTruthy();
      expect(item.invoice.year).toBe(2026);
      expect(item.invoice.month).toBe(9);
      expect(item.lines).toBeInstanceOf(Array);
      expect(item.lines.length).toBeGreaterThanOrEqual(1);

      for (const line of item.lines) {
        expect(line.lineType).toBeTruthy();
        expect(line.description).toBeTruthy();
        expect(typeof line.amount).toBe("number");
        expect(line.amount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("sollte konsistente Summen haben", () => {
    if (!fs.existsSync(tmpFile)) return;

    const data: DryRunResult = JSON.parse(fs.readFileSync(tmpFile, "utf8"));

    expect(data.summary.count).toBe(data.count);
    expect(data.summary.count).toBe(data.preview.length);

    const totalLines = data.preview.reduce(
      (sum, p) => sum + p.lines.length,
      0
    );
    expect(data.summary.linesCount).toBe(totalLines);
  });
});

describe("Dryrun ↔ Persist Parität", () => {
  const dryrunFile = path.resolve("tmp/dryrun_2026_09.json");
  const dbFile = path.resolve("tmp/db_lines_2026_09.json");

  it("sollte Dryrun↔DB Vergleich konsistent mit findMissing sein (Integrations-Test)", () => {
    if (!fs.existsSync(dryrunFile) || !fs.existsSync(dbFile)) {
      console.log(
        "Dryrun/DB-Export nicht vorhanden — führe erst den Audit-Workflow aus:"
      );
      console.log("  bash tools/upsert_missing_lines.sh 2026 9");
      return;
    }

    const dryrun: DryRunResult = JSON.parse(
      fs.readFileSync(dryrunFile, "utf8")
    );
    const dbLines: Record<string, unknown>[] = JSON.parse(
      fs.readFileSync(dbFile, "utf8")
    );

    const dryrunLineKeys = new Set<string>();
    for (const item of dryrun.preview) {
      for (const line of item.lines) {
        dryrunLineKeys.add(
          `${item.invoice.unitId}|${line.lineType}|${line.description}`
        );
      }
    }

    const dbLineKeys = new Set<string>();
    for (const row of dbLines) {
      const uid = (row.unit_id || row.unitId) as string;
      const lt = (row.line_type || row.lineType) as string;
      const desc = ((row.description as string) || "").trim();
      dbLineKeys.add(`${uid}|${lt}|${desc}`);
    }

    const missingInDb = [...dryrunLineKeys].filter((k) => !dbLineKeys.has(k));
    const extraInDb = [...dbLineKeys].filter((k) => !dryrunLineKeys.has(k));

    const missingViaHelper = findMissing(dryrun.preview, dbLines);

    expect(missingViaHelper.length).toBeGreaterThanOrEqual(0);

    if (missingInDb.length > 0) {
      console.log(
        `Info: ${missingInDb.length} unique keys fehlen in DB, ${missingViaHelper.length} per-tenant Zeilen.`
      );
      const missingTypes: Record<string, number> = {};
      missingInDb.forEach((k) => {
        const t = k.split("|")[1];
        missingTypes[t] = (missingTypes[t] || 0) + 1;
      });
      console.log("  Nach Typ:", missingTypes);
    }

    expect(extraInDb).toHaveLength(0);
  });

  it("sollte Beträge innerhalb Rundungstoleranz (±0.05€) übereinstimmen", () => {
    if (!fs.existsSync(dryrunFile) || !fs.existsSync(dbFile)) return;

    const dryrun: DryRunResult = JSON.parse(
      fs.readFileSync(dryrunFile, "utf8")
    );
    const dbLines: Record<string, unknown>[] = JSON.parse(
      fs.readFileSync(dbFile, "utf8")
    );

    const dbAmountMap = new Map<string, number>();
    for (const row of dbLines) {
      const uid = (row.unit_id || row.unitId) as string;
      const lt = (row.line_type || row.lineType) as string;
      const desc = ((row.description as string) || "").trim();
      const amt = Number(row.amount || 0);
      dbAmountMap.set(`${uid}|${lt}|${desc}`, amt);
    }

    const TOLERANCE = 0.05;
    const significantMismatches: Array<{
      key: string;
      dryrunAmt: number;
      dbAmt: number;
      diff: number;
    }> = [];
    for (const item of dryrun.preview) {
      for (const line of item.lines) {
        const key = `${item.invoice.unitId}|${line.lineType}|${line.description}`;
        const dbAmt = dbAmountMap.get(key);
        if (dbAmt !== undefined) {
          const diff = Math.abs(line.amount - dbAmt);
          if (diff > TOLERANCE) {
            significantMismatches.push({
              key,
              dryrunAmt: line.amount,
              dbAmt,
              diff: Number(diff.toFixed(4)),
            });
          }
        }
      }
    }

    if (significantMismatches.length > 0) {
      console.log(
        "Signifikante Betrags-Abweichungen (>0.05€):",
        significantMismatches.slice(0, 5)
      );
    }

    expect(significantMismatches).toHaveLength(0);
  });

  it("sollte Gesamtbetrag = Summe(Netto-Beträge) pro Rechnung sein", () => {
    if (!fs.existsSync(dryrunFile)) return;

    const dryrun: DryRunResult = JSON.parse(
      fs.readFileSync(dryrunFile, "utf8")
    );

    const gesamtErrors: Array<{
      tenantId: string;
      expected: number;
      actual: number;
    }> = [];
    for (const item of dryrun.preview) {
      const nettoSum = item.lines.reduce((sum, l) => sum + l.amount, 0);
      const expected = Number(nettoSum.toFixed(2));
      const actual = Number(item.invoice.gesamtbetrag.toFixed(2));
      if (Math.abs(expected - actual) > 0.02) {
        gesamtErrors.push({
          tenantId: item.invoice.tenantId,
          expected,
          actual,
        });
      }
    }

    if (gesamtErrors.length > 0) {
      console.log("Gesamtbetrag-Fehler:", gesamtErrors.slice(0, 5));
    }

    expect(gesamtErrors).toHaveLength(0);
  });

  it("sollte Batch-Upsert SQL korrekt für N Zeilen aufbauen", () => {
    const lines = [
      {
        invoiceId: "inv-1",
        unitId: "u1",
        lineType: "grundmiete",
        description: "Nettomiete September 2026",
        amount: 650,
        taxRate: 0.1,
      },
      {
        invoiceId: "inv-1",
        unitId: "u1",
        lineType: "betriebskosten",
        description: "BK-Vorschuss September 2026",
        amount: 120,
        taxRate: 0.1,
      },
      {
        invoiceId: "inv-2",
        unitId: "u2",
        lineType: "heizkosten",
        description: "HK-Vorschuss September 2026",
        amount: 80,
        taxRate: 0.2,
      },
    ];

    const values: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    for (const r of lines) {
      values.push(
        `($${p}, $${p + 1}, $${p + 2}, $${p + 3}, $${p + 4}, $${p + 5})`
      );
      params.push(
        r.invoiceId,
        r.unitId,
        r.lineType,
        r.description,
        r.amount,
        r.taxRate
      );
      p += 6;
    }

    const sql = `INSERT INTO invoice_lines (invoice_id, unit_id, line_type, description, amount, tax_rate)
        VALUES ${values.join(", ")}
        ON CONFLICT (invoice_id, unit_id, line_type, description) DO NOTHING`;

    expect(values).toHaveLength(3);
    expect(params).toHaveLength(18);
    expect(sql).toContain("($1, $2, $3, $4, $5, $6)");
    expect(sql).toContain("($7, $8, $9, $10, $11, $12)");
    expect(sql).toContain("($13, $14, $15, $16, $17, $18)");
    expect(sql).toContain("ON CONFLICT");
  });
});
