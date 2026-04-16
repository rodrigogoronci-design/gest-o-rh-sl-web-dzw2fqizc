DO $$
BEGIN
  ALTER TABLE public.contracheques ADD COLUMN IF NOT EXISTS dados_extraidos JSONB;
END $$;
