import React, { createContext, useContext, useState, ReactNode } from 'react'
import { AppState, User, TicketRecord, TransportRecord } from '@/types'

const mockUsers: User[] = [
  { id: '1', name: 'Administrador Silva', email: 'admin@app.com', role: 'admin' },
  { id: '2', name: 'João Funcionário', email: 'joao@app.com', role: 'user' },
  { id: '3', name: 'Maria Santos', email: 'maria@app.com', role: 'user' },
]

const mockShifts: Record<string, string[]> = {
  '2026-04-18': ['2'],
  '2026-04-19': ['3'],
}

const defaultTicket: TicketRecord = { regular: 20, shifts: 0, sick: 0, vacation: 0 }
const defaultTransport: TransportRecord = { businessDays: 20, homeOffice: 0, vacation: 0 }

const AppContext = createContext<AppState | null>(null)

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [shifts, setShifts] = useState<Record<string, string[]>>(mockShifts)
  const [ticketData, setTicketData] = useState<Record<string, TicketRecord>>({
    '2': { regular: 20, shifts: 1, sick: 0, vacation: 0 },
    '3': { regular: 20, shifts: 1, sick: 2, vacation: 0 },
  })
  const [transportData, setTransportData] = useState<Record<string, TransportRecord>>({
    '2': { businessDays: 20, homeOffice: 2, vacation: 0 },
  })

  const login = (email: string) => {
    const user = users.find((u) => u.email === email) || users[0]
    setCurrentUser(user)
  }

  const logout = () => setCurrentUser(null)

  const addUser = (user: Omit<User, 'id'>) => {
    setUsers((prev) => [...prev, { ...user, id: Math.random().toString(36).substring(7) }])
  }

  const removeUser = (id: string) => setUsers((prev) => prev.filter((u) => u.id !== id))

  const updateTicketData = (userId: string, data: TicketRecord) => {
    setTicketData((prev) => ({ ...prev, [userId]: data }))
  }

  const updateTransportData = (userId: string, data: TransportRecord) => {
    setTransportData((prev) => ({ ...prev, [userId]: data }))
  }

  const toggleShift = (date: string, userId: string) => {
    setShifts((prev) => {
      const dayShifts = prev[date] || []
      if (dayShifts.includes(userId)) {
        return { ...prev, [date]: dayShifts.filter((id) => id !== userId) }
      }
      return { ...prev, [date]: [...dayShifts, userId] }
    })
  }

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        shifts,
        ticketData,
        transportData,
        login,
        logout,
        addUser,
        removeUser,
        updateTicketData,
        updateTransportData,
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
