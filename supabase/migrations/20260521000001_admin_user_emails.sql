-- Admin function to get user emails from auth.users
-- Only callable by admin users via SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_user_emails(user_ids JSONB)
RETURNS TABLE(user_id UUID, email TEXT)
SECURITY DEFINER
AS $$
BEGIN
  -- Check that the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT au.id::UUID, au.email::TEXT
  FROM auth.users au
  WHERE au.id = ANY(SELECT jsonb_array_elements_text(user_ids)::UUID);
END;
$$ LANGUAGE plpgsql;
