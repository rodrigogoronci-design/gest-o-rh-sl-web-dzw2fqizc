CREATE TABLE IF NOT EXISTS public.dispositivos_autorizados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    device_id_hash TEXT NOT NULL UNIQUE,
    tipo TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    ultima_autenticacao TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.registro_ponto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitude NUMERIC,
    longitude NUMERIC,
    foto_url TEXT,
    status TEXT NOT NULL DEFAULT 'pendente',
    tipo_registro TEXT NOT NULL,
    obs_usuario TEXT,
    device_id_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS local_trabalho_lat NUMERIC;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS local_trabalho_lng NUMERIC;

-- RLS
ALTER TABLE public.dispositivos_autorizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registro_ponto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_dispositivos" ON public.dispositivos_autorizados;
CREATE POLICY "authenticated_all_dispositivos" ON public.dispositivos_autorizados FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_registro_ponto" ON public.registro_ponto;
CREATE POLICY "authenticated_all_registro_ponto" ON public.registro_ponto FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('ponto_fotos', 'ponto_fotos', true) ON CONFLICT DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;
CREATE POLICY "Give users access to own folder" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'ponto_fotos') WITH CHECK (bucket_id = 'ponto_fotos');

DROP POLICY IF EXISTS "Public access to fotos" ON storage.objects;
CREATE POLICY "Public access to fotos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'ponto_fotos');
