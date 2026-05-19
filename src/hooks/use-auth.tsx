import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  colaborador: any | null
  isAdmin: boolean
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: (reason?: 'logout' | 'timeout') => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ error: any }>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [colaborador, setColaborador] = useState<any | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, sessionObj) => {
      setSession(sessionObj)
      setUser(sessionObj?.user ?? null)
      if (!sessionObj?.user) {
        setColaborador(null)
        setIsAdmin(false)
        setLoading(false)
      }

      if (event === 'PASSWORD_RECOVERY') {
        setTimeout(() => {
          window.location.href = '/app/perfil'
        }, 100)
      }
    })

    supabase.auth
      .getSession()
      .then(({ data: { session: sessionObj } }) => {
        setSession(sessionObj)
        setUser(sessionObj?.user ?? null)
        if (!sessionObj?.user) {
          setColaborador(null)
          setIsAdmin(false)
          setLoading(false)
        }
      })
      .catch(() => {
        setLoading(false)
      })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const fetchColaborador = async () => {
      if (!user?.id) {
        if (mounted) {
          setColaborador(null)
          setIsAdmin(false)
          setLoading(false)
        }
        return
      }

      setLoading(true)

      try {
        const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error('Tempo limite esgotado ao carregar perfil')), 10000),
        )

        let queryResult = await Promise.race([
          supabase.from('colaboradores').select('*').eq('user_id', user.id).single(),
          timeoutPromise,
        ])

        let data = queryResult.data
        let error = queryResult.error

        // Auto-heal: If user has no auth link but exists by email, link them
        if ((error?.code === 'PGRST116' || !data) && user.email) {
          const timeoutPromiseEmail = new Promise<{ data: any; error: any }>((_, reject) =>
            setTimeout(() => reject(new Error('Tempo limite esgotado ao buscar por email')), 10000),
          )

          const { data: colabByEmail, error: emailErr } = await Promise.race([
            supabase.from('colaboradores').select('*').ilike('email', user.email).single(),
            timeoutPromiseEmail,
          ])

          if (!emailErr && colabByEmail) {
            await supabase
              .from('colaboradores')
              .update({ user_id: user.id })
              .eq('id', colabByEmail.id)

            data = { ...colabByEmail, user_id: user.id }
            error = null as any
          }
        }

        if (!mounted) return

        if (data && !error) {
          setColaborador(data)
          const role = data.role?.toLowerCase() || ''
          setIsAdmin(role === 'admin' || role === 'administrador' || role === 'gerente')
        } else {
          setColaborador(null)
          setIsAdmin(false)
        }
      } catch (err) {
        if (!mounted) return
        setColaborador(null)
        setIsAdmin(false)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchColaborador()

    return () => {
      mounted = false
    }
  }, [user?.id])

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error && data?.user) {
      await supabase
        .from('auditoria_acessos' as any)
        .insert({ user_id: data.user.id, acao: 'login' })
    }
    return { error }
  }

  const signOut = async (reason: 'logout' | 'timeout' = 'logout') => {
    if (user) {
      await supabase.from('auditoria_acessos' as any).insert({ user_id: user.id, acao: reason })
    }
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    })
    return { error }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        colaborador,
        isAdmin,
        signUp,
        signIn,
        signOut,
        resetPassword,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
