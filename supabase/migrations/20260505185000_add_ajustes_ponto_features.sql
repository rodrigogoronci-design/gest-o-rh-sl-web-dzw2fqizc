DO $$
BEGIN
  -- Add documento_url if not exists
  ALTER TABLE public.ajustes_ponto ADD COLUMN IF NOT EXISTS documento_url TEXT;

  -- Ensure UPDATE policy exists for managers to approve
  DROP POLICY IF EXISTS "ajustes_ponto_update" ON public.ajustes_ponto;
  CREATE POLICY "ajustes_ponto_update" ON public.ajustes_ponto
    FOR UPDATE TO authenticated
    USING (is_in_my_team(colaborador_id));
END $$;

-- Storage Bucket setup
INSERT INTO storage.buckets (id, name, public) 
VALUES ('anexos_ajustes', 'anexos_ajustes', true) 
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anexos_ajustes_public_read" ON storage.objects;
CREATE POLICY "anexos_ajustes_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'anexos_ajustes');

DROP POLICY IF EXISTS "anexos_ajustes_insert" ON storage.objects;
CREATE POLICY "anexos_ajustes_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'anexos_ajustes');
