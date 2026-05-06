import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'
import { StatusBadge } from './StatusBadge'

interface AjustesTabProps {
  data: any[]
  onOpenModal: (record: any, table: string, isApprove: boolean) => void
}

export function AjustesTab({ data, onOpenModal }: AjustesTabProps) {
  return (
    <div className="flex-1 overflow-x-auto border rounded-lg bg-white">
      <table className="w-full text-sm text-left min-w-[800px]">
        <thead className="bg-slate-50 text-slate-500 font-medium border-b sticky top-0">
          <tr>
            <th className="px-4 py-3">Funcionário</th>
            <th className="px-4 py-3">Data</th>
            <th className="px-4 py-3">Motivo</th>
            <th className="px-4 py-3">Horas</th>
            <th className="px-4 py-3">Justificativa</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                Nenhum ajuste encontrado.
              </td>
            </tr>
          ) : (
            data.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{(a.colaboradores as any)?.nome}</td>
                <td className="px-4 py-3">{format(parseISO(a.data), 'dd/MM/yyyy')}</td>
                <td className="px-4 py-3">{a.motivo || '-'}</td>
                <td className="px-4 py-3">{a.horas ? `${a.horas}h` : '-'}</td>
                <td className="px-4 py-3 max-w-[200px] truncate">{a.justificativa || '-'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={a.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  {a.status?.toLowerCase() === 'pendente' && (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => onOpenModal(a, 'ajustes_ponto', true)}
                      >
                        <Check className="w-4 h-4 mr-1" /> Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => onOpenModal(a, 'ajustes_ponto', false)}
                      >
                        <X className="w-4 h-4 mr-1" /> Reprovar
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
