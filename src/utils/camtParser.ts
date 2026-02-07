/**
 * CAMT.053/054 XML Parser for Austrian bank statements
 * Parses ISO 20022 CAMT XML format into structured transaction data
 */

export interface CamtTransaction {
  date: string;           // Buchungsdatum
  valueDate: string;      // Valutadatum
  amount: number;         // Betrag (positiv = Eingang, negativ = Ausgang)
  currency: string;
  reference: string;      // Zahlungsreferenz / EndToEndId
  description: string;    // Verwendungszweck
  counterpartName: string;
  counterpartIban: string;
  counterpartBic: string;
  bookingText: string;    // Buchungstext
  mandateId: string;      // SEPA Mandatsreferenz
  batchBooking: boolean;
}

export interface CamtStatement {
  iban: string;
  bic: string;
  accountName: string;
  statementId: string;
  creationDate: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  closingBalance: number;
  transactions: CamtTransaction[];
  totalCredits: number;
  totalDebits: number;
  creditCount: number;
  debitCount: number;
}

export interface CamtParseResult {
  success: boolean;
  statements: CamtStatement[];
  errors: string[];
  format: 'camt.053' | 'camt.054' | 'unknown';
}

function getTextContent(element: Element, tagName: string): string {
  // Search for tag with and without namespace
  const el = element.getElementsByTagName(tagName)[0] 
    || element.querySelector(tagName);
  return el?.textContent?.trim() || '';
}

function findElements(parent: Element, localName: string): Element[] {
  const results: Element[] = [];
  const children = parent.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.localName === localName || child.tagName.endsWith(':' + localName) || child.tagName === localName) {
      results.push(child);
    }
  }
  return results;
}

function findElement(parent: Element, localName: string): Element | null {
  return findElements(parent, localName)[0] || null;
}

function findDeep(parent: Element, localName: string): Element | null {
  // BFS search for a specific local name
  const queue: Element[] = [parent];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.localName === localName || current.tagName.endsWith(':' + localName)) {
      return current;
    }
    for (let i = 0; i < current.children.length; i++) {
      queue.push(current.children[i]);
    }
  }
  return null;
}

function findAllDeep(parent: Element, localName: string): Element[] {
  const results: Element[] = [];
  const queue: Element[] = [parent];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.localName === localName || current.tagName.endsWith(':' + localName)) {
      results.push(current);
    }
    for (let i = 0; i < current.children.length; i++) {
      queue.push(current.children[i]);
    }
  }
  return results;
}

function getDeepText(parent: Element, localName: string): string {
  const el = findDeep(parent, localName);
  return el?.textContent?.trim() || '';
}

function parseAmount(amountEl: Element | null): number {
  if (!amountEl) return 0;
  const text = amountEl.textContent?.trim() || '0';
  return parseFloat(text) || 0;
}

function parseCreditDebitIndicator(parent: Element): 'CRDT' | 'DBIT' {
  const cdi = getDeepText(parent, 'CdtDbtInd');
  return cdi === 'DBIT' ? 'DBIT' : 'CRDT';
}

