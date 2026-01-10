-- Erweitere expense_type Enum um neue Typen für sonstige_kosten
ALTER TYPE expense_type ADD VALUE 'makler';
ALTER TYPE expense_type ADD VALUE 'notar';
ALTER TYPE expense_type ADD VALUE 'grundbuch';
ALTER TYPE expense_type ADD VALUE 'finanzierung';