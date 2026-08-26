
CREATE OR REPLACE FUNCTION public.unpause_on_upgrade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.plan_type = 'free' AND NEW.plan_type != 'free' THEN
    NEW.is_paused := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_unpause_on_upgrade ON public.stores;
CREATE TRIGGER trg_unpause_on_upgrade
  BEFORE UPDATE OF plan_type ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.unpause_on_upgrade();
