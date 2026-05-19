DO $DO$
DECLARE
  v_user_id uuid;
  v_email text := 'ismael@servicelogic.com.br';
BEGIN
  -- Verificar se o usuário já existe no auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email LIMIT 1;
  
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      v_email,
      crypt('Nayara@151088', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Ismael Bomfim", "app_source": "controle-de-beneficios"}',
      false, 'authenticated', 'authenticated',
      '',    -- confirmation_token: MUST be '' not NULL
      '',    -- recovery_token: MUST be '' not NULL
      '',    -- email_change_token_new: MUST be '' not NULL
      '',    -- email_change: MUST be '' not NULL
      '',    -- email_change_token_current: MUST be '' not NULL
      NULL,  -- phone: MUST be NULL (not '') due to UNIQUE constraint
      '',    -- phone_change: MUST be '' not NULL
      '',    -- phone_change_token: MUST be '' not NULL
      ''     -- reauthentication_token: MUST be '' not NULL
    );
  ELSE
    -- Forçar atualização de senha e campos essenciais para restaurar acesso caso já exista
    UPDATE auth.users
    SET 
      encrypted_password = crypt('Nayara@151088', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      confirmation_token = COALESCE(confirmation_token, ''),
      recovery_token = COALESCE(recovery_token, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      email_change = COALESCE(email_change, ''),
      email_change_token_current = COALESCE(email_change_token_current, ''),
      phone_change = COALESCE(phone_change, ''),
      phone_change_token = COALESCE(phone_change_token, ''),
      reauthentication_token = COALESCE(reauthentication_token, '')
    WHERE id = v_user_id;
  END IF;

  -- Criar ou atualizar o perfil na tabela de colaboradores com o mesmo UUID
  IF NOT EXISTS (SELECT 1 FROM public.colaboradores WHERE id = v_user_id OR email = v_email) THEN
    INSERT INTO public.colaboradores (
      id, user_id, email, nome, role, app_source, status
    ) VALUES (
      v_user_id,
      v_user_id,
      v_email,
      'Ismael Bomfim',
      'Admin',
      'controle-de-beneficios',
      'Ativo'
    );
  ELSE
    UPDATE public.colaboradores
    SET 
      user_id = v_user_id, 
      role = 'Admin',
      status = 'Ativo',
      app_source = 'controle-de-beneficios',
      nome = 'Ismael Bomfim'
    WHERE email = v_email;
  END IF;
  
END $DO$;
