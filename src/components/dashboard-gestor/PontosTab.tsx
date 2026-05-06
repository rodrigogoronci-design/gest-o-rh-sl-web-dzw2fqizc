import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'
import { StatusBadge } from './StatusBadge'

interface PontosTabProps {
  data: any[]
  onOpenModal: (record: any, table: string, isApprove: boolean) => void
}

export function PontosTab({ data, onOpenModal }: PontosTabProps) {
  return (
    <div className="flex-1 overflow-x-auto border rounded-lg bg-white">
      <table className="w-full text-sm text-left min-w-[800px]">
        <thead className="bg-slate-50 text-slate-500 font-medium border-b sticky top-0">
          <tr>
            <th className="px-4 py-3">Funcionário</th>
            <th className="px-4 py-3">Data</th>
            <th className="px-4 py-3">Hora</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Justificativa</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                Nenhum ponto encontrado.
              </td>
            </tr>
          ) : (
            data.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{(p.colaboradores as any)?.nome}</td>
                <td className="px-4 py-3">{format(parseISO(p.data_hora), 'dd/MM/yyyy')}</td>
                <td className="px-4 py-3">{format(parseISO(p.data_hora), 'HH:mm')}</td>
                <td className="px-4 py-3 capitalize">{p.tipo_registro.replace('_', ' ')}</td>
                <td className="px-4 py-3 max-w-[200px] truncate">{p.obs_usuario || '-'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  {p.status === 'pendente' && (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => onOpenModal(p, 'registro_ponto', true)}
                      >
                        <Check className="w-4 h-4 mr-1" /> Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => onOpenModal(p, 'registro_ponto', false)}
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
