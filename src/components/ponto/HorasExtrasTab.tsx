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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import { DailyRecord, formatTime, formatHours, formatCurrency } from '@/lib/ponto-utils'

export function HorasExtrasTab({
  records,
  heType,
  setHeType,
  colaboradorId,
}: {
  records: DailyRecord[]
  heType: string
  setHeType: (v: string) => void
  colaboradorId: string
}) {
  const extrasRecords = useMemo(() => {
    return records
      .filter((r) => r.horasExtras > 0 || r.horasNoturnas > 0)
      .filter((r) => {
        if (heType === 'normal') return r.horasExtras > 0
        if (heType === 'noturna') return r.horasNoturnas > 0
        return true
      })
  }, [records, heType])

  const getValorAproximado = (r: DailyRecord) => {
    const valorHora = r.salario / 220
    let total = 0
    if (heType === 'normal' || heType === 'todas') total += r.horasExtras * valorHora * 1.5
    if (heType === 'noturna' || heType === 'todas') total += r.horasNoturnas * valorHora * 1.2
    return total
  }

  const totalExtras = extrasRecords.reduce((acc, r) => acc + r.horasExtras, 0)
  const totalNoturnas = extrasRecords.reduce((acc, r) => acc + r.horasNoturnas, 0)
  const valorTotal = extrasRecords.reduce((acc, r) => acc + getValorAproximado(r), 0)

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 no-print">
        <Select value={heType} onValueChange={setHeType}>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Tipo de Hora Extra" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="normal">Apenas Normais</SelectItem>
            <SelectItem value="noturna">Apenas Noturnas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                {colaboradorId === 'all' && <TableHead>Colaborador</TableHead>}
                <TableHead>Entrada</TableHead>
                <TableHead>Saída</TableHead>
                <TableHead>H. Extras</TableHead>
                <TableHead>H. Noturnas</TableHead>
                <TableHead>Valor Aprox.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {extrasRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                    Nenhuma hora extra registrada
                  </TableCell>
                </TableRow>
              ) : (
                extrasRecords.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {format(new Date(r.data), 'dd/MM/yyyy')}
                    </TableCell>
                    {colaboradorId === 'all' && <TableCell>{r.colaboradorNome}</TableCell>}
                    <TableCell>{formatTime(r.entrada)}</TableCell>
                    <TableCell>{formatTime(r.saida)}</TableCell>
                    <TableCell className="text-emerald-600 font-medium">
                      {formatHours(r.horasExtras)}
                    </TableCell>
                    <TableCell className="text-indigo-600 font-medium">
                      {formatHours(r.horasNoturnas)}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {formatCurrency(getValorAproximado(r))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="bg-slate-50 border-t border-slate-100 p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-500 mb-1">Total Horas Extras</p>
            <p className="font-bold text-lg text-emerald-600">{formatHours(totalExtras)}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Total Horas Noturnas</p>
            <p className="font-bold text-lg text-indigo-600">{formatHours(totalNoturnas)}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Valor Total Aproximado</p>
            <p className="font-bold text-lg text-slate-800">{formatCurrency(valorTotal)}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
