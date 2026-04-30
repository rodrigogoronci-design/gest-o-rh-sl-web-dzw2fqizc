import { supabase } from '@/lib/supabase/client'
import { eachDayOfInterval, format, subMonths, addMonths, setDate, parseISO } from 'date-fns'

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
  return supabase.from('beneficios_ticket').upsert(rows, { onConflict: 'colaborador_id,mes_ano' })
}

export const saveTransportBatch = async (rows: any[], month: string) => {
  return supabase
    .from('beneficios_transporte')
    .upsert(rows, { onConflict: 'colaborador_id,mes_ano' })
}

export const createDbUser = async (payload: {
  email: string
  name: string
  role: string
  recebe_transporte?: boolean
}) => {
  return supabase.functions.invoke('manage-user', { body: { action: 'create', payload } })
}

export const updateDbUser = async (payload: {
  id: string
  email: string
  name: string
  role: string
  recebe_transporte?: boolean
}) => {
  return supabase.functions.invoke('manage-user', { body: { action: 'update', payload } })
}

export const deleteDbUser = async (id: string) => {
  return supabase.functions.invoke('manage-user', { body: { action: 'delete', payload: { id } } })
}

export const syncAllUsersBeneficios = async (month: string) => {
  const [year, m] = month.split('-').map(Number)
  const selectedDate = new Date(year, m - 1, 1)

  const periodStart = setDate(selectedDate, 25)
  const periodEnd = setDate(addMonths(selectedDate, 1), 24)
  const startStr = format(periodStart, 'yyyy-MM-dd')
  const endStr = format(periodEnd, 'yyyy-MM-dd')

  const prevPeriodStart = setDate(subMonths(selectedDate, 1), 25)
  const prevPeriodEnd = setDate(selectedDate, 24)
  const prevStartStr = format(prevPeriodStart, 'yyyy-MM-dd')
  const prevEndStr = format(prevPeriodEnd, 'yyyy-MM-dd')

  const [
    cols,
    faltas,
    ferias,
    atestados,
    plantoes,
    tickets,
    transports,
    hoData,
    plantoesPrev,
    feriadosDataDb,
    feriadosPrevDataDb,
  ] = await Promise.all([
    supabase.from('colaboradores').select('id, role, recebe_transporte'),
    supabase.from('faltas').select('*').gte('data', prevStartStr).lte('data', prevEndStr),
    supabase.from('ferias').select('*').lte('data_inicio', endStr).gte('data_fim', startStr),
    supabase
      .from('atestados')
      .select('*')
      .gte('data_inicio', prevStartStr)
      .lte('data_inicio', prevEndStr),
    supabase.from('plantoes').select('*').gte('data', startStr).lte('data', endStr),
    supabase.from('beneficios_ticket').select('*').eq('mes_ano', month),
    supabase.from('beneficios_transporte').select('*').eq('mes_ano', month),
    supabase
      .from('dias_home_office')
      .select('data')
      .gte('data', prevStartStr)
      .lte('data', prevEndStr),
    supabase.from('plantoes').select('*').gte('data', prevStartStr).lte('data', prevEndStr),
    supabase.from('feriados').select('*').gte('data', startStr).lte('data', endStr),
    supabase.from('feriados').select('*').gte('data', prevStartStr).lte('data', prevEndStr),
  ])

  const users = cols.data || []
  const faltasData = faltas.data || []
  const feriasData = ferias.data || []
  const atestadosData = atestados.data || []
  const plantoesData = plantoes.data || []
  const ticketsData = tickets.data || []
  const transportsData = transports.data || []
  const hoDataResult = hoData.data || []
  const plantoesPrevData = plantoesPrev.data || []
  const homeOfficeCount = hoDataResult.length

  const feriadosData = feriadosDataDb.data || []
  const holidaysStrs = feriadosData.map((f: any) => f.data)

  const feriadosPrevData = feriadosPrevDataDb.data || []
  const prevHolidaysStrs = feriadosPrevData.map((f: any) => f.data)

  const days = eachDayOfInterval({ start: periodStart, end: periodEnd })
  const daysStrs = days.map((d) => format(d, 'yyyy-MM-dd'))

  let bDays = 0
  days.forEach((d) => {
    const dayOfWeek = d.getDay()
    const dStr = format(d, 'yyyy-MM-dd')
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaysStrs.includes(dStr)) {
      bDays++
    }
  })

  const daysPrev = eachDayOfInterval({ start: prevPeriodStart, end: prevPeriodEnd })
  let prevBDays = 0
  daysPrev.forEach((d) => {
    const dayOfWeek = d.getDay()
    const dStr = format(d, 'yyyy-MM-dd')
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !prevHolidaysStrs.includes(dStr)) {
      prevBDays++
    }
  })

  const ticketUpdates: any[] = []
  const transportUpdates: any[] = []
  const transportDeletes: string[] = []

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

    let userAtestados = 0
    const userAtestadosList = atestadosData.filter((a) => a.colaborador_id === userId)
    userAtestadosList.forEach((a) => {
      userAtestados += a.quantidade_dias || 1
    })

    const userPlantoesData = plantoesData.filter((p) => p.colaborador_id === userId)
    let userShifts = 0
    let userBusinessShifts = 0
    let userHolidayShifts = 0

    userPlantoesData.forEach((p) => {
      const dStr = p.data
      const d = parseISO(dStr)
      const dayOfWeek = d.getDay()
      const isHoliday = holidaysStrs.includes(dStr)

      if (isHoliday) {
        userHolidayShifts++
      } else if (dayOfWeek === 0 || dayOfWeek === 6) {
        userShifts++
      } else {
        userBusinessShifts++
      }
    })

    const hasAnyPlantao = userBusinessShifts + userShifts + userHolidayShifts > 0
    const defaultReg = hasAnyPlantao ? userBusinessShifts : bDays

    const existingTicket = ticketsData.find((t) => t.colaborador_id === userId)
    const existingTransport = transportsData.find((t) => t.colaborador_id === userId)

    ticketUpdates.push({
      colaborador_id: userId,
      mes_ano: month,
      faltas: userFaltas,
      ferias: userFerias,
      atestados: userAtestados,
      plantoes: userShifts,
      dias_uteis: existingTicket ? existingTicket.dias_uteis : defaultReg,
      feriados_trabalhados: existingTicket
        ? (existingTicket as any).feriados_trabalhados || 0
        : userHolidayShifts,
      credito: existingTicket ? existingTicket.credito : 0,
      desconto: existingTicket ? existingTicket.desconto : 0,
      credito_justificativa: existingTicket ? existingTicket.credito_justificativa : '',
      desconto_justificativa: existingTicket ? existingTicket.desconto_justificativa : '',
    })

    const receivesTransport = user.recebe_transporte === true

    const userPlantoesPrevFiltered = plantoesPrevData.filter((p) => p.colaborador_id === userId)
    let userPrevShifts = 0
    let userPrevBusinessShifts = 0
    let userPrevHolidayShifts = 0

    userPlantoesPrevFiltered.forEach((p) => {
      const dStr = p.data
      const d = parseISO(dStr)
      const dayOfWeek = d.getDay()
      const isHoliday = prevHolidaysStrs.includes(dStr)

      if (isHoliday) {
        userPrevHolidayShifts++
      } else if (dayOfWeek === 0 || dayOfWeek === 6) {
        userPrevShifts++
      } else {
        userPrevBusinessShifts++
      }
    })

    const hasAnyPrevPlantao = userPrevBusinessShifts + userPrevShifts + userPrevHolidayShifts > 0
    const defaultPrevReg = hasAnyPrevPlantao ? userPrevBusinessShifts : prevBDays

    if (receivesTransport) {
      transportUpdates.push({
        colaborador_id: userId,
        mes_ano: month,
        faltas: userFaltas,
        ferias: userFerias,
        atestados: userAtestados,
        home_office: homeOfficeCount,
        plantoes: userPrevShifts,
        dias_uteis: existingTransport ? existingTransport.dias_uteis : defaultPrevReg,
        feriados_trabalhados: existingTransport
          ? (existingTransport as any).feriados_trabalhados || 0
          : userPrevHolidayShifts,
        credito: existingTransport ? existingTransport.credito : 0,
        desconto: existingTransport ? existingTransport.desconto : 0,
        credito_justificativa: existingTransport ? existingTransport.credito_justificativa : '',
        desconto_justificativa: existingTransport ? existingTransport.desconto_justificativa : '',
      })
    } else if (existingTransport) {
      transportDeletes.push(existingTransport.id)
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
  if (transportDeletes.length > 0) {
    await supabase.from('beneficios_transporte').delete().in('id', transportDeletes)
  }
}
