import { supabase } from '@/lib/supabase/client'

export const loadBeneficiosData = async (month: string) => {
  const [cols, plantoes, tickets, transports] = await Promise.all([
    supabase.from('colaboradores').select('*'),
    supabase.from('plantoes').select('*'),
    supabase.from('beneficios_ticket').select('*').eq('mes_ano', month),
    supabase.from('beneficios_transporte').select('*').eq('mes_ano', month),
  ])

  return {
    cols: cols.data || [],
    plantoes: plantoes.data || [],
    tickets: tickets.data || [],
    transports: transports.data || [],
  }
}

export const toggleUserShift = async (date: string, userId: string, isAdding: boolean) => {
  if (isAdding) {
    await supabase.from('plantoes').insert({ data: date, colaborador_id: userId })
  } else {
    await supabase.from('plantoes').delete().match({ data: date, colaborador_id: userId })
  }
}

export const saveTicketsBatch = async (rows: any[]) => {
  return supabase.from('beneficios_ticket').upsert(rows, { onConflict: 'colaborador_id,mes_ano' })
}

export const saveTransportBatch = async (rows: any[]) => {
  return supabase
    .from('beneficios_transporte')
    .upsert(rows, { onConflict: 'colaborador_id,mes_ano' })
}

export const createDbUser = async (payload: { email: string; name: string; role: string }) => {
  return supabase.functions.invoke('manage-user', { body: { action: 'create', payload } })
}

export const deleteDbUser = async (id: string) => {
  return supabase.functions.invoke('manage-user', { body: { action: 'delete', payload: { id } } })
}
