CREATE TABLE IF NOT EXISTS public.auditoria_acessos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  acao TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auditoria_acessos_user_id_fkey'
  ) THEN
    ALTER TABLE public.auditoria_acessos
      ADD CONSTRAINT auditoria_acessos_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.auditoria_acessos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.auditoria_acessos;
CREATE POLICY "Allow all access to authenticated users" ON public.auditoria_acessos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_auditoria_acessos_created_at ON public.auditoria_acessos(created_at DESC);
