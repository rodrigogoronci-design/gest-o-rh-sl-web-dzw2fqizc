import { useState } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import useAppStore from '@/stores/useAppStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

export default function Mural() {
  const { currentUser, users, shifts, toggleShift, isLoading } = useAppStore()

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [assignUserId, setAssignUserId] = useState<string>('')

  if (isLoading)
    return <div className="p-8 text-center text-muted-foreground">Carregando mural...</div>

  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days = eachDayOfInterval({ start: startDate, end: endDate })
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const isAdmin = currentUser?.role === 'admin'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Mural de Plantões</h1>
        <div className="text-lg font-medium text-slate-600 capitalize">
          {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
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
              const isCurrentMonth = isSameMonth(day, monthStart)
              const isWeekend = day.getDay() === 0 || day.getDay() === 6

              return (
                <Dialog key={idx}>
                  <DialogTrigger asChild>
                    <div
                      className={cn(
                        'min-h-[100px] p-2 bg-white flex flex-col gap-1 cursor-pointer transition-colors hover:bg-slate-50',
                        !isCurrentMonth && 'bg-slate-50 opacity-50',
                        isToday(day) && 'bg-blue-50/50',
                      )}
                    >
                      <div className="flex justify-between items-center">
                        <span
                          className={cn(
                            'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
                            isToday(day) ? 'bg-primary text-white' : 'text-slate-700',
                            isWeekend && !isToday(day) && 'text-red-500',
                          )}
                        >
                          {format(day, 'd')}
                        </span>
                      </div>

                      <div className="flex-1 flex flex-col gap-1 overflow-y-auto mt-1">
                        {dayShifts.map((userId) => {
                          const u = users.find((u) => u.id === userId)
                          if (!u) return null
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
                        Plantão - {format(day, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      {dayShifts.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Plantonistas escalados:</p>
                          {dayShifts.map((userId) => {
                            const u = users.find((u) => u.id === userId)
                            return (
                              <div
                                key={userId}
                                className="flex justify-between items-center p-2 rounded-md bg-slate-50 border"
                              >
                                <span>{u?.name}</span>
                                {isAdmin && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => toggleShift(dateStr, userId)}
                                  >
                                    Remover
                                  </Button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Nenhum plantonista escalado para este dia.
                        </p>
                      )}

                      {isAdmin && (
                        <div className="pt-4 border-t space-y-3">
                          <p className="text-sm font-medium">Adicionar Plantonista</p>
                          <div className="flex gap-2">
                            <Select value={assignUserId} onValueChange={setAssignUserId}>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Selecione um usuário" />
                              </SelectTrigger>
                              <SelectContent>
                                {users
                                  .filter((u) => !dayShifts.includes(u.id))
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