function parseEntry(ntry: Element): CamtTransaction[] {
  const transactions: CamtTransaction[] = [];
  
  const amtEl = findDeep(ntry, 'Amt');
  const baseAmount = parseAmount(amtEl);
  const cdi = parseCreditDebitIndicator(ntry);
  const signedAmount = cdi === 'DBIT' ? -baseAmount : baseAmount;
  
  const bookgDt = getDeepText(ntry, 'BookgDt') ? getDeepText(findDeep(ntry, 'BookgDt')!, 'Dt') || getDeepText(ntry, 'BookgDt') : '';
  const valDt = getDeepText(ntry, 'ValDt') ? getDeepText(findDeep(ntry, 'ValDt')!, 'Dt') || getDeepText(ntry, 'ValDt') : '';
  
  // Parse date from YYYY-MM-DD or full datetime
  const parseDate = (d: string) => d ? d.substring(0, 10) : new Date().toISOString().substring(0, 10);
  
  const bookingText = getDeepText(ntry, 'AddtlNtryInf');
  
  // Check for batch entries (TxDtls)
  const txDetails = findAllDeep(ntry, 'TxDtls');
  
  if (txDetails.length > 0) {
    for (const txDtl of txDetails) {
      const txAmtEl = findDeep(txDtl, 'Amt');
      const txAmount = txAmtEl ? parseAmount(txAmtEl) : baseAmount;
      const txCdi = getDeepText(txDtl, 'CdtDbtInd') || cdi;
      const txSignedAmount = txCdi === 'DBIT' ? -Math.abs(txAmount) : Math.abs(txAmount);
      
      // Counterpart
      const rltdPties = findDeep(txDtl, 'RltdPties');
      let counterpartName = '';
      let counterpartIban = '';
      let counterpartBic = '';
      
      if (rltdPties) {
        if (cdi === 'CRDT') {
          // For credits, counterpart is the debtor
          counterpartName = getDeepText(rltdPties, 'Nm');
          const dbtrAcct = findDeep(rltdPties, 'DbtrAcct');
          if (dbtrAcct) counterpartIban = getDeepText(dbtrAcct, 'IBAN');
        } else {
          // For debits, counterpart is the creditor
          counterpartName = getDeepText(rltdPties, 'Nm');
          const cdtrAcct = findDeep(rltdPties, 'CdtrAcct');
          if (cdtrAcct) counterpartIban = getDeepText(cdtrAcct, 'IBAN');
        }
        // Try generic name if specific not found
        if (!counterpartName) {
          const nm = findDeep(rltdPties, 'Nm');
          counterpartName = nm?.textContent?.trim() || '';
        }
      }
      
      // Related agents for BIC
      const rltdAgts = findDeep(txDtl, 'RltdAgts');
      if (rltdAgts) {
        counterpartBic = getDeepText(rltdAgts, 'BIC') || getDeepText(rltdAgts, 'BICFI');
      }
      
      // References
      const refs = findDeep(txDtl, 'Refs');
      const endToEndId = refs ? getDeepText(refs, 'EndToEndId') : '';
      const mandateId = refs ? getDeepText(refs, 'MndtId') : '';
      
      // Remittance info (Verwendungszweck)
      const rmtInf = findDeep(txDtl, 'RmtInf');
      let description = '';
      if (rmtInf) {
        const ustrd = findAllDeep(rmtInf, 'Ustrd');
        description = ustrd.map(u => u.textContent?.trim()).filter(Boolean).join(' ');
        if (!description) {
          const strd = findDeep(rmtInf, 'Strd');
          if (strd) description = getDeepText(strd, 'Ref') || strd.textContent?.trim() || '';
        }
      }
      
      // Additional entry info as fallback
      if (!description) {
        description = getDeepText(txDtl, 'AddtlTxInf') || bookingText;
      }
      
      transactions.push({
        date: parseDate(bookgDt),
        valueDate: parseDate(valDt),
        amount: txSignedAmount,
        currency: amtEl?.getAttribute('Ccy') || 'EUR',
        reference: endToEndId !== 'NOTPROVIDED' ? endToEndId : '',
        description,
        counterpartName,
        counterpartIban,
        counterpartBic,
        bookingText: getDeepText(txDtl, 'AddtlTxInf') || bookingText,
        mandateId,
        batchBooking: txDetails.length > 1,
      });
    }
  } else {
    // Single entry without TxDtls
    const addtlInfo = bookingText;
    
    transactions.push({
      date: parseDate(bookgDt),
      valueDate: parseDate(valDt),
      amount: signedAmount,
      currency: amtEl?.getAttribute('Ccy') || 'EUR',
      reference: '',
      description: addtlInfo,
      counterpartName: '',
      counterpartIban: '',
      counterpartBic: '',
      bookingText: addtlInfo,
      mandateId: '',
      batchBooking: false,
    });
  }
  
  return transactions;
}

