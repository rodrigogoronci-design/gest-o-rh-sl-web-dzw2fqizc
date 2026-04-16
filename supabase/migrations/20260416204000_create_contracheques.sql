DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.contracheques (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    mes_ano TEXT NOT NULL,
    arquivo_url TEXT NOT NULL,
    valor_liquido NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(colaborador_id, mes_ano)
  );

  ALTER TABLE public.contracheques ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.contracheques;
  CREATE POLICY "Allow all access to authenticated users" ON public.contracheques FOR ALL TO authenticated USING (true) WITH CHECK (true);
END $$;

-- Create storage bucket if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('contracheques', 'contracheques', false) 
ON CONFLICT (id) DO NOTHING;

-- RLS for storage.objects
DROP POLICY IF EXISTS "Authenticated users can read contracheques" ON storage.objects;
CREATE POLICY "Authenticated users can read contracheques" 
ON storage.objects FOR SELECT TO authenticated 
USING (bucket_id = 'contracheques');

DROP POLICY IF EXISTS "Authenticated users can upload contracheques" ON storage.objects;
CREATE POLICY "Authenticated users can upload contracheques" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'contracheques');

DROP POLICY IF EXISTS "Authenticated users can update contracheques" ON storage.objects;
CREATE POLICY "Authenticated users can update contracheques" 
ON storage.objects FOR UPDATE TO authenticated 
USING (bucket_id = 'contracheques');

DROP POLICY IF EXISTS "Authenticated users can delete contracheques" ON storage.objects;
CREATE POLICY "Authenticated users can delete contracheques" 
ON storage.objects FOR DELETE TO authenticated 
USING (bucket_id = 'contracheques');
