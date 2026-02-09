import { describe, test, expect } from 'vitest';

/**
 * SEPA XML Structure Validation Tests
 * Validates generated XML against ISO 20022 pain.008.001.02 (Direct Debit)
 * and pain.001.001.03 (Credit Transfer) structural requirements.
 *
 * Note: Full XSD validation would require an XML parser + XSD schema file.
 * These tests validate the critical structural constraints that banks check.
 */

function generateDirectDebitXml(payments: Array<{
  tenantName: string;
  iban: string;
  bic: string;
  amount: number;
  reference: string;
  endToEndId: string;
  mandateId: string;
}>, creditor: {
  name: string;
  iban: string;
  bic: string;
  creditorId: string;
}): string {
  const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const totalAmount = payments.reduce((s, p) => s + p.amount, 0);
  const msgId = `MSG-TEST-${Date.now()}`;
  const now = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${escapeXml(msgId)}</MsgId>
      <CreDtTm>${now}</CreDtTm>
      <NbOfTxs>${payments.length}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <InitgPty>
        <Nm>${escapeXml(creditor.name)}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${escapeXml(msgId)}-1</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <NbOfTxs>${payments.length}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl><Cd>SEPA</Cd></SvcLvl>
        <LclInstrm><Cd>CORE</Cd></LclInstrm>
        <SeqTp>RCUR</SeqTp>
      </PmtTpInf>
      <ReqdColltnDt>2025-02-15</ReqdColltnDt>
      <Cdtr><Nm>${escapeXml(creditor.name)}</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>${creditor.iban}</IBAN></Id></CdtrAcct>
      <CdtrAgt><FinInstnId><BIC>${creditor.bic}</BIC></FinInstnId></CdtrAgt>
      <ChrgBr>SLEV</ChrgBr>
      <CdtrSchmeId>
        <Id><PrvtId><Othr>
          <Id>${escapeXml(creditor.creditorId)}</Id>
          <SchmeNm><Prtry>SEPA</Prtry></SchmeNm>
        </Othr></PrvtId></Id>
      </CdtrSchmeId>
${payments.map(p => `      <DrctDbtTxInf>
        <PmtId><EndToEndId>${escapeXml(p.endToEndId)}</EndToEndId></PmtId>
        <InstdAmt Ccy="EUR">${p.amount.toFixed(2)}</InstdAmt>
        <DrctDbtTx><MndtRltdInf>
          <MndtId>${escapeXml(p.mandateId)}</MndtId>
          <DtOfSgntr>2020-01-01</DtOfSgntr>
        </MndtRltdInf></DrctDbtTx>
        <DbtrAgt><FinInstnId><BIC>${p.bic}</BIC></FinInstnId></DbtrAgt>
        <Dbtr><Nm>${escapeXml(p.tenantName)}</Nm></Dbtr>
        <DbtrAcct><Id><IBAN>${p.iban}</IBAN></Id></DbtrAcct>
        <RmtInf><Ustrd>${escapeXml(p.reference.substring(0, 140))}</Ustrd></RmtInf>
      </DrctDbtTxInf>`).join('\n')}
    </PmtInf>
  </CstmrDrctDbtInitn>
</Document>`;
}

const VALID_CREDITOR = {
  name: 'Hausverwaltung Muster GmbH',
  iban: 'AT611904300234573201',
  bic: 'BKAUATWW',
  creditorId: 'AT98ZZZ00000012345',
};

const VALID_PAYMENTS = [
  {
    tenantName: 'Max Mustermann',
    iban: 'AT483200000012345864',
    bic: 'RLNWATWW',
    amount: 850.50,
    reference: 'Miete 01/2025 - Hauptstr 1 Top 3',
    endToEndId: 'E2E-202501-ABCD1234',
    mandateId: 'MNDT-ABCD1234EF567890',
  },
  {
    tenantName: 'Anna Beispiel',
    iban: 'AT022011100000006789',
    bic: 'GIBAATWW',
    amount: 1200.00,
    reference: 'Miete 01/2025 - Hauptstr 1 Top 7',
    endToEndId: 'E2E-202501-EFGH5678',
    mandateId: 'MNDT-EFGH5678IJ901234',
  },
];

describe('SEPA XML – ISO 20022 Structural Validation', () => {
  const xml = generateDirectDebitXml(VALID_PAYMENTS, VALID_CREDITOR);

  test('contains correct XML declaration', () => {
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  });

  test('uses pain.008.001.02 namespace for direct debit', () => {
    expect(xml).toContain('urn:iso:std:iso:20022:tech:xsd:pain.008.001.02');
  });

  test('root element is Document > CstmrDrctDbtInitn', () => {
    expect(xml).toContain('<Document');
    expect(xml).toContain('<CstmrDrctDbtInitn>');
    expect(xml).toContain('</CstmrDrctDbtInitn>');
    expect(xml).toContain('</Document>');
  });

  test('GrpHdr contains required elements', () => {
    expect(xml).toMatch(/<MsgId>.+<\/MsgId>/);
    expect(xml).toMatch(/<CreDtTm>.+<\/CreDtTm>/);
    expect(xml).toMatch(/<NbOfTxs>2<\/NbOfTxs>/);
    expect(xml).toMatch(/<CtrlSum>2050\.50<\/CtrlSum>/);
    expect(xml).toMatch(/<InitgPty>\s*<Nm>.+<\/Nm>\s*<\/InitgPty>/);
  });

  test('PmtInf contains correct payment method DD', () => {
    expect(xml).toContain('<PmtMtd>DD</PmtMtd>');
  });

  test('PmtTpInf contains SEPA CORE RCUR', () => {
    expect(xml).toContain('<Cd>SEPA</Cd>');
    expect(xml).toContain('<Cd>CORE</Cd>');
    expect(xml).toContain('<SeqTp>RCUR</SeqTp>');
  });

  test('creditor IBAN format is valid (AT, 20 chars)', () => {
    const ibanMatch = xml.match(/<CdtrAcct><Id><IBAN>([^<]+)<\/IBAN>/);
    expect(ibanMatch).toBeTruthy();
    expect(ibanMatch![1]).toMatch(/^AT\d{18}$/);
  });

  test('each DrctDbtTxInf has required sub-elements', () => {
    const txCount = (xml.match(/<DrctDbtTxInf>/g) || []).length;
    expect(txCount).toBe(2);

    // Each tx must have EndToEndId, InstdAmt, MndtId, debtor IBAN
    const endToEndIds = xml.match(/<EndToEndId>[^<]+<\/EndToEndId>/g) || [];
    expect(endToEndIds.length).toBe(2);

    const amounts = xml.match(/<InstdAmt Ccy="EUR">[^<]+<\/InstdAmt>/g) || [];
    expect(amounts.length).toBe(2);
    expect(amounts[0]).toContain('850.50');
    expect(amounts[1]).toContain('1200.00');

    const mandateIds = xml.match(/<MndtId>[^<]+<\/MndtId>/g) || [];
    expect(mandateIds.length).toBe(2);
  });

  test('CtrlSum matches sum of individual amounts', () => {
    const ctrlSumMatch = xml.match(/<CtrlSum>([^<]+)<\/CtrlSum>/g) || [];
    // GrpHdr and PmtInf both have CtrlSum
    expect(ctrlSumMatch.length).toBe(2);
    for (const match of ctrlSumMatch) {
      const val = match.match(/<CtrlSum>([^<]+)<\/CtrlSum>/)![1];
      expect(parseFloat(val)).toBe(2050.50);
    }
  });

  test('NbOfTxs is consistent in GrpHdr and PmtInf', () => {
    const nbMatches = xml.match(/<NbOfTxs>(\d+)<\/NbOfTxs>/g) || [];
    expect(nbMatches.length).toBe(2);
    for (const match of nbMatches) {
      expect(match).toContain('2');
    }
  });

  test('amounts use 2 decimal places (bank requirement)', () => {
    const amounts = xml.match(/<InstdAmt Ccy="EUR">([^<]+)<\/InstdAmt>/g) || [];
    for (const amt of amounts) {
      const val = amt.match(/>([^<]+)</)?.[1];
      expect(val).toMatch(/^\d+\.\d{2}$/);
    }
  });

  test('reference (Ustrd) is max 140 chars', () => {
    const refs = xml.match(/<Ustrd>([^<]*)<\/Ustrd>/g) || [];
    expect(refs.length).toBe(2);
    for (const ref of refs) {
      const content = ref.match(/<Ustrd>([^<]*)<\/Ustrd>/)![1];
      expect(content.length).toBeLessThanOrEqual(140);
    }
  });

  test('XML special characters are escaped', () => {
    const xmlWithSpecial = generateDirectDebitXml([{
      tenantName: 'Müller & Söhne <GmbH>',
      iban: 'AT483200000012345864',
      bic: 'RLNWATWW',
      amount: 500,
      reference: 'Test "Sonderzeichen" & <mehr>',
      endToEndId: 'E2E-TEST',
      mandateId: 'MNDT-TEST',
    }], VALID_CREDITOR);

    expect(xmlWithSpecial).toContain('Müller &amp; Söhne &lt;GmbH&gt;');
    expect(xmlWithSpecial).not.toContain('& Söhne');
    expect(xmlWithSpecial).toContain('&amp; &lt;mehr&gt;');
  });

  test('ChrgBr is SLEV (mandatory for SEPA)', () => {
    expect(xml).toContain('<ChrgBr>SLEV</ChrgBr>');
  });

  test('CdtrSchmeId contains creditor identifier', () => {
    expect(xml).toContain(`<Id>${VALID_CREDITOR.creditorId}</Id>`);
    expect(xml).toContain('<Prtry>SEPA</Prtry>');
  });

  test('ReqdColltnDt format is YYYY-MM-DD', () => {
    const dateMatch = xml.match(/<ReqdColltnDt>([^<]+)<\/ReqdColltnDt>/);
    expect(dateMatch).toBeTruthy();
    expect(dateMatch![1]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('SEPA XML – Edge Cases', () => {
  test('single payment generates valid structure', () => {
    const xml = generateDirectDebitXml([VALID_PAYMENTS[0]], VALID_CREDITOR);
    expect(xml).toContain('<NbOfTxs>1</NbOfTxs>');
    expect(xml).toContain('<CtrlSum>850.50</CtrlSum>');
    expect((xml.match(/<DrctDbtTxInf>/g) || []).length).toBe(1);
  });

  test('large batch (50 payments) generates correct totals', () => {
    const manyPayments = Array.from({ length: 50 }, (_, i) => ({
      tenantName: `Mieter ${i + 1}`,
      iban: `AT48320000001234${String(i).padStart(4, '0')}`,
      bic: 'RLNWATWW',
      amount: 100 + i,
      reference: `Miete ${i + 1}`,
      endToEndId: `E2E-${i}`,
      mandateId: `MNDT-${i}`,
    }));
    const xml = generateDirectDebitXml(manyPayments, VALID_CREDITOR);
    
    expect(xml).toContain('<NbOfTxs>50</NbOfTxs>');
    const expectedTotal = manyPayments.reduce((s, p) => s + p.amount, 0);
    expect(xml).toContain(`<CtrlSum>${expectedTotal.toFixed(2)}</CtrlSum>`);
    expect((xml.match(/<DrctDbtTxInf>/g) || []).length).toBe(50);
  });

  test('amount with sub-cent precision is formatted to 2 decimals', () => {
    const xml = generateDirectDebitXml([{
      ...VALID_PAYMENTS[0],
      amount: 123.456,
    }], VALID_CREDITOR);
    expect(xml).toContain('<InstdAmt Ccy="EUR">123.46</InstdAmt>');
  });
});
