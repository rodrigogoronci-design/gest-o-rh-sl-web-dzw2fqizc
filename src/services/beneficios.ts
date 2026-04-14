import { supabase } from '@/lib/supabase/client'
import { eachDayOfInterval, format, subMonths, setDate } from 'date-fns'

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

export const syncAllUsersBeneficios = async (month: string) => {
  const [year, m] = month.split('-').map(Number)
  const selectedDate = new Date(year, m - 1, 1)

  const periodEnd = setDate(selectedDate, 24)
  const periodStart = setDate(subMonths(selectedDate, 1), 25)
  const startStr = format(periodStart, 'yyyy-MM-dd')
  const endStr = format(periodEnd, 'yyyy-MM-dd')

  const [cols, faltas, ferias, tickets, transports] = await Promise.all([
    supabase.from('colaboradores').select('id, role'),
    supabase.from('faltas').select('*').gte('data', startStr).lte('data', endStr),
    supabase.from('ferias').select('*').lte('data_inicio', endStr).gte('data_fim', startStr),
    supabase.from('beneficios_ticket').select('*').eq('mes_ano', month),
    supabase.from('beneficios_transporte').select('*').eq('mes_ano', month),
  ])

  const users = cols.data || []
  const faltasData = faltas.data || []
  const feriasData = ferias.data || []
  const ticketsData = tickets.data || []
  const transportsData = transports.data || []

  const days = eachDayOfInterval({ start: periodStart, end: periodEnd })
  const daysStrs = days.map((d) => format(d, 'yyyy-MM-dd'))

  const ticketUpdates: any[] = []
  const transportUpdates: any[] = []

  users.forEach((user) => {
    if (user.role === 'Admin' || user.role === 'admin') return

    const userId = user.id

    const userFaltas = faltasData.filter((f) => f.colaborador_id === userId).length

    let userFerias = 0
    const userFeriasList = feriasData.filter((f) => f.colaborador_id === userId)
    if (userFeriasList.length > 0) {
      daysStrs.forEach((dateStr) => {
        const isFeria = userFeriasList.some(
          (f) => dateStr >= f.data_inicio && dateStr <= f.data_fim,
        )
        if (isFeria) userFerias++
      })
    }

    const existingTicket = ticketsData.find((t) => t.colaborador_id === userId)
    const existingTransport = transportsData.find((t) => t.colaborador_id === userId)

    if (
      !existingTicket ||
      existingTicket.faltas !== userFaltas ||
      existingTicket.ferias !== userFerias
    ) {
      ticketUpdates.push({
        id: existingTicket?.id,
        colaborador_id: userId,
        mes_ano: month,
        faltas: userFaltas,
        ferias: userFerias,
        dias_uteis: existingTicket?.dias_uteis ?? 22,
        atestados: existingTicket?.atestados ?? 0,
        plantoes: existingTicket?.plantoes ?? 0,
      })
    }

    if (
      !existingTransport ||
      existingTransport.faltas !== userFaltas ||
      existingTransport.ferias !== userFerias
    ) {
      transportUpdates.push({
        id: existingTransport?.id,
        colaborador_id: userId,
        mes_ano: month,
        faltas: userFaltas,
        ferias: userFerias,
        dias_uteis: existingTransport?.dias_uteis ?? 22,
        atestados: existingTransport?.atestados ?? 0,
        home_office: existingTransport?.home_office ?? 0,
      })
    }
  })

  if (ticketUpdates.length > 0) {
    await supabase
      .from('beneficios_ticket')
      .upsert(ticketUpdates, { onConflict: 'colaborador_id,mes_ano' })
  }
  if (transportUpdates.length > 0) {
    await supabase
      .from('beneficios_transporte')
      .upsert(transportUpdates, { onConflict: 'colaborador_id,mes_ano' })
  }
}
