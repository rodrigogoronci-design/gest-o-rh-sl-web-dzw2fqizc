DO $$
BEGIN
  -- Remover da tabela de colaboradores
  DELETE FROM public.colaboradores 
  WHERE email IN ('funcionario@empresa.com', 'gestor@empresa.com', 'admin@empresa.com')
     OR nome ILIKE 'Ana Silva' 
     OR nome ILIKE 'Carlos Oliveira' 
     OR nome ILIKE 'Mariana Santos';

  -- Remover da auth.users
  DELETE FROM auth.users 
  WHERE email IN ('funcionario@empresa.com', 'gestor@empresa.com', 'admin@empresa.com')
     OR raw_user_meta_data->>'name' ILIKE 'Ana Silva'
     OR raw_user_meta_data->>'name' ILIKE 'Carlos Oliveira'
     OR raw_user_meta_data->>'name' ILIKE 'Mariana Santos';
END $$;
