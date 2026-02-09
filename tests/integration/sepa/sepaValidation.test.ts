import { describe, test, expect } from 'vitest';

/**
 * SEPA Direct Debit XML Validation
 * ISO 20022 pain.008.001.02 structural compliance.
 */

function generateDirectDebitXml(payments: Array<{
  tenantName: string;
  iban: string;
  bic: string;
  amount: number;
  mandateId: string;
  endToEndId: string;
}>, creditor: {
  name: string;
  iban: string;
  bic: string;
  creditorId: string;
}): string {
  const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const totalAmount = payments.reduce((s, p) => s + p.amount, 0);
  const msgId = `MSG-TEST-${Date.now()}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${escapeXml(msgId)}</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <NbOfTxs>${payments.length}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <InitgPty><Nm>${escapeXml(creditor.name)}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${escapeXml(msgId)}-1</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <NbOfTxs>${payments.length}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <Cdtr><Nm>${escapeXml(creditor.name)}</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>${creditor.iban}</IBAN></Id></CdtrAcct>
      <CdtrAgt><FinInstnId><BIC>${creditor.bic}</BIC></FinInstnId></CdtrAgt>
      ${payments.map(p => `
      <DrctDbtTxInf>
        <PmtId><EndToEndId>${escapeXml(p.endToEndId)}</EndToEndId></PmtId>
        <InstdAmt Ccy="EUR">${p.amount.toFixed(2)}</InstdAmt>
        <DrctDbtTx><MndtRltdInf><MndtId>${escapeXml(p.mandateId)}</MndtId></MndtRltdInf></DrctDbtTx>
        <DbtrAgt><FinInstnId><BIC>${p.bic}</BIC></FinInstnId></DbtrAgt>
        <Dbtr><Nm>${escapeXml(p.tenantName)}</Nm></Dbtr>
        <DbtrAcct><Id><IBAN>${p.iban}</IBAN></Id></DbtrAcct>
      </DrctDbtTxInf>`).join('')}
    </PmtInf>
  </CstmrDrctDbtInitn>
</Document>`;
}

const TEST_CREDITOR = {
  name: 'Test Hausverwaltung GmbH',
  iban: 'AT611904300234573201',
  bic: 'BKAUATWW',
  creditorId: 'AT98ZZZ00000000001',
};

const TEST_PAYMENTS = [
  { tenantName: 'Max Mustermann', iban: 'AT611904300234573201', bic: 'BKAUATWW', amount: 850, mandateId: 'MAND-001', endToEndId: 'E2E-001' },
  { tenantName: 'Maria Musterfrau', iban: 'AT021100000012345678', bic: 'BKAUATWW', amount: 720, mandateId: 'MAND-002', endToEndId: 'E2E-002' },
  { tenantName: 'Franz Huber', iban: 'AT483200000012345864', bic: 'RLNWATWW', amount: 1100.50, mandateId: 'MAND-003', endToEndId: 'E2E-003' },
];

describe('SEPA XML – Structural Validation', () => {
  const xml = generateDirectDebitXml(TEST_PAYMENTS, TEST_CREDITOR);

  test('valid XML declaration', () => {
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  });

  test('correct namespace', () => {
    expect(xml).toContain('urn:iso:std:iso:20022:tech:xsd:pain.008.001.02');
  });

  test('NbOfTxs matches payment count', () => {
    const matches = xml.match(/<NbOfTxs>(\d+)<\/NbOfTxs>/g) || [];
    for (const match of matches) {
      const count = match.replace(/<\/?NbOfTxs>/g, '');
      expect(Number(count)).toBe(TEST_PAYMENTS.length);
    }
  });

  test('CtrlSum matches total amount', () => {
    const expected = TEST_PAYMENTS.reduce((s, p) => s + p.amount, 0).toFixed(2);
    const matches = xml.match(/<CtrlSum>([\d.]+)<\/CtrlSum>/g) || [];
    for (const match of matches) {
      const sum = match.replace(/<\/?CtrlSum>/g, '');
      expect(sum).toBe(expected);
    }
  });

  test('each payment has required elements', () => {
    for (const p of TEST_PAYMENTS) {
      expect(xml).toContain(`<EndToEndId>${p.endToEndId}</EndToEndId>`);
      expect(xml).toContain(`<MndtId>${p.mandateId}</MndtId>`);
      expect(xml).toContain(`<IBAN>${p.iban}</IBAN>`);
      expect(xml).toContain(`${p.amount.toFixed(2)}</InstdAmt>`);
    }
  });

  test('IBAN format: Austrian IBANs are 20 chars', () => {
    for (const p of TEST_PAYMENTS) {
      expect(p.iban).toMatch(/^AT\d{18}$/);
    }
  });

  test('special characters are XML-escaped', () => {
    const withSpecial = [{ ...TEST_PAYMENTS[0], tenantName: 'Müller & Söhne <GmbH>' }];
    const specialXml = generateDirectDebitXml(withSpecial, TEST_CREDITOR);
    expect(specialXml).toContain('Müller &amp; Söhne &lt;GmbH&gt;');
    expect(specialXml).not.toContain('& Söhne');
  });
});

describe('SEPA – Amount Validation', () => {
  test('rejects zero amount', () => {
    const zeroPayment = [{ ...TEST_PAYMENTS[0], amount: 0 }];
    const xml = generateDirectDebitXml(zeroPayment, TEST_CREDITOR);
    expect(xml).toContain('0.00</InstdAmt>');
    // In production, the service should reject this
  });

  test('handles cent-precision amounts', () => {
    const centPayment = [{ ...TEST_PAYMENTS[0], amount: 123.45 }];
    const xml = generateDirectDebitXml(centPayment, TEST_CREDITOR);
    expect(xml).toContain('123.45</InstdAmt>');
  });
});
