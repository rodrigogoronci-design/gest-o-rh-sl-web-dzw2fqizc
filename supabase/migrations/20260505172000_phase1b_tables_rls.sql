DO $DO_BLOCK$
BEGIN

  -- 1. ADD COLUMNS TO colaboradores (mapping for employee_rules)
  ALTER TABLE public.colaboradores 
    ADD COLUMN IF NOT EXISTS jornada_diaria NUMERIC,
    ADD COLUMN IF NOT EXISTS intervalo_minutos INTEGER,
    ADD COLUMN IF NOT EXISTS adicional_noturno_percentual NUMERIC;

  -- 2. CREATE NEW TABLES
  CREATE TABLE IF NOT EXISTS public.ajustes_ponto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
    data DATE NOT NULL,
    tipo TEXT NOT NULL,
    motivo TEXT,
    horas NUMERIC,
    justificativa TEXT,
    status TEXT DEFAULT 'pendente',
    aprovado_por UUID REFERENCES public.colaboradores(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.afastamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    tipo TEXT NOT NULL,
    dias_afastado INTEGER,
    justificativa TEXT,
    documento_anexo TEXT,
    status TEXT DEFAULT 'pendente',
    aprovado_por UUID REFERENCES public.colaboradores(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.periodos_folha (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    status TEXT DEFAULT 'aberto',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.calculos_horas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
    periodo_id UUID REFERENCES public.periodos_folha(id) ON DELETE CASCADE NOT NULL,
    horas_normais NUMERIC DEFAULT 0,
    horas_extras NUMERIC DEFAULT 0,
    horas_noturnas NUMERIC DEFAULT 0,
    faltas NUMERIC DEFAULT 0,
    banco_horas_saldo NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

END $DO_BLOCK$;

-- ENABLE RLS
ALTER TABLE public.ajustes_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afastamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_folha ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculos_horas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registro_ponto ENABLE ROW LEVEL SECURITY;

-- 3. HELPER FUNCTIONS FOR RLS (Security Definer to avoid infinite recursion)
CREATE OR REPLACE FUNCTION public.get_current_colaborador_id()
RETURNS UUID AS $FUNC$
  SELECT id FROM public.colaboradores WHERE user_id = auth.uid() LIMIT 1;
$FUNC$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_in_my_team(target_colab_id UUID)
RETURNS BOOLEAN AS $FUNC$
DECLARE
  my_role TEXT;
  my_dept TEXT;
  target_dept TEXT;
BEGIN
  SELECT role, departamento INTO my_role, my_dept FROM public.colaboradores WHERE user_id = auth.uid() LIMIT 1;
  
  IF my_role ILIKE 'admin' OR my_role ILIKE 'administrador' THEN
    RETURN TRUE;
  END IF;

  IF my_role ILIKE 'gerente' THEN
    SELECT departamento INTO target_dept FROM public.colaboradores WHERE id = target_colab_id;
    IF target_dept = my_dept THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$FUNC$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. RLS POLICIES

-- periodos_folha (all authenticated users can read)
DROP POLICY IF EXISTS "allow_read_periodos" ON public.periodos_folha;
CREATE POLICY "allow_read_periodos" ON public.periodos_folha FOR SELECT TO authenticated USING (true);

-- colaboradores
DROP POLICY IF EXISTS "Allow all access to anon users" ON public.colaboradores;
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.colaboradores;
DROP POLICY IF EXISTS "colaboradores_select" ON public.colaboradores;
CREATE POLICY "colaboradores_select" ON public.colaboradores
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_in_my_team(id));

DROP POLICY IF EXISTS "colaboradores_update" ON public.colaboradores;
CREATE POLICY "colaboradores_update" ON public.colaboradores
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_in_my_team(id));

-- registro_ponto
DROP POLICY IF EXISTS "authenticated_all_registro_ponto" ON public.registro_ponto;
DROP POLICY IF EXISTS "registro_ponto_select" ON public.registro_ponto;
CREATE POLICY "registro_ponto_select" ON public.registro_ponto
  FOR SELECT TO authenticated
  USING (colaborador_id = public.get_current_colaborador_id() OR public.is_in_my_team(colaborador_id));

DROP POLICY IF EXISTS "registro_ponto_insert" ON public.registro_ponto;
CREATE POLICY "registro_ponto_insert" ON public.registro_ponto
  FOR INSERT TO authenticated
  WITH CHECK (colaborador_id = public.get_current_colaborador_id() OR public.is_in_my_team(colaborador_id));

-- ajustes_ponto
DROP POLICY IF EXISTS "ajustes_ponto_select" ON public.ajustes_ponto;
CREATE POLICY "ajustes_ponto_select" ON public.ajustes_ponto
  FOR SELECT TO authenticated
  USING (colaborador_id = public.get_current_colaborador_id() OR public.is_in_my_team(colaborador_id));

DROP POLICY IF EXISTS "ajustes_ponto_insert" ON public.ajustes_ponto;
CREATE POLICY "ajustes_ponto_insert" ON public.ajustes_ponto
  FOR INSERT TO authenticated
  WITH CHECK (colaborador_id = public.get_current_colaborador_id() OR public.is_in_my_team(colaborador_id));

-- afastamentos
DROP POLICY IF EXISTS "afastamentos_select" ON public.afastamentos;
CREATE POLICY "afastamentos_select" ON public.afastamentos
  FOR SELECT TO authenticated
  USING (colaborador_id = public.get_current_colaborador_id() OR public.is_in_my_team(colaborador_id));

DROP POLICY IF EXISTS "afastamentos_insert" ON public.afastamentos;
CREATE POLICY "afastamentos_insert" ON public.afastamentos
  FOR INSERT TO authenticated
  WITH CHECK (colaborador_id = public.get_current_colaborador_id() OR public.is_in_my_team(colaborador_id));

-- calculos_horas
DROP POLICY IF EXISTS "calculos_horas_select" ON public.calculos_horas;
CREATE POLICY "calculos_horas_select" ON public.calculos_horas
  FOR SELECT TO authenticated
  USING (colaborador_id = public.get_current_colaborador_id() OR public.is_in_my_team(colaborador_id));

-- 5. SEED DATA
DO $SEED$
DECLARE
  v_func_uid UUID;
  v_gest_uid UUID;
  v_admin_uid UUID;
BEGIN
  -- 1. Funcionario: Ana Silva
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'funcionario@empresa.com') THEN
    v_func_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_func_uid, '00000000-0000-0000-0000-000000000000', 'funcionario@empresa.com', crypt('Senha123!', gen_salt('bf')), NOW(),
      NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Ana Silva"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
    INSERT INTO public.colaboradores (id, user_id, email, nome, role, departamento, cargo, jornada_diaria, intervalo_minutos)
    VALUES (v_func_uid, v_func_uid, 'funcionario@empresa.com', 'Ana Silva', 'Colaborador', 'TI', 'Desenvolvedora', 8, 60)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- 2. Gestor: Carlos Oliveira
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'gestor@empresa.com') THEN
    v_gest_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_gest_uid, '00000000-0000-0000-0000-000000000000', 'gestor@empresa.com', crypt('Senha123!', gen_salt('bf')), NOW(),
      NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Carlos Oliveira"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
    INSERT INTO public.colaboradores (id, user_id, email, nome, role, departamento, cargo)
    VALUES (v_gest_uid, v_gest_uid, 'gestor@empresa.com', 'Carlos Oliveira', 'Gerente', 'TI', 'Gestor de TI')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- 3. Admin: Mariana Santos
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@empresa.com') THEN
    v_admin_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_admin_uid, '00000000-0000-0000-0000-000000000000', 'admin@empresa.com', crypt('Senha123!', gen_salt('bf')), NOW(),
      NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Mariana Santos"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
    INSERT INTO public.colaboradores (id, user_id, email, nome, role, departamento, cargo)
    VALUES (v_admin_uid, v_admin_uid, 'admin@empresa.com', 'Mariana Santos', 'Admin', 'Diretoria', 'Administradora')
    ON CONFLICT (id) DO NOTHING;
  END IF;

END $SEED$;
