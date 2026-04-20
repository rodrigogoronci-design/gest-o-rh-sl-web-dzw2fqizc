import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminEspelho } from './AdminEspelho'
import { AdminDevices } from './AdminDevices'
import { AdminApprovals } from './AdminApprovals'
import { AdminJornadas } from './AdminJornadas'
import { ShieldCheck, MonitorSmartphone, CalendarDays, Clock } from 'lucide-react'

export function AdminPonto() {
  return (
    <Tabs defaultValue="espelho" className="w-full space-y-6">
      <TabsList className="bg-slate-100 p-1 flex-wrap h-auto">
        <TabsTrigger value="espelho" className="gap-2">
          <CalendarDays className="w-4 h-4" /> Espelho Diário
        </TabsTrigger>
        <TabsTrigger value="jornadas" className="gap-2">
          <Clock className="w-4 h-4" /> Jornadas
        </TabsTrigger>
        <TabsTrigger value="devices" className="gap-2">
          <MonitorSmartphone className="w-4 h-4" /> Dispositivos
        </TabsTrigger>
        <TabsTrigger value="approvals" className="gap-2">
          <ShieldCheck className="w-4 h-4" /> Aprovações e Inconsistências
        </TabsTrigger>
      </TabsList>
      <TabsContent value="espelho" className="mt-0 focus-visible:outline-none">
        <AdminEspelho />
      </TabsContent>
      <TabsContent value="jornadas" className="mt-0 focus-visible:outline-none">
        <AdminJornadas />
      </TabsContent>
      <TabsContent value="devices" className="mt-0 focus-visible:outline-none">
        <AdminDevices />
      </TabsContent>
      <TabsContent value="approvals" className="mt-0 focus-visible:outline-none">
        <AdminApprovals />
      </TabsContent>
    </Tabs>
  )
}
