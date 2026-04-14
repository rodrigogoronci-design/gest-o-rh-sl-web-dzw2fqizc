CREATE TABLE IF NOT EXISTS public.faltas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(colaborador_id, data)
);

ALTER TABLE public.faltas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.faltas;
CREATE POLICY "Allow all access to authenticated users" ON public.faltas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.beneficios_ticket ADD COLUMN IF NOT EXISTS faltas INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.beneficios_transporte ADD COLUMN IF NOT EXISTS faltas INTEGER NOT NULL DEFAULT 0;
