import { format } from 'date-fns'

export interface DailyRecord {
  colaboradorId: string
  colaboradorNome: string
  salario: number
  data: string
  entrada?: string
  saidaIntervalo?: string
  retornoIntervalo?: string
  saida?: string
  intervalo: string
  horasNormais: number
  horasExtras: number
  horasNoturnas: number
  faltou: boolean
  observacoes: string
}

export const formatTime = (iso?: string) => (iso ? format(new Date(iso), 'HH:mm') : '--:--')

export const formatHours = (h: number) => {
  if (!h) return '0h 00m'
  const intH = Math.floor(h)
  const mins = Math.round((h - intH) * 60)
  return `${intH}h ${mins.toString().padStart(2, '0')}m`
}

export const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export const exportToCSV = (headers: string[], rows: any[][], filename: string) => {
  const csvContent =
    'data:text/csv;charset=utf-8,' + [headers, ...rows].map((e) => e.join(',')).join('\n')
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
