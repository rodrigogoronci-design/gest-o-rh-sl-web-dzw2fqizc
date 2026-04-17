import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import useAppStore from '@/stores/useAppStore'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserPlus, UserCheck } from 'lucide-react'
import { AdmissaoFormModal } from '@/components/AdmissaoFormModal'

export default function Admissao() {
  const { currentUser } = useAppStore()
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchUsers = async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from('colaboradores')
      .select('*')
      .eq('tipo_contrato', 'CLT')
      .order('nome')
    if (data) setColaboradores(data)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  if (
    currentUser?.role !== 'admin' &&
    currentUser?.role !== 'Admin' &&
    currentUser?.role !== 'Gerente'
  ) {
    return <Navigate to="/app/mural" replace />
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admissão de Colaboradores</h1>
          <p className="text-muted-foreground">Gestão e cadastro de novos funcionários (CLT).</p>
        </div>
        <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
          <UserPlus className="w-4 h-4" /> Nova Admissão
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Contato (Celular)</TableHead>
                <TableHead>Cargo / Depto</TableHead>
                <TableHead>Data Admissão</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando registros...
                  </TableCell>
                </TableRow>
              ) : colaboradores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum colaborador padrão CLT encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                colaboradores.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">
                      {c.codigo_funcionario || '-'}
                    </TableCell>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>{c.telefone || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{c.cargo || '-'}</span>
                        <span className="text-xs text-muted-foreground">
                          {c.departamento || '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.data_admissao
                        ? new Date(c.data_admissao + 'T12:00:00').toLocaleDateString('pt-BR')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200"
                      >
                        <UserCheck className="w-3 h-3 mr-1" /> Ativo
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AdmissaoFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchUsers}
      />
    </div>
  )
}
