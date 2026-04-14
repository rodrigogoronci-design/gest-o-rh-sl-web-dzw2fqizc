CREATE TABLE IF NOT EXISTS public.atestados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  quantidade_dias INTEGER NOT NULL,
  arquivo_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.atestados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.atestados;
CREATE POLICY "Allow all access to authenticated users" ON public.atestados
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.beneficios_transporte ADD COLUMN IF NOT EXISTS atestados INTEGER NOT NULL DEFAULT 0;

INSERT INTO storage.buckets (id, name, public) VALUES ('atestados', 'atestados', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Atestados Upload" ON storage.objects;
CREATE POLICY "Atestados Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'atestados');

DROP POLICY IF EXISTS "Atestados Read" ON storage.objects;
CREATE POLICY "Atestados Read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'atestados');

DROP POLICY IF EXISTS "Atestados Delete" ON storage.objects;
CREATE POLICY "Atestados Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'atestados');
