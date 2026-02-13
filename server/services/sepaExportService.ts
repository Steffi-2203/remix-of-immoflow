import { db } from "../db";
import { tenants, units, properties, monthlyInvoices, bankAccounts, sepaCollections } from "@shared/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { format } from "date-fns";

interface SepaPayment {
  id: string;
  tenantId: string;
  tenantName: string;
  iban: string;
  bic: string;
  amount: number;
  reference: string;
  endToEndId: string;
  mandateId: string;
  mandateDate: string;
}

interface SepaTransfer {
  id: string;
  recipientName: string;
  iban: string;
  bic: string;
  amount: number;
  reference: string;
  endToEndId: string;
}

export class SepaExportService {
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private formatAmount(amount: number): string {
    return amount.toFixed(2);
  }

  private generateMessageId(): string {
    return `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
  }

  private generateEndToEndId(tenantId: string, invoiceMonth: number, invoiceYear: number): string {
    return `E2E-${invoiceYear}${String(invoiceMonth).padStart(2, '0')}-${tenantId.substr(0, 8)}`.toUpperCase();
  }

  async generateDirectDebitXml(
    organizationId: string,
    creditorName: string,
    creditorIban: string,
    creditorBic: string,
    creditorId: string,
    invoiceIds: string[]
  ): Promise<string> {
    const invoicesData = await db.select({
      invoice: monthlyInvoices,
      tenant: tenants,
      unit: units,
      property: properties,
    })
      .from(monthlyInvoices)
      .innerJoin(tenants, eq(monthlyInvoices.tenantId, tenants.id))
      .innerJoin(units, eq(tenants.unitId, units.id))
      .innerJoin(properties, eq(units.propertyId, properties.id))
      .where(and(
        inArray(monthlyInvoices.id, invoiceIds),
        eq(properties.organizationId, organizationId)
      ));

    const payments: SepaPayment[] = invoicesData
      .filter(d => d.tenant.iban)
      .map(d => ({
        id: d.invoice.id,
        tenantId: d.tenant.id,
        tenantName: `${d.tenant.vorname || ''} ${d.tenant.nachname || ''}`.trim() || 'Unbekannt',
        iban: d.tenant.iban!.replace(/\s/g, ''),
        bic: d.tenant.bic || 'NOTPROVIDED',
        amount: Number(d.invoice.gesamtbetrag) || 0,
        reference: `Miete ${d.invoice.month}/${d.invoice.year} - ${d.property.name} ${d.unit.topNummer}`,
        endToEndId: this.generateEndToEndId(d.tenant.id, d.invoice.month, d.invoice.year),
        mandateId: (d.tenant as any).sepaMandatReferenz || `SEPA-${d.tenant.id.substring(0, 16)}`,
        mandateDate: (d.tenant as any).sepaMandatDatum || format(new Date(d.tenant.createdAt || Date.now()), 'yyyy-MM-dd'),
      }));

    if (payments.length === 0) {
      throw new Error('Keine gültigen Lastschriften gefunden (IBAN fehlt bei allen Mietern)');
    }

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const messageId = this.generateMessageId();
    const creationDateTime = new Date().toISOString();
    const requestedCollectionDate = format(new Date(), 'yyyy-MM-dd');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${this.escapeXml(messageId)}</MsgId>
      <CreDtTm>${creationDateTime}</CreDtTm>
      <NbOfTxs>${payments.length}</NbOfTxs>
      <CtrlSum>${this.formatAmount(totalAmount)}</CtrlSum>
      <InitgPty>
        <Nm>${this.escapeXml(creditorName)}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${this.escapeXml(messageId)}-1</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <NbOfTxs>${payments.length}</NbOfTxs>
      <CtrlSum>${this.formatAmount(totalAmount)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
        <LclInstrm>
          <Cd>CORE</Cd>
        </LclInstrm>
        <SeqTp>RCUR</SeqTp>
      </PmtTpInf>
      <ReqdColltnDt>${requestedCollectionDate}</ReqdColltnDt>
      <Cdtr>
        <Nm>${this.escapeXml(creditorName)}</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${creditorIban.replace(/\s/g, '')}</IBAN>
        </Id>
      </CdtrAcct>
      <CdtrAgt>
        <FinInstnId>
          <BIC>${creditorBic}</BIC>
        </FinInstnId>
      </CdtrAgt>
      <ChrgBr>SLEV</ChrgBr>
      <CdtrSchmeId>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${this.escapeXml(creditorId)}</Id>
              <SchmeNm>
                <Prtry>SEPA</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </CdtrSchmeId>
${payments.map(p => `      <DrctDbtTxInf>
        <PmtId>
          <EndToEndId>${this.escapeXml(p.endToEndId)}</EndToEndId>
        </PmtId>
        <InstdAmt Ccy="EUR">${this.formatAmount(p.amount)}</InstdAmt>
        <DrctDbtTx>
          <MndtRltdInf>
            <MndtId>${this.escapeXml(p.mandateId)}</MndtId>
            <DtOfSgntr>${p.mandateDate}</DtOfSgntr>
          </MndtRltdInf>
        </DrctDbtTx>
        <DbtrAgt>
          <FinInstnId>
            <BIC>${p.bic}</BIC>
          </FinInstnId>
        </DbtrAgt>
        <Dbtr>
          <Nm>${this.escapeXml(p.tenantName)}</Nm>
        </Dbtr>
        <DbtrAcct>
          <Id>
            <IBAN>${p.iban}</IBAN>
          </Id>
        </DbtrAcct>
        <RmtInf>
          <Ustrd>${this.escapeXml(p.reference.substring(0, 140))}</Ustrd>
        </RmtInf>
      </DrctDbtTxInf>`).join('\n')}
    </PmtInf>
  </CstmrDrctDbtInitn>
</Document>`;
  }

