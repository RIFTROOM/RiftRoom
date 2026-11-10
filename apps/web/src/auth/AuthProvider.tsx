import type { LoginRequest, RegisterRequest } from '@riftroom/shared'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, setUnauthorizedHandler } from '../lib/api-client'
import { authApi } from './auth-api'
import { AuthContext, type AuthContextValue, type AuthState } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  // Restore the session from the HttpOnly cookie on every page load.
  useEffect(() => {
    let cancelled = false
    authApi.me().then(
      (user) => !cancelled && setState({ status: 'authenticated', user }),
      (error: unknown) => {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 401) {
          setState({ status: 'unauthenticated' })
        } else {
          const message = error instanceof ApiError ? error.message : 'Something went wrong.'
          setState({ status: 'error', message })
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  // Any request that finds the session gone signs the user out locally.
  useEffect(() => {
    setUnauthorizedHandler(() => setState({ status: 'unauthenticated' }))
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(async (body: LoginRequest) => {
    const user = await authApi.login(body)
    setState({ status: 'authenticated', user })
  }, [])

  const register = useCallback(async (body: RegisterRequest) => {
    const user = await authApi.register(body)
    setState({ status: 'authenticated', user })
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    setState({ status: 'unauthenticated' })
  }, [])

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    setReloadKey((key) => key + 1)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      user: state.status === 'authenticated' ? state.user : null,
      login,
      register,
      logout,
      reload,
    }),
    [state, login, register, logout, reload],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
