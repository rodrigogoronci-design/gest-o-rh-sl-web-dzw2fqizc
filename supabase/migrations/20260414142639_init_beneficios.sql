CREATE TABLE IF NOT EXISTS public.colaboradores (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nome TEXT NOT NULL,
    role TEXT DEFAULT 'Colaborador',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.plantoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
    data DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(colaborador_id, data)
);

CREATE TABLE IF NOT EXISTS public.beneficios_ticket (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
    mes_ano TEXT NOT NULL,
    dias_uteis INT NOT NULL DEFAULT 0,
    plantoes INT NOT NULL DEFAULT 0,
    atestados INT NOT NULL DEFAULT 0,
    ferias INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(colaborador_id, mes_ano)
);

CREATE TABLE IF NOT EXISTS public.beneficios_transporte (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
    mes_ano TEXT NOT NULL,
    dias_uteis INT NOT NULL DEFAULT 0,
    home_office INT NOT NULL DEFAULT 0,
    ferias INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(colaborador_id, mes_ano)
);

-- RLS
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.colaboradores;
CREATE POLICY "Allow all access to authenticated users" ON public.colaboradores FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.plantoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.plantoes;
CREATE POLICY "Allow all access to authenticated users" ON public.plantoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.beneficios_ticket ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.beneficios_ticket;
CREATE POLICY "Allow all access to authenticated users" ON public.beneficios_ticket FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.beneficios_transporte ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.beneficios_transporte;
CREATE POLICY "Allow all access to authenticated users" ON public.beneficios_transporte FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seeds
DO $$
DECLARE
    admin_id uuid;
    joao_id uuid;
BEGIN
    -- Admin
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@app.com') THEN
        admin_id := gen_random_uuid();
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at,
            created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
            is_super_admin, role, aud,
            confirmation_token, recovery_token, email_change_token_new,
            email_change, email_change_token_current,
            phone, phone_change, phone_change_token, reauthentication_token
        ) VALUES (
            admin_id, '00000000-0000-0000-0000-000000000000', 'admin@app.com',
            crypt('Skip@Pass123!', gen_salt('bf')), NOW(), NOW(), NOW(),
            '{"provider": "email", "providers": ["email"]}', '{"name": "Administrador"}',
            false, 'authenticated', 'authenticated',
            '', '', '', '', '', NULL, '', '', ''
        );
        INSERT INTO public.colaboradores (id, user_id, email, nome, role)
        VALUES (admin_id, admin_id, 'admin@app.com', 'Administrador Silva', 'Admin')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Joao
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'joao@app.com') THEN
        joao_id := gen_random_uuid();
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at,
            created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
            is_super_admin, role, aud,
            confirmation_token, recovery_token, email_change_token_new,
            email_change, email_change_token_current,
            phone, phone_change, phone_change_token, reauthentication_token
        ) VALUES (
            joao_id, '00000000-0000-0000-0000-000000000000', 'joao@app.com',
            crypt('Skip@Pass123!', gen_salt('bf')), NOW(), NOW(), NOW(),
            '{"provider": "email", "providers": ["email"]}', '{"name": "João Funcionário"}',
            false, 'authenticated', 'authenticated',
            '', '', '', '', '', NULL, '', '', ''
        );
        INSERT INTO public.colaboradores (id, user_id, email, nome, role)
        VALUES (joao_id, joao_id, 'joao@app.com', 'João Funcionário', 'Colaborador')
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
