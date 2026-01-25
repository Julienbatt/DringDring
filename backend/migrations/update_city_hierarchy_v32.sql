-- City hierarchy + NPA mapping

ALTER TABLE public.city
ADD COLUMN IF NOT EXISTS parent_city_id UUID REFERENCES public.city(id);

CREATE TABLE IF NOT EXISTS public.city_postal_code (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.city(id) ON DELETE CASCADE,
  postal_code TEXT NOT NULL,
  UNIQUE (postal_code)
);

CREATE INDEX IF NOT EXISTS idx_city_postal_code_city_id
  ON public.city_postal_code (city_id);
