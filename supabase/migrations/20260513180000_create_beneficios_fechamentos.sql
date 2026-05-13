CREATE TABLE IF NOT EXISTS public.beneficios_fechamentos (
  mes_ano TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'aberto',
  fechado_em TIMESTAMPTZ,
  fechado_por UUID REFERENCES public.colaboradores(id) ON DELETE SET NULL
);

ALTER TABLE public.beneficios_fechamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "beneficios_fechamentos_select" ON public.beneficios_fechamentos;
CREATE POLICY "beneficios_fechamentos_select" ON public.beneficios_fechamentos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "beneficios_fechamentos_all" ON public.beneficios_fechamentos;
CREATE POLICY "beneficios_fechamentos_all" ON public.beneficios_fechamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
