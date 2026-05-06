import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { DailyRecord, formatTime, formatHours } from '@/lib/ponto-utils'
import { cn } from '@/lib/utils'

export function FolhaPontoTab({
  records,
  isCompact,
  setIsCompact,
  colaboradorId,
}: {
  records: DailyRecord[]
  isCompact: boolean
  setIsCompact: (v: boolean) => void
  colaboradorId: string
}) {
  const compactData = useMemo(() => {
    const map = new Map()
    records.forEach((r) => {
      if (!map.has(r.colaboradorId)) {
        map.set(r.colaboradorId, {
          nome: r.colaboradorNome,
          normais: 0,
          extras: 0,
          noturnas: 0,
          faltas: 0,
        })
      }
      const d = map.get(r.colaboradorId)
      d.normais += r.horasNormais
      d.extras += r.horasExtras
      d.noturnas += r.horasNoturnas
      if (r.faltou) d.faltas += 1
    })
    return Array.from(map.values())
  }, [records])

  const totalNormais = records.reduce((acc, r) => acc + r.horasNormais, 0)
  const totalExtras = records.reduce((acc, r) => acc + r.horasExtras, 0)
  const totalNoturnas = records.reduce((acc, r) => acc + r.horasNoturnas, 0)
  const totalFaltas = records.filter((r) => r.faltou).length
  const saldoBanco = totalExtras - totalFaltas * 8

  if (records.length === 0)
    return <div className="text-center py-10 text-slate-500">Nenhum dado para este período</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center gap-2 no-print">
        <Switch id="compact-mode" checked={isCompact} onCheckedChange={setIsCompact} />
        <Label htmlFor="compact-mode">Visão Compacta</Label>
      </div>

      <Card className="shadow-sm overflow-hidden">
        {isCompact ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Horas Normais</TableHead>
                  <TableHead>Horas Extras</TableHead>
                  <TableHead>Horas Noturnas</TableHead>
                  <TableHead>Faltas</TableHead>
                  <TableHead>Banco Aprox.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compactData.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{d.nome}</TableCell>
                    <TableCell>{formatHours(d.normais)}</TableCell>
                    <TableCell className="text-emerald-600">{formatHours(d.extras)}</TableCell>
                    <TableCell className="text-indigo-600">{formatHours(d.noturnas)}</TableCell>
                    <TableCell className="text-red-600">{d.faltas}</TableCell>
                    <TableCell
                      className={d.extras - d.faltas * 8 >= 0 ? 'text-emerald-600' : 'text-red-600'}
                    >
                      {formatHours(d.extras - d.faltas * 8)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    {colaboradorId === 'all' && <TableHead>Colaborador</TableHead>}
                    <TableHead>Entrada</TableHead>
                    <TableHead>Saída</TableHead>
                    <TableHead>Intervalo</TableHead>
                    <TableHead>H. Normais</TableHead>
                    <TableHead>H. Extras</TableHead>
                    <TableHead>H. Noturnas</TableHead>
                    <TableHead>Faltas</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r, i) => (
                    <TableRow key={i} className={r.faltou ? 'bg-red-50/50' : ''}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {format(new Date(r.data), 'dd/MM/yyyy')}
                      </TableCell>
                      {colaboradorId === 'all' && <TableCell>{r.colaboradorNome}</TableCell>}
                      <TableCell>{formatTime(r.entrada)}</TableCell>
                      <TableCell>{formatTime(r.saida)}</TableCell>
                      <TableCell>{r.intervalo}</TableCell>
                      <TableCell>{formatHours(r.horasNormais)}</TableCell>
                      <TableCell className="text-emerald-600">
                        {formatHours(r.horasExtras)}
                      </TableCell>
                      <TableCell className="text-indigo-600">
                        {formatHours(r.horasNoturnas)}
                      </TableCell>
                      <TableCell className="text-red-600">{r.faltou ? '1' : '0'}</TableCell>
                      <TableCell className="text-slate-500 text-xs">{r.observacoes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="grid grid-cols-1 gap-4 md:hidden p-4">
              {records.map((r, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-200 space-y-2 bg-white">
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-semibold">{format(new Date(r.data), 'dd/MM/yyyy')}</span>
                    {colaboradorId === 'all' && (
                      <span className="text-sm text-slate-500 truncate ml-2">
                        {r.colaboradorNome}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>In: {formatTime(r.entrada)}</span>
                    <span>Out: {formatTime(r.saida)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Norm: {formatHours(r.horasNormais)}</span>
                    <span className="text-emerald-600">Ext: {formatHours(r.horasExtras)}</span>
                  </div>
                  {r.faltou && (
                    <div className="text-xs text-red-500 font-semibold mt-1">Falta Registrada</div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="bg-slate-50 print:bg-white border-t border-slate-100 print:border-black p-4 md:p-6 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm print:border-t-2">
          <div>
            <p className="text-slate-500 print:text-black mb-1 font-medium">Total Normais</p>
            <p className="font-bold text-lg print:text-base">{formatHours(totalNormais)}</p>
          </div>
          <div>
            <p className="text-slate-500 print:text-black mb-1 font-medium">Total Extras</p>
            <p className="font-bold text-lg text-emerald-600 print:text-black print:text-base">
              {formatHours(totalExtras)}
            </p>
          </div>
          <div>
            <p className="text-slate-500 print:text-black mb-1 font-medium">Total Noturnas</p>
            <p className="font-bold text-lg text-indigo-600 print:text-black print:text-base">
              {formatHours(totalNoturnas)}
            </p>
          </div>
          <div>
            <p className="text-slate-500 print:text-black mb-1 font-medium">Total Faltas</p>
            <p className="font-bold text-lg text-red-600 print:text-black print:text-base">
              {totalFaltas}
            </p>
          </div>
          <div className="col-span-2 md:col-span-1">
            <p className="text-slate-500 print:text-black mb-1 font-medium">Saldo Banco</p>
            <p
              className={cn(
                'font-bold text-lg print:text-black print:text-base',
                saldoBanco >= 0 ? 'text-emerald-600' : 'text-red-600',
              )}
            >
              {saldoBanco >= 0 ? '+' : '-'}
              {formatHours(Math.abs(saldoBanco))}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
