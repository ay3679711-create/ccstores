-- 1. profiles: restrict SELECT to own row or admin
DROP POLICY IF EXISTS "Profiles are viewable by everyone signed in" ON public.profiles;
CREATE POLICY "Users read own profile or admin reads all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- 2. app_settings: authenticated only
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
CREATE POLICY "Authenticated users read app settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

-- 3. payment_settings: authenticated only
DROP POLICY IF EXISTS "Anyone can read payment settings" ON public.payment_settings;
CREATE POLICY "Authenticated users read payment settings"
  ON public.payment_settings FOR SELECT
  TO authenticated
  USING (true);

-- 4. visits: admins only can read
DROP POLICY IF EXISTS "Anyone can read aggregate visits" ON public.visits;
CREATE POLICY "Admins read visits"
  ON public.visits FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Lock down trigger-only SECURITY DEFINER functions from being callable via PostgREST
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_order_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_cc_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_codes() FROM PUBLIC, anon, authenticated;

-- 6. has_role: revoke from anon (only authenticated/policies need it)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;