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

export const saveTicketsBatch = async (rows: any[], month: string) => {
  const { error } = await supabase
    .from('beneficios_ticket')
    .upsert(rows, { onConflict: 'colaborador_id,mes_ano' })
  if (error) return { error }

  const { data: existingTransports } = await supabase
    .from('beneficios_transporte')
    .select('*')
    .eq('mes_ano', month)

  const transportsMap = (existingTransports || []).reduce((acc: any, t: any) => {
    acc[t.colaborador_id] = t
    return acc
  }, {})

  const transportRows = rows.map((r: any) => {
    const existing = transportsMap[r.colaborador_id] || { home_office: 0 }
    return {
      colaborador_id: r.colaborador_id,
      mes_ano: r.mes_ano,
      dias_uteis: r.dias_uteis,
      ferias: r.ferias,
      atestados: r.atestados,
      faltas: r.faltas,
      home_office: existing.home_office,
    }
  })

  return supabase
    .from('beneficios_transporte')
    .upsert(transportRows, { onConflict: 'colaborador_id,mes_ano' })
}

export const saveTransportBatch = async (rows: any[], month: string) => {
  const { error } = await supabase
    .from('beneficios_transporte')
    .upsert(rows, { onConflict: 'colaborador_id,mes_ano' })
  if (error) return { error }

  const { data: existingTickets } = await supabase
    .from('beneficios_ticket')
    .select('*')
    .eq('mes_ano', month)

  const ticketsMap = (existingTickets || []).reduce((acc: any, t: any) => {
    acc[t.colaborador_id] = t
    return acc
  }, {})

  const ticketRows = rows.map((r: any) => {
    const existing = ticketsMap[r.colaborador_id] || { plantoes: 0 }
    return {
      colaborador_id: r.colaborador_id,
      mes_ano: r.mes_ano,
      dias_uteis: r.dias_uteis,
      ferias: r.ferias,
      atestados: r.atestados,
      faltas: r.faltas,
      plantoes: existing.plantoes,
    }
  })

  return supabase
    .from('beneficios_ticket')
    .upsert(ticketRows, { onConflict: 'colaborador_id,mes_ano' })
}

export const createDbUser = async (payload: { email: string; name: string; role: string }) => {
  return supabase.functions.invoke('manage-user', { body: { action: 'create', payload } })
}

export const updateDbUser = async (payload: {
  id: string
  email: string
  name: string
  role: string
}) => {
  return supabase.functions.invoke('manage-user', { body: { action: 'update', payload } })
}

export const deleteDbUser = async (id: string) => {
  return supabase.functions.invoke('manage-user', { body: { action: 'delete', payload: { id } } })
}
