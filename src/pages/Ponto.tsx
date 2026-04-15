import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'

export default function Ponto() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Controle de Ponto</h1>
          <p className="text-muted-foreground">
            Gerencie e visualize seus registros de ponto diários.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Em construção
          </CardTitle>
          <CardDescription>
            A funcionalidade de controle de ponto está sendo preparada e estará disponível em breve.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground bg-muted/20">
            <Clock className="w-12 h-12 mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium">Área de Registros de Ponto</p>
            <p className="text-sm">Aqui você poderá registrar sua entrada e saída.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
