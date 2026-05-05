import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Clock,
  MapPin,
  MapPinOff,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  History,
} from 'lucide-react'
import { toast } from 'sonner'
import { dataURLtoBlob, getDistanceFromLatLonInKm } from '@/lib/device-utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function PontoPunch({ colaborador, deviceId }: any) {
  const [time, setTime] = useState(new Date())
  const [location, setLocation] = useState<GeolocationPosition | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [queueCount, setQueueCount] = useState(0)

  const [registrosHoje, setRegistrosHoje] = useState<any[]>([])
  const [loadingRegistros, setLoadingRegistros] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tipoRegistro, setTipoRegistro] = useState('entrada')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  )

  const fetchRegistros = async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data } = await supabase
      .from('registro_ponto')
      .select('*')
      .eq('colaborador_id', colaborador.id)
      .gte('data_hora', today.toISOString())
      .lt('data_hora', tomorrow.toISOString())
      .order('data_hora', { ascending: true })

    if (data) setRegistrosHoje(data)
    setLoadingRegistros(false)
  }

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)

    const handleOnline = () => {
      setIsOnline(true)
      syncOffline()
    }
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    setQueueCount(JSON.parse(localStorage.getItem('ponto_queue') || '[]').length)

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((s) => {
        streamRef.current = s
        if (videoRef.current) videoRef.current.srcObject = s
      })
      .catch(() => toast.error('Câmera não disponível'))

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(pos)
        setLocationError(null)
      },
      (err) => {
        if (isMobile) {
          toast.error('Localização é obrigatória no celular. Ative o GPS.')
          setLocationError('GPS Obrigatório')
        } else {
          toast.warning('GPS não ativado. Registro pelo Desktop é permitido.')
          setLocationError('GPS Opcional (Desktop)')
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )

    return () => {
      clearInterval(timer)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
    }
  }, [isMobile])

  useEffect(() => {
    if (isOnline) {
      fetchRegistros()
      const channel = supabase
        .channel('public:registro_ponto')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'registro_ponto',
            filter: `colaborador_id=eq.${colaborador.id}`,
          },
          () => {
            fetchRegistros()
          },
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    } else {
      setLoadingRegistros(false)
    }
  }, [colaborador.id, isOnline])

  const setVideoRef = (element: HTMLVideoElement | null) => {
    videoRef.current = element
    if (element && streamRef.current) {
      element.srcObject = streamRef.current
    }
  }

  const syncOffline = async () => {
    const queue = JSON.parse(localStorage.getItem('ponto_queue') || '[]')
    if (queue.length === 0) return
    const failed = []
    for (const p of queue) {
      const { error } = await supabase.from('registro_ponto').insert(p)
      if (error) failed.push(p)
    }
    localStorage.setItem('ponto_queue', JSON.stringify(failed))
    setQueueCount(failed.length)
    if (failed.length < queue.length) {
      toast.success(`${queue.length - failed.length} registros sincronizados!`)
      fetchRegistros()
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return null
    const canvas = canvasRef.current
    canvas.width = 480
    canvas.height = 640
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.7)
  }

  const registerPoint = async () => {
    if (isMobile && !location) {
      toast.error('Localização é obrigatória no celular')
      return
    }
    setLoading(true)
    try {
      const lat = location?.coords.latitude || null
      const lng = location?.coords.longitude || null
      const tipo = tipoRegistro

      let status = 'pendente'

      if (lat && lng && colaborador.local_trabalho_lat && colaborador.local_trabalho_lng) {
        const dist = getDistanceFromLatLonInKm(
          lat,
          lng,
          parseFloat(colaborador.local_trabalho_lat),
          parseFloat(colaborador.local_trabalho_lng),
        )
        if (dist > 0.05) status = 'inconsistencia'
      }

      const recordDate = new Date()

      if (status !== 'inconsistencia') {
        const checkTolerance = (expectedStr: string) => {
          if (!expectedStr) return false
          const [h, m] = expectedStr.split(':').map(Number)
          const expected = new Date(recordDate)
          expected.setHours(h, m, 0, 0)
          const diffMins = Math.abs(recordDate.getTime() - expected.getTime()) / 60000
          return diffMins <= 30
        }

        let isWithinTolerance = false
        if (tipo === 'entrada' && colaborador.jornada_entrada)
          isWithinTolerance = checkTolerance(colaborador.jornada_entrada)
        if (tipo === 'saida_intervalo' && colaborador.jornada_saida_intervalo)
          isWithinTolerance = checkTolerance(colaborador.jornada_saida_intervalo)
        if (tipo === 'retorno_intervalo' && colaborador.jornada_retorno_intervalo)
          isWithinTolerance = checkTolerance(colaborador.jornada_retorno_intervalo)
        if (tipo === 'saida' && colaborador.jornada_saida)
          isWithinTolerance = checkTolerance(colaborador.jornada_saida)

        if (isWithinTolerance) {
          status = 'aprovado'
        }
      }

      let foto_url = null
      const dataUrl = capturePhoto()

      if (isOnline && dataUrl) {
        const blob = dataURLtoBlob(dataUrl)
        const fileName = `${colaborador.id}-${Date.now()}.jpg`
        const { error } = await supabase.storage.from('ponto_fotos').upload(fileName, blob)
        if (!error) {
          foto_url = supabase.storage.from('ponto_fotos').getPublicUrl(fileName).data.publicUrl
        }
      }

      const payload = {
        colaborador_id: colaborador.id,
        tipo_registro: tipo,
        latitude: lat,
        longitude: lng,
        foto_url,
        status,
        device_id_hash: deviceId,
        data_hora: recordDate.toISOString(),
      }

      if (!isOnline) {
        const queue = JSON.parse(localStorage.getItem('ponto_queue') || '[]')
        queue.push(payload)
        localStorage.setItem('ponto_queue', JSON.stringify(queue))
        setQueueCount(queue.length)
        setRegistrosHoje((prev) => [...prev, { ...payload, id: 'temp-' + Date.now() }])
        toast.success('Salvo offline. Será sincronizado quando reconectar.')
      } else {
        const { error } = await supabase.from('registro_ponto').insert(payload)
        if (error) throw error
        toast.success('Ponto registrado com sucesso!')
        fetchRegistros()
      }

      setIsModalOpen(false)
    } catch (e: any) {
      toast.error('Erro ao registrar: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const isPontoAberto =
    registrosHoje.length > 0 && registrosHoje[registrosHoje.length - 1].tipo_registro !== 'saida'

  const showAlert = (() => {
    if (registrosHoje.length === 0) return false
    const entrada = registrosHoje.find((r) => r.tipo_registro === 'entrada')
    const saidaInt = registrosHoje.find((r) => r.tipo_registro === 'saida_intervalo')
    const saida = registrosHoje.find((r) => r.tipo_registro === 'saida')

    if (entrada && !saidaInt) {
      const entradaDate = new Date(entrada.data_hora)
      const diffHours = (new Date().getTime() - entradaDate.getTime()) / (1000 * 60 * 60)
      if (diffHours >= 6 && !saida) return true
    }
    if (entrada && saida && !saidaInt) return true

    return false
  })()

  const tipoLabels: Record<string, string> = {
    entrada: 'Entrada',
    saida_intervalo: 'Saída Intervalo',
    retorno_intervalo: 'Retorno Intervalo',
    saida: 'Saída',
  }

  const getNextTipoRegistro = () => {
    if (registrosHoje.length === 0) return 'entrada'
    if (registrosHoje.length === 1) return 'saida_intervalo'
    if (registrosHoje.length === 2) return 'retorno_intervalo'
    if (registrosHoje.length === 3) return 'saida'
    return 'entrada'
  }

  const nextTipo = getNextTipoRegistro()

  if (loadingRegistros && registrosHoje.length === 0) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <Skeleton className="h-[280px] w-full rounded-xl" />
        <Skeleton className="h-[200px] w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Olá, {colaborador.nome?.split(' ')[0] || 'Colaborador'}!
          </h2>
          <p className="text-slate-500 text-sm">Registre seu ponto hoje</p>
        </div>
      </div>

      <Card className="shadow-lg border-t-4 border-t-primary animate-fade-in-up">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500">
              <CalendarDays className="w-4 h-4" />
              <span className="text-sm font-medium capitalize">
                {time.toLocaleDateString('pt-BR', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'long',
                })}
              </span>
            </div>
            <div
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5',
                isPontoAberto ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700',
              )}
            >
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  isPontoAberto ? 'bg-green-500 animate-pulse' : 'bg-slate-400',
                )}
              ></span>
              {isPontoAberto ? 'Ponto aberto' : 'Ponto fechado'}
            </div>
          </div>

          <div className="text-6xl font-bold font-mono tracking-tight text-primary py-4">
            {time.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>

          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold rounded-xl shadow-md"
            onClick={() => setIsModalOpen(true)}
          >
            Registrar {tipoLabels[nextTipo] || 'Ponto'}
          </Button>

          {queueCount > 0 && isOnline && (
            <div
              className="bg-blue-50 text-blue-700 text-sm p-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer font-medium hover:bg-blue-100 transition-colors mt-2"
              onClick={syncOffline}
            >
              <RefreshCw className="w-4 h-4 animate-spin" /> {queueCount} registros pendentes.
              Sincronizar.
            </div>
          )}
          {!isOnline && (
            <div className="bg-amber-50 text-amber-700 text-sm p-3 rounded-lg flex items-center justify-center gap-2 font-medium mt-2">
              <WifiOff className="w-4 h-4" /> Modo offline. Registros serão salvos.
            </div>
          )}
        </CardContent>
      </Card>

      {showAlert && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3 animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Atenção ao Intervalo</p>
            <p className="text-xs mt-1">
              Você ainda não registrou seu intervalo de descanso hoje. Lembre-se de fazer a pausa.
            </p>
          </div>
        </div>
      )}

      <Card
        className="shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up"
        style={{ animationDelay: '100ms' }}
      >
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="w-5 h-5 text-slate-500" />
            Histórico do Dia
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {registrosHoje.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center text-slate-500">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-slate-300" />
              </div>
              <p className="font-medium text-slate-700">Nenhum ponto registrado</p>
              <p className="text-sm mt-1">Comece registrando seu ponto hoje.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {registrosHoje.map((registro) => (
                <div
                  key={registro.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-1.5 h-10 rounded-full',
                        registro.tipo_registro === 'entrada'
                          ? 'bg-green-500'
                          : registro.tipo_registro === 'saida'
                            ? 'bg-slate-500'
                            : 'bg-amber-400',
                      )}
                    ></div>
                    <div>
                      <p className="font-medium text-slate-800">
                        {tipoLabels[registro.tipo_registro] || registro.tipo_registro}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          {registro.status === 'aprovado' ? (
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-500" />
                          )}
                          <span className="capitalize">{registro.status}</span>
                        </span>
                        {registro.latitude && (
                          <span className="flex items-center gap-1 ml-1">
                            <MapPin className="w-3 h-3" /> GPS
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-lg font-bold font-mono text-slate-700 bg-slate-100 px-3 py-1 rounded-md">
                    {new Date(registro.data_hora).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (open) {
            setTipoRegistro(getNextTipoRegistro())
          }
          setIsModalOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-md p-4 pt-6">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl">Confirmar Registro</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="relative bg-black rounded-xl overflow-hidden shadow-inner max-h-[220px] mx-auto w-full max-w-[180px] aspect-[3/4]">
              <video
                ref={setVideoRef}
                autoPlay
                playsInline
                muted
                className="object-cover w-full h-full transform scale-x-[-1]"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute bottom-2 left-0 right-0 flex justify-center px-2">
                <div className="bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-[10px] font-medium flex items-center gap-1.5 shadow-sm w-max truncate">
                  {location ? (
                    <>
                      <MapPin className="w-3 h-3 text-green-500 shrink-0" /> GPS Ativo
                    </>
                  ) : (
                    <>
                      <MapPinOff className="w-3 h-3 text-amber-500 shrink-0" />{' '}
                      {locationError || 'Aguardando GPS...'}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-center">
              <p className="text-sm text-slate-500">Confirme o registro para o momento atual</p>
              <div className="h-14 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center px-4 text-slate-800 font-bold text-lg">
                {tipoLabels[tipoRegistro] || tipoRegistro} às{' '}
                {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full h-12 order-2 sm:order-1"
              onClick={() => setIsModalOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              className="w-full h-12 order-1 sm:order-2"
              onClick={registerPoint}
              disabled={loading || (isMobile && !location)}
            >
              {loading ? 'Salvando...' : `Confirmar ${tipoLabels[tipoRegistro] || 'Registro'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
