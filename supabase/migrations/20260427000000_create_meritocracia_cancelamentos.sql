DO $$
BEGIN
    CREATE TABLE IF NOT EXISTS public.meritocracia_cancelamentos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mes_ano TEXT NOT NULL,
        cliente_nome TEXT NOT NULL,
        data_cancelamento DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
    );

    ALTER TABLE public.meritocracia_cancelamentos ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.meritocracia_cancelamentos;
    CREATE POLICY "Allow all access to authenticated users" ON public.meritocracia_cancelamentos
        FOR ALL TO authenticated USING (true) WITH CHECK (true);

    -- Insert default config for valor base if not exists
    INSERT INTO public.configuracoes (chave, valor)
    VALUES ('meritocracia_valor_base', '{"amount": 700}'::jsonb)
    ON CONFLICT (chave) DO NOTHING;
END $$;
