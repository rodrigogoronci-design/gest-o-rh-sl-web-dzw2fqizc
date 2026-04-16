DO $$
BEGIN
  -- Atualiza o nome do colaborador para o nome completo conforme solicitado pelo cliente
  UPDATE public.colaboradores
  SET nome = 'Felipe da Silva Borges'
  WHERE nome ILIKE '%felipe%';
  
  -- Sincroniza o metadata do usuário no auth.users caso exista
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{name}', '"Felipe da Silva Borges"')
  WHERE raw_user_meta_data->>'name' ILIKE '%felipe%';
END $$;
