-- Update categories
UPDATE public.categories SET name = 'how to learn' WHERE name = 'Digital Products';
UPDATE public.categories SET name = 'how to use' WHERE name = 'Software';
UPDATE public.categories SET name = 'loded account' WHERE name = 'Subscriptions';
UPDATE public.categories SET name = 'debit card' WHERE name = 'Gaming';
UPDATE public.categories SET name = 'proxy' WHERE name = 'Other';

-- Add badge and delivery message support
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_special_badge BOOLEAN DEFAULT false;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS congrats_message TEXT;

-- Add category-specific fields to products (to allow template-based uploads)
-- These allow the admin to pre-fill common fields during upload
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS account_email TEXT,
ADD COLUMN IF NOT EXISTS account_password TEXT,
ADD COLUMN IF NOT EXISTS account_balance DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS card_number TEXT,
ADD COLUMN IF NOT EXISTS card_cvv TEXT,
ADD COLUMN IF NOT EXISTS card_holder TEXT,
ADD COLUMN IF NOT EXISTS card_country TEXT,
ADD COLUMN IF NOT EXISTS bin TEXT,
ADD COLUMN IF NOT EXISTS card_price DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS inner_price DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS delivery_description TEXT;
