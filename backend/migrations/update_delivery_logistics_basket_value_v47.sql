-- Add basket value (valeur des courses) for monitoring only
ALTER TABLE public.delivery_logistics
ADD COLUMN IF NOT EXISTS basket_value DECIMAL(10, 2);
