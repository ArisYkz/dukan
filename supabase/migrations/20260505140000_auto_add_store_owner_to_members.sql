-- Automatically add store creator to store_members as owner.
-- Prevents RLS lockout when a new store is created but no store_members row exists.

CREATE OR REPLACE FUNCTION public.add_store_owner_to_members()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.store_members (store_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner')
  ON CONFLICT (store_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_store_owner_to_members ON public.stores;
CREATE TRIGGER trg_add_store_owner_to_members
  AFTER INSERT ON public.stores FOR EACH ROW
  EXECUTE FUNCTION public.add_store_owner_to_members();
