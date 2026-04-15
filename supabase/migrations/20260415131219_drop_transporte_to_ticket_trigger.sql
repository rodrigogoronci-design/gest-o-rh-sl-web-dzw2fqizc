-- Drop the trigger that syncs from transporte to ticket
-- so that manual edits in Transporte do not affect Ticket and they become independent
DROP TRIGGER IF EXISTS on_transporte_changes_sync_ticket ON public.beneficios_transporte;
DROP FUNCTION IF EXISTS public.sync_transporte_to_ticket();
