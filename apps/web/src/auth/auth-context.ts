import type { LoginRequest, RegisterRequest, User } from '@riftroom/shared'
import { createContext, useContext } from 'react'

export type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: User }
  | { status: 'unauthenticated' }
  | { status: 'error'; message: string }

export interface AuthContextValue {
  state: AuthState
  user: User | null
  login: (body: LoginRequest) => Promise<void>
  register: (body: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  /** Re-checks the session, e.g. after the API was unreachable. */
  reload: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
