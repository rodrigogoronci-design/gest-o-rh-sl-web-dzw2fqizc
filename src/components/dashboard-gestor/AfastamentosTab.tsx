import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Check, X } from 'lucide-react'
import { StatusBadge } from './StatusBadge'

interface AfastamentosTabProps {
  data: any[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onOpenModal: (record: any, table: string, isApprove: boolean) => void
}

export function AfastamentosTab({
  data,
  selectedIds,
  onSelectionChange,
  onOpenModal,
}: AfastamentosTabProps) {
  const pendingData = data.filter((a) => a.status?.toLowerCase() === 'pendente')
  const allPendingSelected = pendingData.length > 0 && selectedIds.length === pendingData.length

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(pendingData.map((a) => a.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id])
    } else {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id))
    }
  }
  return (
    <div className="flex-1 overflow-x-auto border rounded-lg bg-white">
      <table className="w-full text-sm text-left min-w-[800px]">
        <thead className="bg-slate-50 text-slate-500 font-medium border-b sticky top-0">
          <tr>
            <th className="px-4 py-3 w-12">
              <Checkbox
                checked={allPendingSelected}
                onCheckedChange={handleSelectAll}
                disabled={pendingData.length === 0}
              />
            </th>
            <th className="px-4 py-3">Funcionário</th>
            <th className="px-4 py-3">Data Início</th>
            <th className="px-4 py-3">Data Fim</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Dias</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                Nenhum afastamento encontrado.
              </td>
            </tr>
          ) : (
            data.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  {a.status?.toLowerCase() === 'pendente' && (
                    <Checkbox
                      checked={selectedIds.includes(a.id)}
                      onCheckedChange={(checked) => handleSelect(a.id, checked as boolean)}
                    />
                  )}
                </td>
                <td className="px-4 py-3 font-medium">{(a.colaboradores as any)?.nome}</td>
                <td className="px-4 py-3">{format(parseISO(a.data_inicio), 'dd/MM/yyyy')}</td>
                <td className="px-4 py-3">{format(parseISO(a.data_fim), 'dd/MM/yyyy')}</td>
                <td className="px-4 py-3">{a.tipo}</td>
                <td className="px-4 py-3">{a.dias_afastado || a.quantidade_dias || '-'}</td>
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
                        onClick={() => onOpenModal(a, 'afastamentos', true)}
                      >
                        <Check className="w-4 h-4 mr-1" /> Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => onOpenModal(a, 'afastamentos', false)}
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
