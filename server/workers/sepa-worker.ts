import { eq } from "drizzle-orm";
import { db } from "../db";
import { sepaBatches } from "../db/models/sepa_batches";
import { registerJobHandler } from "./worker-template";
import { submitSepaBatchSandbox } from "../adapters/sepa/psp-sandbox";
import { createAuditLog } from "../lib/auditLog";
import { sepaExportService } from "../services/sepaExportService";
import type { Trace } from "../lib/tracing";

/**
 * SEPA Export Worker
 *
 * Processes sepa_export jobs from the PostgreSQL job queue.
 * Generates SEPA XML, persists the batch, and submits to PSP.
 */

interface SepaJobPayload {
  batchId: string;
  organizationId: string;
  propertyId?: string;
  invoiceIds: string[];
  creditorName: string;
  creditorIban: string;
  creditorBic: string;
  creditorId: string;
  _jobId?: string;
  _traceId?: string;
}

export function registerSepaWorker() {
  registerJobHandler("sepa_export", async (payload, trace) => {
    const data = payload as unknown as SepaJobPayload;
    const { batchId, organizationId, propertyId, invoiceIds, creditorName, creditorIban, creditorBic, creditorId } = data;

    // 1. Idempotency: check if batch already submitted
    const span1 = trace.startSpan("sepa.idempotency_check");
    const existing = await db.select().from(sepaBatches).where(eq(sepaBatches.batchId, batchId)).limit(1);
    if (existing.length > 0 && existing[0].status === "submitted") {
      span1.setAttribute("skipped", true);
      span1.end();
      return { skipped: true, reason: "already_submitted" };
    }
    span1.end();

    // 2. Generate SEPA XML using existing service
    const span2 = trace.startSpan("sepa.generate_xml");
    const xml = await sepaExportService.generateDirectDebitXml(
      organizationId,
      creditorName,
      creditorIban,
      creditorBic,
      creditorId,
      invoiceIds
    );
    span2.setAttribute("xml_length", xml.length);
    span2.setAttribute("invoice_count", invoiceIds.length);
    span2.end();

    // 3. Persist prepared batch
    const span3 = trace.startSpan("sepa.persist_batch");
    await db.insert(sepaBatches).values({
      batchId,
      organizationId,
      propertyId: propertyId || null,
      status: "prepared",
      xml,
    }).onConflictDoUpdate({
      target: sepaBatches.batchId,
      set: { xml, status: "prepared", updatedAt: new Date() },
    });
    span3.end();

    await createAuditLog({
      tableName: "sepa_batches",
      recordId: batchId,
      action: "create",
      newData: { event: "sepa_prepared", invoiceCount: invoiceIds.length },
    });

    // 4. Submit to PSP
    const span4 = trace.startSpan("sepa.psp_submit");
    const res = await submitSepaBatchSandbox(xml);

    if (!res.ok) {
      await db.update(sepaBatches)
        .set({ status: "failed", pspResponse: res.body, updatedAt: new Date() })
        .where(eq(sepaBatches.batchId, batchId));

      await createAuditLog({
        tableName: "sepa_batches",
        recordId: batchId,
        action: "update",
        newData: { event: "sepa_submit_failed", pspStatus: res.status },
      });

      span4.setStatus("error", `PSP returned ${res.status}`);
      span4.end();
      throw new Error(`SEPA submit failed: ${JSON.stringify(res.body)}`);
    }

    // 5. Mark submitted
    await db.update(sepaBatches)
      .set({
        status: "submitted",
        pspResponse: res.body,
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(sepaBatches.batchId, batchId));

    await createAuditLog({
      tableName: "sepa_batches",
      recordId: batchId,
      action: "update",
      newData: { event: "sepa_submitted", pspBatchId: res.body.pspBatchId },
    });

    span4.end();

    return {
      batchId,
      pspBatchId: res.body.pspBatchId,
      invoiceCount: invoiceIds.length,
    };
  });
}
