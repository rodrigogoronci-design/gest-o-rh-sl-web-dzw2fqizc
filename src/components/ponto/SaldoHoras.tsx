import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, AlertCircle, CheckCircle2 } from 'lucide-react'

export function SaldoHoras({ colaborador }: { colaborador: any }) {
  const [saldoMinutes, setSaldoMinutes] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!colaborador) return
    calcularSaldo()
  }, [colaborador])

  const calcularSaldo = async () => {
    if (!colaborador.jornada_entrada || !colaborador.jornada_saida) {
      setLoading(false)
      return
    }

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: pontos } = await supabase
      .from('registro_ponto')
      .select('*')
      .eq('colaborador_id', colaborador.id)
      .gte('data_hora', startOfMonth.toISOString())
      .order('data_hora', { ascending: true })

    if (!pontos) {
      setLoading(false)
      return
    }

    const grouped: Record<string, any[]> = {}
    pontos.forEach((p) => {
      const dateStr = p.data_hora.split('T')[0]
      if (!grouped[dateStr]) grouped[dateStr] = []
      grouped[dateStr].push(p)
    })

    let totalSaldoMins = 0

    const getMins = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number)
      return h * 60 + m
    }

    const expectedEntrada = getMins(colaborador.jornada_entrada)
    const expectedSaida = getMins(colaborador.jornada_saida)
    let expectedDayMins = expectedSaida - expectedEntrada

    if (colaborador.jornada_saida_intervalo && colaborador.jornada_retorno_intervalo) {
      expectedDayMins -=
        getMins(colaborador.jornada_retorno_intervalo) -
        getMins(colaborador.jornada_saida_intervalo)
    }

    Object.keys(grouped).forEach((date) => {
      const dailyPoints = grouped[date]
      const entrada = dailyPoints.find((p) => p.tipo_registro === 'entrada')
      const saida = dailyPoints.find((p) => p.tipo_registro === 'saida')

      if (entrada && saida) {
        const entDate = new Date(entrada.data_hora)
        const saiDate = new Date(saida.data_hora)
        let workedMins = (saiDate.getTime() - entDate.getTime()) / 60000

        const saidaInt = dailyPoints.find((p) => p.tipo_registro === 'saida_intervalo')
        const retInt = dailyPoints.find((p) => p.tipo_registro === 'retorno_intervalo')

        if (saidaInt && retInt) {
          workedMins -=
            (new Date(retInt.data_hora).getTime() - new Date(saidaInt.data_hora).getTime()) / 60000
        } else if (colaborador.jornada_saida_intervalo && colaborador.jornada_retorno_intervalo) {
          workedMins -=
            getMins(colaborador.jornada_retorno_intervalo) -
            getMins(colaborador.jornada_saida_intervalo)
        }

        totalSaldoMins += workedMins - expectedDayMins
      }
    })

    setSaldoMinutes(Math.round(totalSaldoMins))
    setLoading(false)
  }

  if (loading) return null

  if (!colaborador.jornada_entrada) {
    return (
      <Card className="max-w-md mx-auto mt-4 bg-muted/50">
        <CardContent className="p-4 flex items-center justify-center text-sm text-muted-foreground gap-2">
          <Clock className="w-4 h-4" /> Jornada não configurada
        </CardContent>
      </Card>
    )
  }

  const hours = Math.floor(Math.abs(saldoMinutes) / 60)
  const mins = Math.abs(saldoMinutes) % 60
  const isPositive = saldoMinutes >= 0

  return (
    <Card className="max-w-md mx-auto mt-6 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Banco de Horas
          </span>
          <span className="text-xs font-normal text-muted-foreground">Mês atual</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
        >
          {isPositive ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
          <div>
            <p className="text-sm font-medium opacity-80">
              {isPositive ? 'Horas Extras' : 'Horas Devidas'}
            </p>
            <p className="text-2xl font-bold tracking-tight">
              {isPositive ? '+' : '-'}
              {hours}h {mins}m
            </p>
          </div>
        </div>
        <div className="mt-4 text-xs text-muted-foreground flex justify-between">
          <span>
            Jornada: {colaborador.jornada_entrada} às {colaborador.jornada_saida}
          </span>
          <span>Tol: 30 min/batida</span>
        </div>
      </CardContent>
    </Card>
  )
}
