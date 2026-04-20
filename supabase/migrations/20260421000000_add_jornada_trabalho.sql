ALTER TABLE public.colaboradores 
ADD COLUMN IF NOT EXISTS jornada_entrada TEXT,
ADD COLUMN IF NOT EXISTS jornada_saida_intervalo TEXT,
ADD COLUMN IF NOT EXISTS jornada_retorno_intervalo TEXT,
ADD COLUMN IF NOT EXISTS jornada_saida TEXT;
