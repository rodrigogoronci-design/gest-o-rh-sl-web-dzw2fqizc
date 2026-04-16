DO $$
BEGIN
  -- Atualiza o nome da colaboradora para o nome completo conforme solicitado pelo cliente
  UPDATE public.colaboradores
  SET nome = 'GISELLY OLIVEIRA CAETANO MOURA'
  WHERE nome ILIKE '%giselly%';
  
  -- Sincroniza o metadata do usuário no auth.users caso exista
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{name}', '"GISELLY OLIVEIRA CAETANO MOURA"')
  WHERE raw_user_meta_data->>'name' ILIKE '%giselly%';
END $$;
