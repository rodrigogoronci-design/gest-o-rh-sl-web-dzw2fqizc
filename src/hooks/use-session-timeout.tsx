import { useEffect, useRef } from 'react'
import { useAuth } from './use-auth'

const TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export function useSessionTimeout() {
  const { user, signOut } = useAuth()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const signOutRef = useRef(signOut)

  useEffect(() => {
    signOutRef.current = signOut
  }, [signOut])

  useEffect(() => {
    if (!user) return

    const resetTimeout = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        signOutRef.current('timeout')
      }, TIMEOUT_MS)
    }

    resetTimeout()

    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    const handleActivity = () => resetTimeout()

    events.forEach((event) => {
      window.addEventListener(event, handleActivity)
    })

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [user])
}
