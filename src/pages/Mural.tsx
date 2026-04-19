import { useState, useEffect } from 'react'
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  addMonths,
  subMonths,
  setDate,
  startOfDay,
  endOfDay,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import useAppStore from '@/stores/useAppStore'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users as UsersIcon,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { FeriasDialog } from '@/components/FeriasDialog'
import { syncAllUsersBeneficios } from '@/services/beneficios'
import { Calendar } from '@/components/ui/calendar'

const SUPPORT_TEAM = [
  'Lorrayne',
  'Eduardo',
  'Lucas',
  'Giselly',
  'Guilherme',
  'Felipe Borges',
  'Fabricio',
  'Rafaela',
]

export default function Mural() {
  const { currentUser, users, shifts, toggleShift, isLoading } = useAppStore()
  const { toast } = useToast()

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [assignUserId, setAssignUserId] = useState<string>('')
  const [assignFaltaUserId, setAssignFaltaUserId] = useState<string>('')
  const [feriados, setFeriados] = useState<Record<string, boolean>>({})
  const [homeOfficeDays, setHomeOfficeDays] = useState<Record<string, boolean>>({})
  const [escalaStatus, setEscalaStatus] = useState<'Rascunho' | 'Pendente' | 'Aprovada'>('Rascunho')
  const [feriasList, setFeriasList] = useState<any[]>([])
  const [faltas, setFaltas] = useState<Record<string, string[]>>({})
  const [plantoesPeriodo, setPlantoesPeriodo] = useState<Record<string, Record<string, string>>>({})
  const [reloadKey, setReloadKey] = useState(0)

  // Lançamento em lote
  const [isLoteOpen, setIsLoteOpen] = useState(false)
  const [loteUser, setLoteUser] = useState('')
  const [lotePeriodo, setLotePeriodo] = useState('Integral')
  const [loteDays, setLoteDays] = useState<Date[]>([])
  const [isLoteSaving, setIsLoteSaving] = useState(false)

  const mesAno = format(selectedDate, 'yyyy-MM')

  useEffect(() => {
    const fetchMonthData = async () => {
      const { data: escala } = await supabase
        .from('escala_mes')
        .select('*')
        .eq('mes_ano', mesAno)
        .single()

      setEscalaStatus((escala?.status as any) || 'Rascunho')

      const periodEnd = setDate(selectedDate, 24)
      const periodStart = setDate(subMonths(selectedDate, 1), 25)
      const start = format(periodStart, 'yyyy-MM-dd')
      const end = format(periodEnd, 'yyyy-MM-dd')

      const [
        { data: feriadosData },
        { data: hoData },
        { data: feriasData },
        { data: faltasData },
        { data: plantoesData },
      ] = await Promise.all([
        supabase.from('feriados').select('data').gte('data', start).lte('data', end),
        supabase.from('dias_home_office').select('data').gte('data', start).lte('data', end),
        supabase.from('ferias').select('*').lte('data_inicio', end).gte('data_fim', start),
        supabase.from('faltas').select('*').gte('data', start).lte('data', end),
        supabase.from('plantoes').select('*').gte('data', start).lte('data', end),
      ])

      if (feriadosData) {
        const fMap: Record<string, boolean> = {}
        feriadosData.forEach((f) => {
          fMap[f.data] = true
        })
        setFeriados(fMap)
      } else setFeriados({})

      if (hoData) {
        const hoMap: Record<string, boolean> = {}
        hoData.forEach((h) => {
          hoMap[h.data] = true
        })
        setHomeOfficeDays(hoMap)
      } else setHomeOfficeDays({})

      setFeriasList(feriasData || [])

      if (faltasData) {
        const faltasMap: Record<string, string[]> = {}
        faltasData.forEach((f) => {
          if (!faltasMap[f.data]) faltasMap[f.data] = []
          faltasMap[f.data].push(f.colaborador_id)
        })
        setFaltas(faltasMap)
      } else setFaltas({})

      if (plantoesData) {
        const pMap: Record<string, Record<string, string>> = {}
        plantoesData.forEach((p) => {
          if (!pMap[p.data]) pMap[p.data] = {}
          pMap[p.data][p.colaborador_id] = p.periodo || 'Integral'
        })
        setPlantoesPeriodo(pMap)
      } else setPlantoesPeriodo({})
    }
    fetchMonthData()
  }, [mesAno, reloadKey])

  if (isLoading)
    return <div className="p-8 text-center text-muted-foreground">Carregando mural...</div>

  const monthEnd = setDate(selectedDate, 24)
  const monthStart = setDate(subMonths(selectedDate, 1), 25)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days = eachDayOfInterval({ start: startDate, end: endDate })
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const isAdmin = currentUser?.role === 'admin'
  const canEdit = isAdmin || escalaStatus === 'Rascunho'

  const toggleFeriado = async (dateStr: string, isFeriado: boolean) => {
    if (isFeriado) {
      await supabase.from('feriados').insert({ data: dateStr, descricao: 'Feriado' })
      setFeriados((prev) => ({ ...prev, [dateStr]: true }))
    } else {
      await supabase.from('feriados').delete().match({ data: dateStr })
      const next = { ...feriados }
      delete next[dateStr]
      setFeriados(next)
    }
  }

  const toggleHomeOffice = async (dateStr: string, isHO: boolean) => {
    if (isHO) {
      await supabase.from('dias_home_office').insert({ data: dateStr })
      setHomeOfficeDays((prev) => ({ ...prev, [dateStr]: true }))
    } else {
      await supabase.from('dias_home_office').delete().match({ data: dateStr })
      const next = { ...homeOfficeDays }
      delete next[dateStr]
      setHomeOfficeDays(next)
    }
  }

  const toggleFalta = async (dateStr: string, userId: string) => {
    const dayFaltas = faltas[dateStr] || []
    const hasFalta = dayFaltas.includes(userId)
    if (hasFalta) {
      await supabase.from('faltas').delete().match({ data: dateStr, colaborador_id: userId })
      setFaltas((prev) => ({
        ...prev,
        [dateStr]: prev[dateStr].filter((id) => id !== userId),
      }))
    } else {
      await supabase.from('faltas').insert({ data: dateStr, colaborador_id: userId })
      setFaltas((prev) => ({
        ...prev,
        [dateStr]: [...(prev[dateStr] || []), userId],
      }))
    }
    await syncAllUsersBeneficios(mesAno)
  }

  const updateEscalaStatus = async (status: 'Rascunho' | 'Pendente' | 'Aprovada') => {
    await supabase.from('escala_mes').upsert({ mes_ano: mesAno, status })
    setEscalaStatus(status)
    toast({ title: `Escala alterada para: ${status}` })
  }

  const removeFerias = async (id: string) => {
    await supabase.from('ferias').delete().eq('id', id)
    setFeriasList((prev) => prev.filter((f) => f.id !== id))
    toast({ title: 'Férias removidas' })

    const nextMesAno = format(addMonths(selectedDate, 1), 'yyyy-MM')
    const prevMesAno = format(subMonths(selectedDate, 1), 'yyyy-MM')
    await syncAllUsersBeneficios(prevMesAno)
    await syncAllUsersBeneficios(mesAno)
    await syncAllUsersBeneficios(nextMesAno)
  }

  const handleFeriasAdded = async () => {
    setReloadKey((prev) => prev + 1)
    const nextMesAno = format(addMonths(selectedDate, 1), 'yyyy-MM')
    const prevMesAno = format(subMonths(selectedDate, 1), 'yyyy-MM')
    await syncAllUsersBeneficios(prevMesAno)
    await syncAllUsersBeneficios(mesAno)
    await syncAllUsersBeneficios(nextMesAno)
  }

  const handleLoteSubmit = async () => {
    if (!loteUser || loteDays.length === 0) return
    setIsLoteSaving(true)
    try {
      for (const date of loteDays) {
        const dateStr = format(date, 'yyyy-MM-dd')
        await supabase.from('plantoes').upsert(
          {
            colaborador_id: loteUser,
            data: dateStr,
            periodo: lotePeriodo,
          },
          { onConflict: 'colaborador_id, data' },
        )
      }
      toast({ title: 'Escala em lote lançada com sucesso!' })
      setIsLoteOpen(false)
      setLoteDays([])
      setLoteUser('')
      setLotePeriodo('Integral')
      setReloadKey((p) => p + 1) // reload data
    } catch (err: any) {
      toast({ title: 'Erro ao lançar', description: err.message, variant: 'destructive' })
    } finally {
      setIsLoteSaving(false)
    }
  }

  const supportOptions = users.filter(
    (u) =>
      SUPPORT_TEAM.some((name) => u.name.toLowerCase().includes(name.toLowerCase())) ||
      (u.departamento && u.departamento.toUpperCase() === 'SUPORTE'),
  )

  return (
    <div className="space-y-6">
      {!isAdmin && escalaStatus === 'Aprovada' && (
        <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle>Nova Escala Publicada!</AlertTitle>
          <AlertDescription>
            A escala para o período de {format(subMonths(selectedDate, 1), 'dd/MM')} a{' '}
            {format(selectedDate, 'dd/MM')} foi aprovada e já está disponível.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mural de Plantões</h1>
          <p className="text-muted-foreground mt-1">Gerencie a escala de trabalho e feriados</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-md border shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(subMonths(selectedDate, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex flex-col items-center min-w-[140px]">
              <div className="text-base font-semibold text-slate-700 capitalize text-center flex items-center justify-center gap-2">
                <CalendarIcon className="w-4 h-4 text-slate-400" />
                {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
              </div>
              <span className="text-xs text-muted-foreground mt-0.5 font-medium">
                25/{format(subMonths(selectedDate, 1), 'MM')} a 24/{format(selectedDate, 'MM')}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(addMonths(selectedDate, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={
                escalaStatus === 'Aprovada'
                  ? 'default'
                  : escalaStatus === 'Pendente'
                    ? 'secondary'
                    : 'outline'
              }
              className={cn(
                'px-3 py-1 text-sm',
                escalaStatus === 'Aprovada' &&
                  'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200',
                escalaStatus === 'Pendente' &&
                  'bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200',
              )}
            >
              {escalaStatus === 'Aprovada' && <CheckCircle2 className="w-4 h-4 mr-1" />}
              {escalaStatus === 'Pendente' && <Clock className="w-4 h-4 mr-1" />}
              {escalaStatus}
            </Badge>

            {canEdit && (
              <Dialog open={isLoteOpen} onOpenChange={setIsLoteOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 border-primary text-primary hover:bg-primary/10"
                  >
                    <UsersIcon className="w-4 h-4" /> Lançamento de Escala
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Lançamento de Escala em Lote</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Colaborador do Suporte</Label>
                        <Select value={loteUser} onValueChange={setLoteUser}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o colaborador" />
                          </SelectTrigger>
                          <SelectContent>
                            {supportOptions.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Período do Plantão</Label>
                        <Select value={lotePeriodo} onValueChange={setLotePeriodo}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Manhã">Manhã</SelectItem>
                            <SelectItem value="Tarde">Tarde</SelectItem>
                            <SelectItem value="Integral">Integral</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleLoteSubmit}
                        disabled={isLoteSaving || !loteUser || loteDays.length === 0}
                        className="w-full"
                      >
                        {isLoteSaving ? 'Lançando...' : `Lançar para ${loteDays.length} dia(s)`}
                      </Button>
                    </div>
                    <div className="space-y-2 flex flex-col items-center">
                      <Label>Selecione os dias</Label>
                      <Calendar
                        mode="multiple"
                        selected={loteDays}
                        onSelect={setLoteDays as any}
                        className="rounded-md border shadow"
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {!isAdmin && escalaStatus === 'Rascunho' && (
              <Button
                onClick={() => updateEscalaStatus('Pendente')}
                className="bg-primary text-white"
              >
                Enviar p/ Aprovação
              </Button>
            )}

            {isAdmin && escalaStatus === 'Pendente' && (
              <Button
                onClick={() => updateEscalaStatus('Aprovada')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Aprovar Escala
              </Button>
            )}

            {isAdmin && (escalaStatus === 'Aprovada' || escalaStatus === 'Pendente') && (
              <Button variant="outline" onClick={() => updateEscalaStatus('Rascunho')}>
                Reverter
              </Button>
            )}

            {isAdmin && <FeriasDialog onFeriasAdded={handleFeriasAdded} />}
          </div>
        </div>
      </div>

      <Card className="overflow-hidden border-0 shadow-sm">
        <CardContent className="p-0 sm:p-6">
          <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
            {weekDays.map((day) => (
              <div
                key={day}
                className="bg-slate-50 py-3 text-center text-sm font-semibold text-slate-600"
              >
                {day}
              </div>
            ))}

            {days.map((day, idx) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayShifts = shifts[dateStr] || []
              const dayFaltas = faltas[dateStr] || []
              const dayFerias = feriasList.filter(
                (f) => dateStr >= f.data_inicio && dateStr <= f.data_fim,
              )

              const isCurrentMonth = day >= startOfDay(monthStart) && day <= endOfDay(monthEnd)
              const isWeekend = day.getDay() === 0 || day.getDay() === 6
              const isFeriado = feriados[dateStr]
              const isHomeOffice = homeOfficeDays[dateStr]

              return (
                <Dialog key={idx}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="h-full">
                        <DialogTrigger asChild>
                          <div
                            className={cn(
                              'min-h-[100px] p-2 bg-white flex flex-col gap-1 cursor-pointer transition-colors hover:bg-slate-50 h-full',
                              !isCurrentMonth && 'bg-slate-50 opacity-50',
                              isToday(day) && 'bg-blue-50/50',
                              isFeriado && 'bg-amber-50/50',
                            )}
                          >
                            <div className="flex justify-between items-start">
                              <span
                                className={cn(
                                  'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full shrink-0',
                                  isToday(day) ? 'bg-primary text-white' : 'text-slate-700',
                                  (isWeekend || isFeriado) && !isToday(day) && 'text-red-500',
                                )}
                              >
                                {format(day, 'd')}
                              </span>
                              <div className="flex flex-col items-end gap-0.5 mt-0.5">
                                {isFeriado && (
                                  <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-100 px-1 rounded">
                                    Feriado
                                  </span>
                                )}
                                {isHomeOffice && (
                                  <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-100 px-1 rounded">
                                    Home Office
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex-1 flex flex-col gap-1 overflow-y-auto mt-1">
                              {dayShifts.map((userId) => {
                                const u = users.find((u) => u.id === userId)
                                if (!u || u.role === 'admin') return null
                                const periodo = plantoesPeriodo[dateStr]?.[userId] || 'Integral'
                                return (
                                  <Badge
                                    key={`s-${userId}`}
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0 justify-between font-normal truncate bg-primary/10 text-primary hover:bg-primary/20 w-full"
                                  >
                                    <span>{u.name.split(' ')[0]}</span>
                                    {periodo !== 'Integral' && (
                                      <span className="opacity-70 text-[9px]">
                                        {periodo === 'Manhã' ? 'M' : 'T'}
                                      </span>
                                    )}
                                  </Badge>
                                )
                              })}
                              {dayFaltas.map((userId) => {
                                const u = users.find((u) => u.id === userId)
                                if (!u || u.role === 'admin') return null
                                return (
                                  <Badge
                                    key={`f-${userId}`}
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0 justify-start font-normal truncate bg-red-100 text-red-800 hover:bg-red-200"
                                  >
                                    ⚠️ {u.name.split(' ')[0]}
                                  </Badge>
                                )
                              })}
                              {dayFerias.map((f) => {
                                const u = users.find((u) => u.id === f.colaborador_id)
                                if (!u) return null
                                return (
                                  <Badge
                                    key={`ferias-${f.id}`}
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0 justify-start font-normal truncate bg-orange-100 text-orange-800 hover:bg-orange-200"
                                  >
                                    🌴 {u.name.split(' ')[0]}
                                  </Badge>
                                )
                              })}
                            </div>
                          </div>
                        </DialogTrigger>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      className="text-sm p-3 max-w-[250px]"
                      side="right"
                      align="start"
                    >
                      {dayShifts.length > 0 && (
                        <div className="mb-2">
                          <strong className="text-primary block mb-1">Plantão:</strong>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {dayShifts.map((uid) => {
                              const u = users.find((u) => u.id === uid)
                              const p = plantoesPeriodo[dateStr]?.[uid] || 'Integral'
                              return u && u.role !== 'admin' ? (
                                <li key={uid}>
                                  {u.name} ({p})
                                </li>
                              ) : null
                            })}
                          </ul>
                        </div>
                      )}
                      {dayFaltas.length > 0 && (
                        <div className="mb-2">
                          <strong className="text-red-600 block mb-1">Faltas:</strong>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {dayFaltas.map((uid) => {
                              const u = users.find((u) => u.id === uid)
                              return u && u.role !== 'admin' ? (
                                <li key={`tt-f-${uid}`}>{u.name}</li>
                              ) : null
                            })}
                          </ul>
                        </div>
                      )}
                      {dayFerias.length > 0 && (
                        <div>
                          <strong className="text-orange-600 block mb-1">Férias:</strong>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {dayFerias.map((f) => {
                              const u = users.find((u) => u.id === f.colaborador_id)
                              return u ? <li key={f.id}>{u.name}</li> : null
                            })}
                          </ul>
                        </div>
                      )}
                      {dayShifts.length === 0 &&
                        dayFerias.length === 0 &&
                        dayFaltas.length === 0 && (
                          <p className="text-muted-foreground">Sem plantões, faltas ou férias</p>
                        )}
                    </TooltipContent>
                  </Tooltip>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {format(day, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 pt-4">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                        <div className="space-y-0.5">
                          <Label className="text-base">Feriado</Label>
                          <p className="text-sm text-muted-foreground">
                            Marcar este dia como feriado
                          </p>
                        </div>
                        <Switch
                          checked={!!feriados[dateStr]}
                          onCheckedChange={(c) => toggleFeriado(dateStr, c)}
                          disabled={!canEdit}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                        <div className="space-y-0.5">
                          <Label className="text-base">Home Office</Label>
                          <p className="text-sm text-muted-foreground">
                            Marcar este dia como Home Office global
                          </p>
                        </div>
                        <Switch
                          checked={!!homeOfficeDays[dateStr]}
                          onCheckedChange={(c) => toggleHomeOffice(dateStr, c)}
                          disabled={!canEdit}
                        />
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold text-sm text-slate-700">
                          Plantonistas Escalados
                        </h4>
                        {dayShifts.filter((uid) => {
                          const u = users.find((u) => u.id === uid)
                          return u && u.role !== 'admin'
                        }).length > 0 ? (
                          <div className="space-y-2">
                            {dayShifts.map((userId) => {
                              const u = users.find((u) => u.id === userId)
                              if (!u || u.role === 'admin') return null
                              const p = plantoesPeriodo[dateStr]?.[userId] || 'Integral'
                              return (
                                <div
                                  key={userId}
                                  className="flex justify-between items-center p-2 rounded-md bg-white border shadow-sm"
                                >
                                  <span className="text-sm font-medium">
                                    {u.name}{' '}
                                    <span className="text-xs text-muted-foreground font-normal ml-2">
                                      ({p})
                                    </span>
                                  </span>
                                  {canEdit && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        // Custom remove to also delete from DB if we use toggleShift
                                        supabase
                                          .from('plantoes')
                                          .delete()
                                          .match({ data: dateStr, colaborador_id: userId })
                                          .then(() => {
                                            toggleShift(dateStr, userId)
                                            setReloadKey((k) => k + 1)
                                          })
                                      }}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8"
                                    >
                                      Remover
                                    </Button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground p-4 text-center border border-dashed rounded-lg">
                            Nenhum plantonista para este dia.
                          </p>
                        )}
                      </div>

                      <div className="space-y-4 mt-4 pt-4 border-t">
                        <h4 className="font-semibold text-sm text-slate-700">Faltas neste dia</h4>
                        {dayFaltas.filter((uid) => {
                          const u = users.find((u) => u.id === uid)
                          return u && u.role !== 'admin'
                        }).length > 0 ? (
                          <div className="space-y-2">
                            {dayFaltas.map((userId) => {
                              const u = users.find((u) => u.id === userId)
                              if (!u || u.role === 'admin') return null
                              return (
                                <div
                                  key={`falta-${userId}`}
                                  className="flex justify-between items-center p-2 rounded-md bg-red-50 border border-red-100 shadow-sm"
                                >
                                  <span className="text-sm font-medium text-red-800">{u.name}</span>
                                  {canEdit && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleFalta(dateStr, userId)}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-100 h-8"
                                    >
                                      Remover
                                    </Button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground p-4 text-center border border-dashed rounded-lg">
                            Nenhuma falta registrada.
                          </p>
                        )}
                      </div>

                      {canEdit && (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Select value={assignFaltaUserId} onValueChange={setAssignFaltaUserId}>
                              <SelectTrigger className="flex-1 border-red-200 focus:ring-red-500">
                                <SelectValue placeholder="Registrar Falta" />
                              </SelectTrigger>
                              <SelectContent>
                                {users
                                  .filter((u) => u.role === 'user' && !dayFaltas.includes(u.id))
                                  .map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                      {u.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="destructive"
                              onClick={() => {
                                if (assignFaltaUserId) {
                                  toggleFalta(dateStr, assignFaltaUserId)
                                  setAssignFaltaUserId('')
                                }
                              }}
                            >
                              Registrar
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4 mt-4 pt-4 border-t">
                        <h4 className="font-semibold text-sm text-slate-700">Férias neste dia</h4>
                        {dayFerias.length > 0 ? (
                          <div className="space-y-2">
                            {dayFerias.map((f) => {
                              const u = users.find((u) => u.id === f.colaborador_id)
                              if (!u) return null
                              return (
                                <div
                                  key={f.id}
                                  className="flex justify-between items-center p-2 rounded-md bg-orange-50 border border-orange-100 shadow-sm"
                                >
                                  <span className="text-sm font-medium text-orange-800">
                                    {u.name}
                                  </span>
                                  {canEdit && isAdmin && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeFerias(f.id)}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8"
                                    >
                                      Remover
                                    </Button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground p-4 text-center border border-dashed rounded-lg">
                            Nenhum colaborador de férias.
                          </p>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
