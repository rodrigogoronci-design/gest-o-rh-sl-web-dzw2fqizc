import { supabase } from '@/lib/supabase/client'
import { format, subMonths } from 'date-fns'

export const TICKET_RATE = 35.0
export const TRANSPORT_RATE = 12.0

export const getDashboardStats = async (month: string) => {
  const prevMonthDate = subMonths(parseISO(`${month}-01T12:00:00`), 1)
  const prevMonth = format(prevMonthDate, 'yyyy-MM')

  const [tickets, transports, cols, prevTickets, prevTransports] = await Promise.all([
    supabase.from('beneficios_ticket').select('*').eq('mes_ano', month),
    supabase.from('beneficios_transporte').select('*').eq('mes_ano', month),
    supabase.from('colaboradores').select('id, status').eq('status', 'Ativo'),
    supabase.from('beneficios_ticket').select('*').eq('mes_ano', prevMonth),
    supabase.from('beneficios_transporte').select('*').eq('mes_ano', prevMonth),
  ])

  const ticketData = tickets.data || []
  const transportData = transports.data || []
  const prevTicketData = prevTickets.data || []
  const prevTransportData = prevTransports.data || []

  let totalTicketDays = 0
  ticketData.forEach((t) => {
    const days =
      (t.dias_uteis || 0) -
      (t.faltas || 0) -
      (t.ferias || 0) -
      (t.atestados || 0) +
      (t.plantoes || 0)
    if (days > 0) totalTicketDays += days
  })

  let totalTransportDays = 0
  transportData.forEach((t) => {
    const days =
      (t.dias_uteis || 0) -
      (t.faltas || 0) -
      (t.ferias || 0) -
      (t.atestados || 0) -
      (t.home_office || 0)
    if (days > 0) totalTransportDays += days
  })

  let prevTotalTicketDays = 0
  prevTicketData.forEach((t) => {
    const days =
      (t.dias_uteis || 0) -
      (t.faltas || 0) -
      (t.ferias || 0) -
      (t.atestados || 0) +
      (t.plantoes || 0)
    if (days > 0) prevTotalTicketDays += days
  })

  let prevTotalTransportDays = 0
  prevTransportData.forEach((t) => {
    const days =
      (t.dias_uteis || 0) -
      (t.faltas || 0) -
      (t.ferias || 0) -
      (t.atestados || 0) -
      (t.home_office || 0)
    if (days > 0) prevTotalTransportDays += days
  })

  const currentTotal = totalTicketDays * TICKET_RATE + totalTransportDays * TRANSPORT_RATE
  const prevTotal = prevTotalTicketDays * TICKET_RATE + prevTotalTransportDays * TRANSPORT_RATE

  let totalCostVariation = 0
  if (prevTotal > 0) {
    totalCostVariation = ((currentTotal - prevTotal) / prevTotal) * 100
  } else if (currentTotal > 0) {
    totalCostVariation = 100
  }

  const activeEmployees = cols.data?.length || 0
  const averageCost = activeEmployees > 0 ? currentTotal / activeEmployees : 0

  return {
    ticketCost: totalTicketDays * TICKET_RATE,
    transportCost: totalTransportDays * TRANSPORT_RATE,
    activeEmployees,
    ticketCount: ticketData.length,
    transportCount: transportData.length,
    averageCost,
    totalCostVariation,
  }
}

export const getDashboardChartData = async () => {
  const months = Array.from({ length: 6 })
    .map((_, i) => {
      const d = subMonths(new Date(), i)
      return format(d, 'yyyy-MM')
    })
    .reverse()

  const { data: tickets } = await supabase
    .from('beneficios_ticket')
    .select('mes_ano, dias_uteis, faltas, ferias, atestados, plantoes')
    .in('mes_ano', months)
  const { data: transports } = await supabase
    .from('beneficios_transporte')
    .select('mes_ano, dias_uteis, faltas, ferias, atestados, home_office')
    .in('mes_ano', months)

  const chartData = months.map((m) => {
    const tData = (tickets || []).filter((t) => t.mes_ano === m)
    const trData = (transports || []).filter((t) => t.mes_ano === m)

    let tDays = 0
    tData.forEach((t) => {
      const days =
        (t.dias_uteis || 0) -
        (t.faltas || 0) -
        (t.ferias || 0) -
        (t.atestados || 0) +
        (t.plantoes || 0)
      if (days > 0) tDays += days
    })

    let trDays = 0
    trData.forEach((t) => {
      const days =
        (t.dias_uteis || 0) -
        (t.faltas || 0) -
        (t.ferias || 0) -
        (t.atestados || 0) -
        (t.home_office || 0)
      if (days > 0) trDays += days
    })

    return {
      name: m,
      Ticket: tDays * TICKET_RATE,
      Transporte: trDays * TRANSPORT_RATE,
      Total: tDays * TICKET_RATE + trDays * TRANSPORT_RATE,
    }
  })

  return chartData
}
