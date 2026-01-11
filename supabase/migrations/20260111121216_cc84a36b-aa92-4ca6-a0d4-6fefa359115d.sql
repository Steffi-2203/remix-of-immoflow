-- 1. Lösche Tenant-Dokumente Februar-Dezember 2026
DELETE FROM tenant_documents 
WHERE name LIKE 'Vorschreibung Februar%'
   OR name LIKE 'Vorschreibung März%'
   OR name LIKE 'Vorschreibung April%'
   OR name LIKE 'Vorschreibung Mai%'
   OR name LIKE 'Vorschreibung Juni%'
   OR name LIKE 'Vorschreibung Juli%'
   OR name LIKE 'Vorschreibung August%'
   OR name LIKE 'Vorschreibung September%'
   OR name LIKE 'Vorschreibung Oktober%'
   OR name LIKE 'Vorschreibung November%'
   OR name LIKE 'Vorschreibung Dezember%';

-- 2. Lösche Rechnungen Februar-Dezember 2026
DELETE FROM monthly_invoices 
WHERE month >= 2 AND year = 2026;