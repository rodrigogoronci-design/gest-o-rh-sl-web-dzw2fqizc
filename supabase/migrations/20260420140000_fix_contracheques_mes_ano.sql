DO $$
BEGIN
  -- Normaliza todos os registros de mes_ano da tabela contracheques
  -- Convertendo de formato 'MM/YYYY' para 'YYYY-MM' para garantir alinhamento com o Dashboard
  UPDATE public.contracheques
  SET mes_ano = SUBSTRING(mes_ano FROM 4 FOR 4) || '-' || SUBSTRING(mes_ano FROM 1 FOR 2)
  WHERE mes_ano LIKE '__/____';
END $$;
