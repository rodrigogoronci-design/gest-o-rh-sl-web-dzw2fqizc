DO $$
BEGIN
  -- Remove os possíveis dados incorretos ou em duplicidade de março de 2026 
  -- para que possamos transferir os de abril com segurança, evitando conflitos de chave única.
  DELETE FROM public.beneficios_ticket WHERE mes_ano = '2026-03';
  DELETE FROM public.beneficios_transporte WHERE mes_ano = '2026-03';
  DELETE FROM public.escala_mes WHERE mes_ano = '2026-03';

  -- Transfere os dados consolidados de abril para março
  UPDATE public.beneficios_ticket SET mes_ano = '2026-03' WHERE mes_ano = '2026-04';
  UPDATE public.beneficios_transporte SET mes_ano = '2026-03' WHERE mes_ano = '2026-04';
  UPDATE public.escala_mes SET mes_ano = '2026-03' WHERE mes_ano = '2026-04';
END $$;
