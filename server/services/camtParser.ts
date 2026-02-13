/**
 * CAMT.053 / CAMT.054 Parser
 * ISO 20022 Bank-to-Customer Account Statement parser
 * Supports: camt.053.001.02 / .08 and camt.054.001.02 / .08
 */

export interface CamtEntry {
  /** Entry reference (NtryRef) */
  reference: string;
  /** Booking date */
  bookingDate: string;
  /** Value date */
  valueDate: string;
  /** Amount in EUR (positive = credit, negative = debit) */
  amount: number;
  /** Currency */
  currency: string;
  /** Credit/Debit indicator: CRDT or DBIT */
  creditDebit: 'CRDT' | 'DBIT';
  /** Debtor/Creditor name */
  counterpartyName: string;
  /** Debtor/Creditor IBAN */
  counterpartyIban: string;
  /** Unstructured remittance info */
  remittanceInfo: string;
  /** End-to-End ID */
  endToEndId: string;
  /** Mandate ID (for direct debits) */
  mandateId: string;
  /** Bank transaction code */
  bankTransactionCode: string;
}

export interface CamtStatement {
  /** Statement ID */
  id: string;
  /** Account IBAN */
  accountIban: string;
  /** Account currency */
  accountCurrency: string;
  /** Statement creation date */
  creationDate: string;
  /** Opening balance */
  openingBalance: number;
  /** Closing balance */
  closingBalance: number;
  /** Entries */
  entries: CamtEntry[];
  /** Raw namespace for format detection */
  namespace: string;
}

/**
 * Parse CAMT.053/054 XML string into structured data
 */
export function parseCamtXml(xmlString: string): CamtStatement {
  // Simple XML extraction helpers (no external dependency needed)
  const getTag = (xml: string, tag: string): string => {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
    return match?.[1]?.trim() || '';
  };

  const getAllTags = (xml: string, tag: string): string[] => {
    const matches: string[] = [];
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
    let m;
    while ((m = regex.exec(xml)) !== null) {
      matches.push(m[0]);
    }
    return matches;
  };

  const getAttr = (xml: string, tag: string, attr: string): string => {
    const match = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, 'i'));
    return match?.[1] || '';
  };

  // Detect namespace
  const nsMatch = xmlString.match(/xmlns="([^"]+)"/);
  const namespace = nsMatch?.[1] || '';

  // Determine root element (BkToCstmrStmt for .053, BkToCstmrDbtCdtNtfctn for .054)
  const isStatement = xmlString.includes('BkToCstmrStmt');
  const rootTag = isStatement ? 'BkToCstmrStmt' : 'BkToCstmrDbtCdtNtfctn';
  const stmtTag = isStatement ? 'Stmt' : 'Ntfctn';

  const root = getTag(xmlString, rootTag);
  const stmt = getTag(root, stmtTag);

  // Statement metadata
  const id = getTag(stmt, 'Id') || getTag(getTag(root, 'GrpHdr'), 'MsgId');
  const creationDate = getTag(getTag(root, 'GrpHdr'), 'CreDtTm');

  // Account info
  const acct = getTag(stmt, 'Acct');
  const accountIban = getTag(getTag(acct, 'Id'), 'IBAN');
  const accountCurrency = getTag(acct, 'Ccy') || 'EUR';

  // Balances
  let openingBalance = 0;
  let closingBalance = 0;
  const balances = getAllTags(stmt, 'Bal');
  for (const bal of balances) {
    const tp = getTag(getTag(bal, 'Tp'), 'CdOrPrtry');
    const code = getTag(tp, 'Cd');
    const amt = parseFloat(getTag(getTag(bal, 'Amt'), '') || getAttr(bal, 'Amt', 'Ccy') ? getTag(bal, 'Amt') : '0');
    const amtMatch = bal.match(/<Amt[^>]*>([^<]+)<\/Amt>/);
    const amount = amtMatch ? parseFloat(amtMatch[1]) : 0;
    const cdInd = getTag(bal, 'CdtDbtInd');

    const signedAmount = cdInd === 'DBIT' ? -amount : amount;

    if (code === 'OPBD' || code === 'PRCD') {
      openingBalance = signedAmount;
    } else if (code === 'CLBD' || code === 'CLAV') {
      closingBalance = signedAmount;
    }
  }

  // Parse entries
  const entryStrings = getAllTags(stmt, 'Ntry');
  const entries: CamtEntry[] = entryStrings.map(ntry => {
    const creditDebit = getTag(ntry, 'CdtDbtInd') as 'CRDT' | 'DBIT';
    const amtMatch = ntry.match(/<Amt[^>]*>([^<]+)<\/Amt>/);
    const rawAmount = amtMatch ? parseFloat(amtMatch[1]) : 0;
    const amount = creditDebit === 'DBIT' ? -rawAmount : rawAmount;
    const currency = getAttr(ntry, 'Amt', 'Ccy') || 'EUR';

    const bookingDate = getTag(getTag(ntry, 'BookgDt'), 'Dt') || getTag(getTag(ntry, 'BookgDt'), 'DtTm');
    const valueDate = getTag(getTag(ntry, 'ValDt'), 'Dt') || getTag(getTag(ntry, 'ValDt'), 'DtTm');
    const reference = getTag(ntry, 'NtryRef') || getTag(ntry, 'AcctSvcrRef') || '';

    // Transaction details
    const txDtls = getTag(getTag(ntry, 'NtryDtls'), 'TxDtls');
    const endToEndId = getTag(getTag(getTag(txDtls, 'Refs'), 'EndToEndId') ? txDtls : ntry, 'EndToEndId') || '';
    const mandateId = getTag(txDtls, 'MndtId') || '';

    // Counterparty
    const relatedParty = getTag(txDtls, 'RltdPties');
    let counterpartyName = '';
    let counterpartyIban = '';

    if (creditDebit === 'CRDT') {
      // Money received: counterparty is debtor
      counterpartyName = getTag(getTag(relatedParty, 'Dbtr'), 'Nm');
      counterpartyIban = getTag(getTag(getTag(relatedParty, 'DbtrAcct'), 'Id'), 'IBAN');
    } else {
      // Money sent: counterparty is creditor
      counterpartyName = getTag(getTag(relatedParty, 'Cdtr'), 'Nm');
      counterpartyIban = getTag(getTag(getTag(relatedParty, 'CdtrAcct'), 'Id'), 'IBAN');
    }

    // Remittance info
    const rmtInf = getTag(txDtls, 'RmtInf') || getTag(ntry, 'AddtlNtryInf') || '';
    const remittanceInfo = getTag(rmtInf, 'Ustrd') || rmtInf.replace(/<[^>]+>/g, ' ').trim();

    // Bank transaction code
    const domainCode = getTag(getTag(getTag(ntry, 'BkTxCd'), 'Domn'), 'Cd');
    const familyCode = getTag(getTag(getTag(getTag(ntry, 'BkTxCd'), 'Domn'), 'Fmly'), 'Cd');
    const bankTransactionCode = [domainCode, familyCode].filter(Boolean).join('/');

    return {
      reference,
      bookingDate,
      valueDate,
      amount,
      currency,
      creditDebit,
      counterpartyName,
      counterpartyIban,
      remittanceInfo,
      endToEndId,
      mandateId,
      bankTransactionCode,
    };
  });

  return {
    id,
    accountIban,
    accountCurrency,
    creationDate,
    openingBalance,
    closingBalance,
    entries,
    namespace,
  };
}
