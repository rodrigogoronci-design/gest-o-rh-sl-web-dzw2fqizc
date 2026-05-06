DO $$
BEGIN
  -- Limpeza de Status de Falta para fins de semana sem plantão
  DELETE FROM public.faltas 
  WHERE EXTRACT(ISODOW FROM data) IN (6, 7) -- 6=Saturday, 7=Sunday
  AND NOT EXISTS (
    SELECT 1 FROM public.plantoes p WHERE p.colaborador_id = faltas.colaborador_id AND p.data = faltas.data
  );

  -- Limpar Plantões indevidos da Brunella nos fins de semana reportados para corrigir problemas de histórico
  DELETE FROM public.plantoes
  WHERE data IN ('2026-05-03', '2026-05-04', '2025-05-03', '2025-05-04')
  AND colaborador_id IN (
    SELECT id FROM public.colaboradores WHERE nome ILIKE '%BRUNELLA NUNES MOREIRA SILVA%'
  );

END $$;

-- Regra de Tolerância de 5 Minutos (Motor de Ponto)
CREATE OR REPLACE FUNCTION public.apply_ponto_tolerance()
RETURNS trigger AS $$
DECLARE
  v_colab record;
  v_time time;
  v_expected time;
  v_diff interval;
BEGIN
  -- Se o status já for definido como aprovado/validado manualmente, não sobrescrever
  IF NEW.status IN ('validado', 'aprovado') THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_colab FROM public.colaboradores WHERE id = NEW.colaborador_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Converter o data_hora para a hora local
  v_time := (NEW.data_hora AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::time;

  -- Obter horário esperado de acordo com o tipo de registro
  IF NEW.tipo_registro = 'entrada' AND v_colab.jornada_entrada IS NOT NULL THEN
    v_expected := v_colab.jornada_entrada::time;
  ELSIF NEW.tipo_registro IN ('saida_intervalo', 'intervalo_saida', 'saida_de_intervalo') AND v_colab.jornada_saida_intervalo IS NOT NULL THEN
    v_expected := v_colab.jornada_saida_intervalo::time;
  ELSIF NEW.tipo_registro IN ('retorno_intervalo', 'intervalo_retorno', 'retorno_de_intervalo') AND v_colab.jornada_retorno_intervalo IS NOT NULL THEN
    v_expected := v_colab.jornada_retorno_intervalo::time;
  ELSIF NEW.tipo_registro = 'saida' AND v_colab.jornada_saida IS NOT NULL THEN
    v_expected := v_colab.jornada_saida::time;
  ELSE
    -- Sem escala definida ou tipo_registro desconhecido, vai para pendente e aprovação gerencial
    NEW.status := 'pendente';
    RETURN NEW;
  END IF;

  -- Calcular diferença de horas
  v_diff := v_time - v_expected;
  
  -- Lidar com virada de dia (ex: esperado 23:55, batido 00:02 = diferença 7 minutos real, não 23h)
  IF v_diff < interval '-12 hours' THEN
    v_diff := v_diff + interval '24 hours';
  ELSIF v_diff > interval '12 hours' THEN
    v_diff := v_diff - interval '24 hours';
  END IF;

  -- Se a variação for de até 5 minutos, aprovar automaticamente
  IF ABS(EXTRACT(EPOCH FROM v_diff) / 60) <= 5 THEN
    NEW.status := 'validado';
  ELSE
    NEW.status := 'pendente';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_ponto_tolerance ON public.registro_ponto;
CREATE TRIGGER on_ponto_tolerance
  BEFORE INSERT OR UPDATE ON public.registro_ponto
  FOR EACH ROW EXECUTE FUNCTION public.apply_ponto_tolerance();

-- Trigger para Invalidar Falta pendente/histórica ao aprovar ajuste no fim de semana ou dia normal
CREATE OR REPLACE FUNCTION public.on_ajuste_ponto_invalidate_falta()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'aprovado' THEN
    DELETE FROM public.faltas 
    WHERE colaborador_id = NEW.colaborador_id AND data = NEW.data;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_ajuste_ponto_invalidate_falta ON public.ajustes_ponto;
CREATE TRIGGER trg_ajuste_ponto_invalidate_falta
  AFTER INSERT OR UPDATE OF status ON public.ajustes_ponto
  FOR EACH ROW EXECUTE FUNCTION public.on_ajuste_ponto_invalidate_falta();
