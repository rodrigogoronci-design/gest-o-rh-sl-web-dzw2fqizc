export type Role = 'admin' | 'user'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  basePassValue?: number
}

export interface TicketRecord {
  regular: number
  shifts: number
  sick: number
  vacation: number
}

export interface TransportRecord {
  businessDays: number
  homeOffice: number
  vacation: number
}

export interface AppState {
  currentUser: User | null
  users: User[]
  shifts: Record<string, string[]> // YYYY-MM-DD -> userIds
  ticketData: Record<string, TicketRecord> // userId -> data
  transportData: Record<string, TransportRecord> // userId -> data
  login: (email: string) => void
  logout: () => void
  addUser: (user: Omit<User, 'id'>) => void
  removeUser: (id: string) => void
  updateTicketData: (userId: string, data: TicketRecord) => void
  updateTransportData: (userId: string, data: TransportRecord) => void
  toggleShift: (date: string, userId: string) => void
}
