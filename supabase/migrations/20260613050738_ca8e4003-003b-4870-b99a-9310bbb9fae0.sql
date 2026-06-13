-- has_role is invoked by RLS policies on public-read tables (products, categories).
-- Anon must be able to execute it (it returns false for unauthenticated callers).
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon;