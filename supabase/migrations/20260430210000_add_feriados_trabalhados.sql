ALTER TABLE public.beneficios_ticket ADD COLUMN IF NOT EXISTS feriados_trabalhados integer NOT NULL DEFAULT 0;
ALTER TABLE public.beneficios_transporte ADD COLUMN IF NOT EXISTS feriados_trabalhados integer NOT NULL DEFAULT 0;
