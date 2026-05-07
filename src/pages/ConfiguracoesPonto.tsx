import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ShieldAlert, CalendarRange, LockKeyhole } from 'lucide-react'
import { RegrasPontoTab } from '@/components/ponto/RegrasPontoTab'
import { FeriadosTab } from '@/components/ponto/FeriadosTab'
import { FechamentoFolhaTab } from '@/components/ponto/FechamentoFolhaTab'

export default function ConfiguracoesPonto() {
  const [activeTab, setActiveTab] = useState('regras')

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Configuração de Regras de Ponto
        </h1>
        <p className="text-slate-500 mt-1">Gestão de jornadas, calendário e fechamento de folha.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 h-auto mb-6">
          <TabsTrigger
            value="regras"
            className="py-3 text-sm md:text-base data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <ShieldAlert className="w-4 h-4 mr-2" />
            Regras de Ponto
          </TabsTrigger>
          <TabsTrigger
            value="feriados"
            className="py-3 text-sm md:text-base data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <CalendarRange className="w-4 h-4 mr-2" />
            Calendário de Feriados
          </TabsTrigger>
          <TabsTrigger
            value="fechamento"
            className="py-3 text-sm md:text-base data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <LockKeyhole className="w-4 h-4 mr-2" />
            Fechamento de Folha
          </TabsTrigger>
        </TabsList>
        <TabsContent value="regras" className="mt-0">
          <RegrasPontoTab />
        </TabsContent>
        <TabsContent value="feriados" className="mt-0">
          <FeriadosTab />
        </TabsContent>
        <TabsContent value="fechamento" className="mt-0">
          <FechamentoFolhaTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
