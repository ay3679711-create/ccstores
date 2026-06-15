ALTER TABLE public.product_secrets
  ADD COLUMN IF NOT EXISTS card_holder text,
  ADD COLUMN IF NOT EXISTS card_country text;