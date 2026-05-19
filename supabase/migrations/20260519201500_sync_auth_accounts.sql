DO $$
DECLARE
  v_colab record;
  v_new_user_id uuid;
  v_admin_id uuid;
BEGIN
  -- 1. Create/Update Admin User "ismael@servicelogic.com.br"
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'ismael@servicelogic.com.br';
  
  IF v_admin_id IS NULL THEN
    v_admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_admin_id,
      '00000000-0000-0000-0000-000000000000',
      'ismael@servicelogic.com.br',
      crypt('Nayara@151088', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Ismael", "app_source": "controle-de-beneficios"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('Nayara@151088', gen_salt('bf'))
    WHERE id = v_admin_id;
  END IF;

  -- Ensure the admin profile in colaboradores points to v_admin_id
  IF EXISTS (SELECT 1 FROM public.colaboradores WHERE email = 'ismael@servicelogic.com.br') THEN
    UPDATE public.colaboradores SET user_id = v_admin_id WHERE email = 'ismael@servicelogic.com.br';
  ELSE
    INSERT INTO public.colaboradores (nome, email, role, user_id, app_source)
    VALUES ('Ismael', 'ismael@servicelogic.com.br', 'Admin', v_admin_id, 'controle-de-beneficios');
  END IF;

  -- 2. Synchronize other colaboradores missing auth accounts
  FOR v_colab IN 
    SELECT id, email, nome 
    FROM public.colaboradores 
    WHERE email IS NOT NULL AND email != '' AND email != 'ismael@servicelogic.com.br'
  LOOP
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_colab.email) THEN
      v_new_user_id := gen_random_uuid();
      
      INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
        is_super_admin, role, aud,
        confirmation_token, recovery_token, email_change_token_new,
        email_change, email_change_token_current,
        phone, phone_change, phone_change_token, reauthentication_token
      ) VALUES (
        v_new_user_id,
        '00000000-0000-0000-0000-000000000000',
        v_colab.email,
        crypt('Skip@Pass', gen_salt('bf')),
        NOW(), NOW(), NOW(),
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('name', v_colab.nome, 'app_source', 'controle-de-beneficios'),
        false, 'authenticated', 'authenticated',
        '', '', '', '', '',
        NULL, '', '', ''
      );

      -- Update the colaborator record to point to the new auth.users ID
      UPDATE public.colaboradores
      SET user_id = v_new_user_id
      WHERE id = v_colab.id;
    ELSE
      -- Even if the user exists, ensure user_id in colaboradores is correctly linked
      UPDATE public.colaboradores
      SET user_id = (SELECT id FROM auth.users WHERE email = v_colab.email LIMIT 1)
      WHERE id = v_colab.id AND (user_id IS NULL OR user_id != (SELECT id FROM auth.users WHERE email = v_colab.email LIMIT 1));
    END IF;
  END LOOP;
END $$;

-- 3. Ensure RLS Policy is Correct
DROP POLICY IF EXISTS "colaboradores_select" ON public.colaboradores;
CREATE POLICY "colaboradores_select" ON public.colaboradores
  FOR SELECT TO authenticated 
  USING (
    app_source = 'controle-de-beneficios' AND 
    (user_id = auth.uid() OR is_in_my_team(id))
  );

-- 4. Clean up any NULL tokens in auth.users
UPDATE auth.users
SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE
  confirmation_token IS NULL OR recovery_token IS NULL
  OR email_change_token_new IS NULL OR email_change IS NULL
  OR email_change_token_current IS NULL
  OR phone_change IS NULL OR phone_change_token IS NULL
  OR reauthentication_token IS NULL;