export function parseCamtXml(xmlContent: string): CamtParseResult {
  const errors: string[] = [];
  const statements: CamtStatement[] = [];
  let format: CamtParseResult['format'] = 'unknown';
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');
    
    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return { success: false, statements: [], errors: ['Ungültiges XML-Format: ' + parseError.textContent], format: 'unknown' };
    }
    
    const root = doc.documentElement;
    
    // Detect format
    const ns = root.getAttribute('xmlns') || root.namespaceURI || '';
    if (ns.includes('camt.053') || root.localName === 'Document' && findDeep(root, 'BkToCstmrStmt')) {
      format = 'camt.053';
    } else if (ns.includes('camt.054') || findDeep(root, 'BkToCstmrDbtCdtNtfctn')) {
      format = 'camt.054';
    }
    
    // Find statement elements
    const stmtElements = format === 'camt.054' 
      ? findAllDeep(root, 'Ntfctn')
      : findAllDeep(root, 'Stmt');
    
    if (stmtElements.length === 0) {
      errors.push('Keine Kontoauszüge im Dokument gefunden');
      return { success: false, statements, errors, format };
    }
    
    for (const stmt of stmtElements) {
      const acct = findDeep(stmt, 'Acct');
      const iban = acct ? getDeepText(acct, 'IBAN') : '';
      const bic = getDeepText(stmt, 'BICFI') || getDeepText(stmt, 'BIC');
      const accountName = acct ? getDeepText(acct, 'Nm') : '';
      const stmtId = getDeepText(stmt, 'Id');
      const creDtTm = getDeepText(stmt, 'CreDtTm');
      
      // Period
      const frToDt = findDeep(stmt, 'FrToDt');
      const fromDate = frToDt ? getDeepText(frToDt, 'FrDtTm') || getDeepText(frToDt, 'FrDt') : '';
      const toDate = frToDt ? getDeepText(frToDt, 'ToDtTm') || getDeepText(frToDt, 'ToDt') : '';
      
      // Balances
      let openingBalance = 0;
      let closingBalance = 0;
      const balElements = findAllDeep(stmt, 'Bal');
      for (const bal of balElements) {
        const tp = findDeep(bal, 'Tp');
        const cdOrPrtry = tp ? getDeepText(tp, 'Cd') || getDeepText(tp, 'Prtry') : '';
        const amt = parseAmount(findDeep(bal, 'Amt'));
        const balCdi = getDeepText(bal, 'CdtDbtInd');
        const signedAmt = balCdi === 'DBIT' ? -amt : amt;
        
        if (cdOrPrtry === 'OPBD' || cdOrPrtry === 'PRCD') {
          openingBalance = signedAmt;
        } else if (cdOrPrtry === 'CLBD' || cdOrPrtry === 'CLAV') {
          closingBalance = signedAmt;
        }
      }
      
      // Parse entries
      const entries = findAllDeep(stmt, 'Ntry');
      const allTransactions: CamtTransaction[] = [];
      
      for (const ntry of entries) {
        try {
          const txns = parseEntry(ntry);
          allTransactions.push(...txns);
        } catch (e) {
          errors.push(`Fehler beim Parsen eines Eintrags: ${e}`);
        }
      }
      
      const credits = allTransactions.filter(t => t.amount > 0);
      const debits = allTransactions.filter(t => t.amount < 0);
      
      statements.push({
        iban,
        bic,
        accountName,
        statementId: stmtId,
        creationDate: creDtTm ? creDtTm.substring(0, 10) : '',
        fromDate: fromDate ? fromDate.substring(0, 10) : '',
        toDate: toDate ? toDate.substring(0, 10) : '',
        openingBalance,
        closingBalance,
        transactions: allTransactions,
        totalCredits: credits.reduce((s, t) => s + t.amount, 0),
        totalDebits: debits.reduce((s, t) => s + Math.abs(t.amount), 0),
        creditCount: credits.length,
        debitCount: debits.length,
      });
    }
    
    return { success: true, statements, errors, format };
  } catch (e) {
    return { success: false, statements: [], errors: [`XML-Parsing fehlgeschlagen: ${e}`], format: 'unknown' };
  }
}

/**
 * Read file content as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
}
