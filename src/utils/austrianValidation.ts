/**
 * Austrian master data validation utilities
 * IBAN (AT format), UID (ATU number), ZMR (Zentrales Melderegister)
 */

/**
 * Validate IBAN with ISO 13616 check digit verification.
 * Supports all countries but highlights AT format.
 */
export function validateIBAN(iban: string): { valid: boolean; error?: string } {
  if (!iban) return { valid: true }; // optional field
  
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  
  if (cleaned.length < 5) {
    return { valid: false, error: 'IBAN ist zu kurz' };
  }

  // Country-specific length check
  const countryLengths: Record<string, number> = {
    AT: 20, DE: 22, CH: 21, LI: 21, IT: 27, FR: 27, ES: 24,
    NL: 18, BE: 16, LU: 20, CZ: 24, SK: 24, HU: 28, PL: 28,
    HR: 21, SI: 19, GB: 22,
  };

  const country = cleaned.substring(0, 2);
  const expectedLength = countryLengths[country];
  
  if (expectedLength && cleaned.length !== expectedLength) {
    return { valid: false, error: `IBAN für ${country} muss ${expectedLength} Zeichen haben (aktuell: ${cleaned.length})` };
  }

  // ISO 13616 mod-97 check
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(cleaned)) {
    return { valid: false, error: 'IBAN enthält ungültige Zeichen' };
  }

  const rearranged = cleaned.substring(4) + cleaned.substring(0, 4);
  const numericStr = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
  
  // BigInt mod 97
  let remainder = 0n;
  for (let i = 0; i < numericStr.length; i += 7) {
    const chunk = String(remainder) + numericStr.substring(i, i + 7);
    remainder = BigInt(chunk) % 97n;
  }

  if (remainder !== 1n) {
    return { valid: false, error: 'IBAN-Prüfziffer ungültig' };
  }

  return { valid: true };
}

/**
 * Format IBAN with spaces every 4 characters
 */
export function formatIBAN(iban: string): string {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  return cleaned.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Validate Austrian UID (Umsatzsteuer-Identifikationsnummer).
 * Format: ATU + 8 digits, last digit is check digit (mod 97).
 */
export function validateUID(uid: string): { valid: boolean; error?: string } {
  if (!uid) return { valid: true }; // optional field
  
  const cleaned = uid.replace(/\s/g, '').toUpperCase();
  
  if (!/^ATU\d{8}$/.test(cleaned)) {
    return { valid: false, error: 'UID muss das Format ATU + 8 Ziffern haben (z.B. ATU12345678)' };
  }

  // Check digit validation (Luhn-like algorithm for ATU)
  const digits = cleaned.substring(3).split('').map(Number);
  const weights = [1, 2, 1, 2, 1, 2, 1];
  let sum = 0;

  for (let i = 0; i < 7; i++) {
    let product = digits[i] * weights[i];
    if (product > 9) product = Math.floor(product / 10) + (product % 10);
    sum += product;
  }

  const checkDigit = (96 - sum) % 10;
  if (checkDigit !== digits[7]) {
    return { valid: false, error: 'UID-Prüfziffer ungültig' };
  }

  return { valid: true };
}

/**
 * Validate ZMR number (Zentrales Melderegister).
 * 12-digit number.
 */
export function validateZMR(zmr: string): { valid: boolean; error?: string } {
  if (!zmr) return { valid: true }; // optional field
  
  const cleaned = zmr.replace(/\s/g, '');
  
  if (!/^\d{12}$/.test(cleaned)) {
    return { valid: false, error: 'ZMR-Nummer muss 12 Ziffern haben' };
  }

  return { valid: true };
}

/**
 * Validate BIC/SWIFT code.
 * Format: 8 or 11 alphanumeric characters.
 */
export function validateBIC(bic: string): { valid: boolean; error?: string } {
  if (!bic) return { valid: true }; // optional field
  
  const cleaned = bic.replace(/\s/g, '').toUpperCase();
  
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleaned)) {
    return { valid: false, error: 'BIC muss 8 oder 11 Zeichen haben (z.B. BKAUATWW)' };
  }

  return { valid: true };
}
