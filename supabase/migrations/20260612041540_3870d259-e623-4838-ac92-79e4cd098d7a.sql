
-- 1. Extend products with provider/usage fields and a free-form "stock type" label (admin-defined)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS provider_label TEXT,
  ADD COLUMN IF NOT EXISTS usage_window TEXT,
  ADD COLUMN IF NOT EXISTS stock_kind TEXT NOT NULL DEFAULT 'account';

-- 2. Product secrets vault (admin-only). One row per product, holds the deliverable.
CREATE TABLE IF NOT EXISTS public.product_secrets (
  product_id UUID PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  card_number TEXT,
  card_cvv TEXT,
  card_exp TEXT,
  account_login TEXT,
  account_password TEXT,
  account_balance NUMERIC(10,2),
  extra_notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_secrets TO authenticated;
GRANT ALL ON public.product_secrets TO service_role;
ALTER TABLE public.product_secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read product secrets" ON public.product_secrets
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write product secrets" ON public.product_secrets
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_product_secrets_updated BEFORE UPDATE ON public.product_secrets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Orders: payment deadline + payment_submitted_at
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMPTZ;

-- 4. Profiles: friends-chat code (separate from admin support_code)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS community_code TEXT UNIQUE;

-- Backfill community_code for existing rows
UPDATE public.profiles SET community_code = 'FR-' || upper(substring(replace(id::text, '-', ''), 1, 8))
  WHERE community_code IS NULL;

-- Update handle_new_user to assign community_code on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_code INT;
BEGIN
  next_code := nextval('public.cc_user_code_seq');
  INSERT INTO public.profiles (id, cc_code, community_code, full_name, email, avatar_url, phone)
  VALUES (
    NEW.id,
    'CC' || next_code,
    'FR-' || upper(substring(replace(NEW.id::text, '-', ''), 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'phone'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$function$;

-- Also ensure community_code is immutable (re-use protect_cc_code style)
CREATE OR REPLACE FUNCTION public.protect_codes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.cc_code IS DISTINCT FROM OLD.cc_code THEN RAISE EXCEPTION 'cc_code is immutable'; END IF;
  IF NEW.community_code IS DISTINCT FROM OLD.community_code THEN RAISE EXCEPTION 'community_code is immutable'; END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_protect_cc_code ON public.profiles;
CREATE TRIGGER trg_protect_codes BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_codes();

-- 5. App settings (single-row, admin-editable)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  brand_name TEXT NOT NULL DEFAULT 'CC Whale',
  brand_logo_url TEXT,
  welcome_popup_title TEXT NOT NULL DEFAULT 'Welcome back, operator',
  welcome_popup_body TEXT NOT NULL DEFAULT 'Your access codes are below. Keep them private.',
  delivery_message_template TEXT NOT NULL DEFAULT 'Congratulations! Your card is ready. Use it between {{usage_window}}. Card: {{card_number}} | CVV: {{card_cvv}} | EXP: {{card_exp}}',
  payment_timer_hours INT NOT NULL DEFAULT 12,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read app settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage app settings" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_app_settings_updated BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Also allow admins to update payment_settings; allow anon to read (so landing page can show QR descriptor if needed)
DROP POLICY IF EXISTS "Anyone signed-in can read payment settings" ON public.payment_settings;
CREATE POLICY "Anyone can read payment settings" ON public.payment_settings FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.payment_settings TO anon;

-- 6. Visits log for landing-page stats
CREATE TABLE IF NOT EXISTS public.visits (
  id BIGSERIAL PRIMARY KEY,
  visitor_id TEXT,
  user_id UUID,
  path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.visits TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.visits_id_seq TO anon, authenticated;
GRANT ALL ON public.visits TO service_role;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log a visit" ON public.visits FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can read aggregate visits" ON public.visits FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_visits_created_at ON public.visits (created_at DESC);

-- 7. Make products writable by admins (they already manage via admin panel)
DROP POLICY IF EXISTS "Admins manage products" ON public.products;
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. Allow admins to create/update/delete categories
DROP POLICY IF EXISTS "Admins manage categories" ON public.categories;
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
