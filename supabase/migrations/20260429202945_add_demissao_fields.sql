ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS data_demissao DATE;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS motivo_demissao TEXT;
