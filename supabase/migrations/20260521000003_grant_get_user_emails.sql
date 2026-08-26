-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_emails(JSONB) TO authenticated;