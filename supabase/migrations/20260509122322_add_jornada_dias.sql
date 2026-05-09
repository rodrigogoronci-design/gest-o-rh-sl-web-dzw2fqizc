ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS jornada_dias JSONB DEFAULT '[]'::jsonb;
