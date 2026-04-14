import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from 'react'
import { AppState, User, TicketRecord, TransportRecord } from '@/types'
import { useAuth } from '@/hooks/use-auth'
import {
  loadBeneficiosData,
  toggleUserShift,
  saveTicketsBatch,
  saveTransportBatch,
  createDbUser,
  deleteDbUser,
} from '@/services/beneficios'

const AppContext = createContext<AppState | null>(null)

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [shifts, setShifts] = useState<Record<string, string[]>>({})
  const [ticketData, setTicketData] = useState<Record<string, TicketRecord>>({})
  const [transportData, setTransportData] = useState<Record<string, TransportRecord>>({})

  const [currentMonth] = useState(() => new Date().toISOString().slice(0, 7))

  const loadAll = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const { cols, plantoes, tickets, transports } = await loadBeneficiosData(currentMonth)

      const mappedUsers: User[] = cols.map((c) => ({
        id: c.id,
        name: c.nome,
        email: c.email || '',
        role: c.role === 'Admin' ? 'admin' : 'user',
      }))
      setUsers(mappedUsers)
      setCurrentUser(mappedUsers.find((u) => u.id === user.id) || null)

      const shiftsMap: Record<string, string[]> = {}
      plantoes.forEach((p) => {
        if (!shiftsMap[p.data]) shiftsMap[p.data] = []
        shiftsMap[p.data].push(p.colaborador_id)
      })
      setShifts(shiftsMap)

      const tData: Record<string, TicketRecord> = {}
      tickets.forEach((t) => {
        tData[t.colaborador_id] = {
          regular: t.dias_uteis,
          shifts: t.plantoes,
          sick: t.atestados,
          vacation: t.ferias,
        }
      })
      setTicketData(tData)

      const trData: Record<string, TransportRecord> = {}
      transports.forEach((t) => {
        trData[t.colaborador_id] = {
          businessDays: t.dias_uteis,
          homeOffice: t.home_office,
          vacation: t.ferias,
        }
      })
      setTransportData(trData)
    } finally {
      setIsLoading(false)
    }
  }, [user, currentMonth])

  useEffect(() => {
    if (user) {
      loadAll()
    } else {
      setCurrentUser(null)
      setUsers([])
      setIsLoading(false)
    }
  }, [user, loadAll])

  const addUser = async (newUser: Omit<User, 'id'>) => {
    await createDbUser({ email: newUser.email, name: newUser.name, role: newUser.role })
    await loadAll()
  }

  const removeUser = async (id: string) => {
    await deleteDbUser(id)
    await loadAll()
  }

  const saveAllTickets = async (data: Record<string, TicketRecord>) => {
    const rows = Object.entries(data).map(([userId, d]) => ({
      colaborador_id: userId,
      mes_ano: currentMonth,
      dias_uteis: d.regular,
      plantoes: d.shifts,
      atestados: d.sick,
      ferias: d.vacation,
    }))
    await saveTicketsBatch(rows)
    setTicketData(data)
  }

  const saveAllTransport = async (data: Record<string, TransportRecord>) => {
    const rows = Object.entries(data).map(([userId, d]) => ({
      colaborador_id: userId,
      mes_ano: currentMonth,
      dias_uteis: d.businessDays,
      home_office: d.homeOffice,
      ferias: d.vacation,
    }))
    await saveTransportBatch(rows)
    setTransportData(data)
  }

  const toggleShift = async (date: string, userId: string) => {
    const dayShifts = shifts[date] || []
    const isAdding = !dayShifts.includes(userId)

    setShifts((prev) => ({
      ...prev,
      [date]: isAdding ? [...dayShifts, userId] : dayShifts.filter((id) => id !== userId),
    }))

    await toggleUserShift(date, userId, isAdding)
  }

  return (
    <AppContext.Provider
      value={{
        isLoading,
        currentUser,
        users,
        shifts,
        ticketData,
        transportData,
        addUser,
        removeUser,
        saveAllTickets,
        saveAllTransport,
        toggleShift,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export default function useAppStore() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppStore must be used within AppProvider')
  return context
}
