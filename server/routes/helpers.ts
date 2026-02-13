import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

/**
 * Convert snake_case keys to camelCase for database compatibility
 */
export function snakeToCamel(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (typeof obj !== 'object') return obj;

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = snakeToCamel(value);
  }
  return result;
}

/**
 * Express middleware to check session authentication
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

/**
 * Mask personal data for tester role
 */
export function maskPersonalData(data: any): any {
  if (!data) return data;

  const sensitivePatterns = [
    'firstname', 'lastname', 'first_name', 'last_name', 'vorname', 'nachname',
    'fullname', 'full_name', 'tenant_name', 'tenantname', 'owner',
    'email', 'mail', 'contact',
    'phone', 'telefon', 'mobile', 'mobil', 'handy', 'fax',
    'iban', 'bic', 'bank_account', 'bankaccount', 'account_holder', 'accountholder', 'kontoinhaber',
    'birthdate', 'birth_date', 'geburtsdatum', 'birthday',
    'address', 'adresse', 'street', 'strasse', 'postal', 'plz', 'city', 'stadt', 'ort',
    'recipient', 'empfaenger', 'absender', 'sender',
  ];

  const shouldMask = (key: string): boolean => {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'name' && lowerKey.length === 4) return false;
    return sensitivePatterns.some(p => lowerKey.includes(p));
  };

  const maskValue = (key: string, value: any): any => {
    if (typeof value !== 'string' || !value) return value;

    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('email') || lowerKey.includes('mail')) return 'mieter@beispiel.at';
    if (lowerKey.includes('phone') || lowerKey.includes('telefon') || lowerKey.includes('mobil') || lowerKey.includes('handy') || lowerKey.includes('fax')) return '+43 XXX XXXXXX';
    if (lowerKey.includes('iban')) return 'AT** **** **** **** ****';
    if (lowerKey.includes('bic')) return 'XXXXATXX';
    if (lowerKey.includes('account') || lowerKey.includes('konto')) return 'Max Mustermann';
    if (lowerKey.includes('first') || lowerKey === 'vorname') return 'Max';
    if (lowerKey.includes('last') || lowerKey === 'nachname') return 'Mustermann';
    if (lowerKey.includes('name') || lowerKey.includes('tenant') || lowerKey.includes('owner') || lowerKey.includes('recipient') || lowerKey.includes('contact')) return 'Max Mustermann';
    if (lowerKey.includes('address') || lowerKey.includes('adresse') || lowerKey.includes('street') || lowerKey.includes('strasse')) return 'Musterstraße 1';
    if (lowerKey.includes('city') || lowerKey.includes('stadt') || lowerKey.includes('ort')) return 'Wien';
    if (lowerKey.includes('postal') || lowerKey.includes('plz')) return '1010';
    if (lowerKey.includes('birth') || lowerKey.includes('geburt')) return '01.01.1980';
    return '***';
  };

  if (Array.isArray(data)) return data.map(item => maskPersonalData(item));

  if (typeof data === 'object') {
    const masked: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (shouldMask(key)) {
        masked[key] = maskValue(key, value);
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = maskPersonalData(value);
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }

  return data;
}

/**
 * Get user roles from session
 */
export async function getUserRoles(req: any): Promise<string[]> {
  try {
    const userId = req.session?.userId;
    if (!userId) return [];
    const roles = await storage.getUserRoles(userId);
    return roles.map((r: any) => r.role);
  } catch {
    return [];
  }
}

/**
 * Get profile from session
 */
export async function getProfileFromSession(req: any) {
  const userId = req.session?.userId;
  if (!userId) return null;
  return storage.getProfileById(userId);
}

/**
 * Check if user has tester role
 */
export function isTester(roles: string[]): boolean {
  return roles.includes('tester');
}