  async generateCreditTransferXml(
    organizationId: string,
    debtorName: string,
    debtorIban: string,
    debtorBic: string,
    transfers: SepaTransfer[]
  ): Promise<string> {
    if (transfers.length === 0) {
      throw new Error('Keine Überweisungen angegeben');
    }

    const totalAmount = transfers.reduce((sum, t) => sum + t.amount, 0);
    const messageId = this.generateMessageId();
    const creationDateTime = new Date().toISOString();
    const requestedExecutionDate = format(new Date(), 'yyyy-MM-dd');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${this.escapeXml(messageId)}</MsgId>
      <CreDtTm>${creationDateTime}</CreDtTm>
      <NbOfTxs>${transfers.length}</NbOfTxs>
      <CtrlSum>${this.formatAmount(totalAmount)}</CtrlSum>
      <InitgPty>
        <Nm>${this.escapeXml(debtorName)}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${this.escapeXml(messageId)}-1</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${transfers.length}</NbOfTxs>
      <CtrlSum>${this.formatAmount(totalAmount)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>${requestedExecutionDate}</ReqdExctnDt>
      <Dbtr>
        <Nm>${this.escapeXml(debtorName)}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>${debtorIban.replace(/\s/g, '')}</IBAN>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <BIC>${debtorBic}</BIC>
        </FinInstnId>
      </DbtrAgt>
      <ChrgBr>SLEV</ChrgBr>
${transfers.map(t => `      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>${this.escapeXml(t.endToEndId)}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="EUR">${this.formatAmount(t.amount)}</InstdAmt>
        </Amt>
        <CdtrAgt>
          <FinInstnId>
            <BIC>${t.bic || 'NOTPROVIDED'}</BIC>
          </FinInstnId>
        </CdtrAgt>
        <Cdtr>
          <Nm>${this.escapeXml(t.recipientName)}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>${t.iban.replace(/\s/g, '')}</IBAN>
          </Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>${this.escapeXml(t.reference.substring(0, 140))}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>`).join('\n')}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
  }
}

export const sepaExportService = new SepaExportService();
