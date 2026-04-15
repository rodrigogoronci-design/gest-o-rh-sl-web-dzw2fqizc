import { supabase } from '@/lib/supabase/client'
import { format, subMonths } from 'date-fns'

export const TICKET_RATE = 35.0
export const TRANSPORT_RATE = 12.0

export const getDashboardStats = async (month: string) => {
  const [tickets, transports, cols] = await Promise.all([
    supabase.from('beneficios_ticket').select('*').eq('mes_ano', month),
    supabase.from('beneficios_transporte').select('*').eq('mes_ano', month),
    supabase.from('colaboradores').select('id, status').eq('status', 'Ativo'),
  ])

  const ticketData = tickets.data || []
  const transportData = transports.data || []

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

  return {
    ticketCost: totalTicketDays * TICKET_RATE,
    transportCost: totalTransportDays * TRANSPORT_RATE,
    activeEmployees: cols.data?.length || 0,
    ticketCount: ticketData.length,
    transportCount: transportData.length,
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
