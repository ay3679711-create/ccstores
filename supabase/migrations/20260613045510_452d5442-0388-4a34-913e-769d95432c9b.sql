-- Auto-grant admin role to the designated admin email on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  -- Auto-grant admin role to the designated admin email
  IF lower(NEW.email) = 'ay3679711@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Also grant admin to that email if the user already exists
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT id INTO admin_user_id FROM auth.users WHERE lower(email) = 'ay3679711@gmail.com' LIMIT 1;
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (admin_user_id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;