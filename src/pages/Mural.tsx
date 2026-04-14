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
} from 'lucide-react'

export default function Mural() {
  const { currentUser, users, shifts, toggleShift, isLoading } = useAppStore()
  const { toast } = useToast()

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [assignUserId, setAssignUserId] = useState<string>('')
  const [feriados, setFeriados] = useState<Record<string, boolean>>({})
  const [escalaStatus, setEscalaStatus] = useState<'Rascunho' | 'Pendente' | 'Aprovada'>('Rascunho')

  const mesAno = format(selectedDate, 'yyyy-MM')

  useEffect(() => {
    const fetchMonthData = async () => {
      // Escala Status
      const { data: escala } = await supabase
        .from('escala_mes')
        .select('*')
        .eq('mes_ano', mesAno)
        .single()

      setEscalaStatus((escala?.status as any) || 'Rascunho')

      // Feriados
      const periodEnd = setDate(selectedDate, 24)
      const periodStart = setDate(subMonths(selectedDate, 1), 25)
      const start = format(periodStart, 'yyyy-MM-dd')
      const end = format(periodEnd, 'yyyy-MM-dd')

      const { data: feriadosData } = await supabase
        .from('feriados')
        .select('data')
        .gte('data', start)
        .lte('data', end)

      if (feriadosData) {
        const fMap: Record<string, boolean> = {}
        feriadosData.forEach((f) => {
          fMap[f.data] = true
        })
        setFeriados(fMap)
      } else {
        setFeriados({})
      }
    }
    fetchMonthData()
  }, [mesAno])

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

  const updateEscalaStatus = async (status: 'Rascunho' | 'Pendente' | 'Aprovada') => {
    await supabase.from('escala_mes').upsert({ mes_ano: mesAno, status })
    setEscalaStatus(status)
    toast({ title: `Escala alterada para: ${status}` })
  }

  return (
    <div className="space-y-6">
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

          <div className="flex items-center gap-2">
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
              const isCurrentMonth = day >= startOfDay(monthStart) && day <= endOfDay(monthEnd)
              const isWeekend = day.getDay() === 0 || day.getDay() === 6
              const isFeriado = feriados[dateStr]

              return (
                <Dialog key={idx}>
                  <DialogTrigger asChild>
                    <div
                      className={cn(
                        'min-h-[100px] p-2 bg-white flex flex-col gap-1 cursor-pointer transition-colors hover:bg-slate-50',
                        !isCurrentMonth && 'bg-slate-50 opacity-50',
                        isToday(day) && 'bg-blue-50/50',
                        isFeriado && 'bg-amber-50/50',
                      )}
                    >
                      <div className="flex justify-between items-center">
                        <span
                          className={cn(
                            'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
                            isToday(day) ? 'bg-primary text-white' : 'text-slate-700',
                            (isWeekend || isFeriado) && !isToday(day) && 'text-red-500',
                          )}
                        >
                          {format(day, 'd')}
                        </span>
                        {isFeriado && (
                          <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-100 px-1 rounded">
                            Feriado
                          </span>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col gap-1 overflow-y-auto mt-1">
                        {dayShifts.map((userId) => {
                          const u = users.find((u) => u.id === userId)
                          if (!u || u.role === 'admin') return null
                          return (
                            <Badge
                              key={userId}
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 justify-start font-normal truncate bg-primary/10 text-primary hover:bg-primary/20"
                            >
                              {u.name.split(' ')[0]}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  </DialogTrigger>
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

                      <div className="space-y-4">
                        <h4 className="font-semibold text-sm text-slate-700">
                          Plantonistas Escalados
                        </h4>
                        {dayShifts.length > 0 ? (
                          <div className="space-y-2">
                            {dayShifts.map((userId) => {
                              const u = users.find((u) => u.id === userId)
                              if (!u || u.role === 'admin') return null
                              return (
                                <div
                                  key={userId}
                                  className="flex justify-between items-center p-2 rounded-md bg-white border shadow-sm"
                                >
                                  <span className="text-sm font-medium">{u.name}</span>
                                  {canEdit && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleShift(dateStr, userId)}
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

                      {canEdit && (
                        <div className="pt-4 border-t space-y-3">
                          <Label>Adicionar Plantonista</Label>
                          <div className="flex gap-2">
                            <Select value={assignUserId} onValueChange={setAssignUserId}>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Selecione um usuário" />
                              </SelectTrigger>
                              <SelectContent>
                                {users
                                  .filter((u) => u.role === 'user' && !dayShifts.includes(u.id))
                                  .map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                      {u.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={() => {
                                if (assignUserId) {
                                  toggleShift(dateStr, assignUserId)
                                  setAssignUserId('')
                                }
                              }}
                            >
                              Adicionar
                            </Button>
                          </div>
                        </div>
                      )}
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
