-- Add email column to profiles (synced from auth.users)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update the auto-create trigger to also store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), NEW.email)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Backfill emails for existing profiles
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.user_id = au.id
  AND p.email IS NULL;

-- Drop the RPC function (no longer needed — query profiles.email directly)
DROP FUNCTION IF EXISTS get_user_emails;
