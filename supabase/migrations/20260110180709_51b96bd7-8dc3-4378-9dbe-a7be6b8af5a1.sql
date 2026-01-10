-- Phase 1: VIEW property_owners_safe löschen (sensible Daten ohne RLS-Schutz)
DROP VIEW IF EXISTS public.property_owners_safe;

-- Phase 2: calculate_bank_balance() Funktion mit Berechtigungsprüfung absichern
CREATE OR REPLACE FUNCTION public.calculate_bank_balance(
  account_id uuid, 
  as_of_date date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  opening_bal DECIMAL(10,2);
  opening_date DATE;
  transaction_sum DECIMAL(10,2);
  user_org_id UUID;
BEGIN
  -- Verify user has access via organization
  SELECT ba.organization_id INTO user_org_id
  FROM bank_accounts ba
  JOIN profiles p ON p.organization_id = ba.organization_id
  WHERE ba.id = account_id 
    AND p.id = auth.uid();
  
  IF user_org_id IS NULL THEN
    RAISE EXCEPTION 'Access denied to bank account';
  END IF;
  
  SELECT opening_balance, opening_balance_date 
  INTO opening_bal, opening_date
  FROM bank_accounts WHERE id = account_id;
  
  SELECT COALESCE(SUM(amount), 0)
  INTO transaction_sum
  FROM transactions
  WHERE bank_account_id = account_id
    AND transaction_date >= COALESCE(opening_date, '1900-01-01')
    AND transaction_date <= as_of_date;
  
  RETURN COALESCE(opening_bal, 0) + transaction_sum;
END;
$$;