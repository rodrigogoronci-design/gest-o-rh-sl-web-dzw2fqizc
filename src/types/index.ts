export type Role = 'admin' | 'user'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  basePassValue?: number
  recebe_transporte?: boolean
}

export interface TicketRecord {
  regular: number
  shifts: number
  sick: number
  vacation: number
  faltas: number
}

export interface TransportRecord {
  businessDays: number
  vacation: number
  sick?: number
  faltas: number
  homeOffice?: number
}

export interface AppState {
  currentUser: User | null
  users: User[]
  shifts: Record<string, string[]> // YYYY-MM-DD -> userIds
  ticketData: Record<string, TicketRecord> // userId -> data
  transportData: Record<string, TransportRecord> // userId -> data
  isLoading: boolean
  addUser: (user: Omit<User, 'id'>) => Promise<void>
  removeUser: (id: string) => Promise<void>
  saveAllTickets: (data: Record<string, TicketRecord>) => Promise<void>
  saveAllTransport: (data: Record<string, TransportRecord>) => Promise<void>
  toggleShift: (date: string, userId: string) => Promise<void>
}
