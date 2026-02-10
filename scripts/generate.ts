import { billingService } from "../server/billing/billing.service";
import { db } from "../server/db";
import { properties, invoiceLines, monthlyInvoices } from "@shared/schema";
import { eq, isNull, inArray, and } from "drizzle-orm";
import * as fs from "fs";

const args = process.argv.slice(2);
const getArg = (name: string) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split("=")[1] : null;
};

async function main() {
  const propertyId = getArg("property");
  const year = parseInt(getArg("year") || new Date().getFullYear().toString());
  const month = parseInt(getArg("month") || (new Date().getMonth() + 1).toString());

  let propertyIds: string[] = [];

  if (propertyId) {
    propertyIds = [propertyId];
  } else {
    const allProps = await db.select({ id: properties.id })
      .from(properties)
      .where(isNull(properties.deletedAt));
    propertyIds = allProps.map(p => p.id);
  }

  console.log(`Generate (PERSIST) für ${year}-${String(month).padStart(2, "0")}`);
  console.log(`Properties: ${propertyIds.length}`);

  const userId = getArg("user") || "e118c1df-eb5d-4939-960d-cdf61b56d6e4";
  
  const organizationId = getArg("org");
  if (!organizationId) {
    console.error("Fehler: --org=<organizationId> ist erforderlich");
    process.exit(1);
  }

  const result = await billingService.generateMonthlyInvoices({
    organizationId,
    userId,
    propertyIds,
    year,
    month,
    dryRun: false
  });

  fs.writeFileSync("generate.json", JSON.stringify(result, null, 2));
  console.log(`\nErgebnis gespeichert: generate.json`);

  if (result.success && result.runId) {
    console.log(`RunId: ${result.runId}`);
    console.log(`Rechnungen erstellt: ${result.count}`);
    
    const invoices = await db.select().from(monthlyInvoices)
      .where(and(
        eq(monthlyInvoices.year, year),
        eq(monthlyInvoices.month, month)
      ));
    
    const invoiceIds = invoices.map(inv => inv.id);
    
    if (invoiceIds.length > 0) {
      const lines = await db.select().from(invoiceLines)
        .where(inArray(invoiceLines.invoiceId, invoiceIds));
      
      fs.writeFileSync("invoice_lines_run.json", JSON.stringify({
        runId: result.runId,
        period: `${year}-${String(month).padStart(2, "0")}`,
        invoiceCount: invoices.length,
        lineCount: lines.length,
        invoices,
        lines
      }, null, 2));
      console.log(`Invoice Lines gespeichert: invoice_lines_run.json (${lines.length} Zeilen)`);
    }
  } else {
    console.log("Fehler oder keine Rechnungen:", result);
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Fehler:", err);
  process.exit(1);
});
