
-- Sequence for monotone chain_index
CREATE SEQUENCE IF NOT EXISTS public.audit_chain_seq;

-- Trigger function for DELETE auditing
CREATE OR REPLACE FUNCTION public.audit_on_delete()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO audit_events(entity_type, entity_id, event_type, payload, payload_hash, prev_hash, chain_index, actor_id, actor_org, retention_until)
  VALUES (
    TG_TABLE_NAME,
    OLD.id::text,
    'DELETE',
    jsonb_build_object('id', OLD.id),
    md5(OLD::text),
    (SELECT payload_hash FROM audit_events ORDER BY chain_index DESC LIMIT 1),
    nextval('audit_chain_seq'),
    auth.uid(),
    public.user_org_id(),
    now() + interval '10 years'
  );
  RETURN OLD;
END;
$$;
