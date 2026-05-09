-- Adiciona trava de segurança para impedir múltiplas entradas simultâneas abertas no mesmo dia
CREATE OR REPLACE FUNCTION public.prevent_duplicate_entrada()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_last_registro record;
  v_dia date;
BEGIN
  IF NEW.tipo_registro = 'entrada' THEN
    v_dia := (NEW.data_hora AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date;
    
    -- Busca o último registro do dia do colaborador
    SELECT * INTO v_last_registro
    FROM public.registro_ponto
    WHERE colaborador_id = NEW.colaborador_id
      AND (data_hora AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date = v_dia
      AND id != NEW.id
    ORDER BY data_hora DESC
    LIMIT 1;

    -- Se encontrou um registro e o último NÃO for saída, o ponto ainda está aberto (em andamento)
    IF FOUND AND v_last_registro.tipo_registro != 'saida' THEN
      RAISE EXCEPTION 'Já existe uma marcação aberta para este colaborador no dia vigente.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_entrada ON public.registro_ponto;
CREATE TRIGGER trg_prevent_duplicate_entrada
  BEFORE INSERT ON public.registro_ponto
  FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_entrada();
