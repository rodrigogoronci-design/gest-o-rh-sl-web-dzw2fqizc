CREATE TABLE IF NOT EXISTS public.feriados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE UNIQUE NOT NULL,
    descricao TEXT NOT NULL DEFAULT 'Feriado',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.escala_mes (
    mes_ano TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'Rascunho',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.feriados;
CREATE POLICY "Allow all access to authenticated users" ON public.feriados FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.escala_mes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.escala_mes;
CREATE POLICY "Allow all access to authenticated users" ON public.escala_mes FOR ALL TO authenticated USING (true) WITH CHECK (true);
