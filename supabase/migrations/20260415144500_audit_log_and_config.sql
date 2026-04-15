DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.configuracoes (
    chave TEXT PRIMARY KEY,
    valor JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.historico_ajustes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.colaboradores(id) ON DELETE SET NULL,
    acao TEXT NOT NULL,
    detalhes JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.historico_ajustes ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.configuracoes;
  CREATE POLICY "Allow all access to authenticated users" ON public.configuracoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.historico_ajustes;
  CREATE POLICY "Allow all access to authenticated users" ON public.historico_ajustes FOR ALL TO authenticated USING (true) WITH CHECK (true);

  INSERT INTO public.configuracoes (chave, valor) VALUES 
    ('ticket_value', '31.59'::jsonb),
    ('transport_value', '10.20'::jsonb)
  ON CONFLICT (chave) DO NOTHING;
END $$;
