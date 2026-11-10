import { Navigate, Outlet, useLocation } from 'react-router'
import { FullScreenLoader } from '../components/layout/FullScreenLoader'
import { SessionErrorScreen } from '../components/layout/SessionErrorScreen'
import { useAuth } from './auth-context'

interface FromState {
  from?: string
}

/** Private routes: anonymous visitors go to /login and come back after signing in. */
export function RequireAuth() {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') return <FullScreenLoader />
  if (state.status === 'error') return <SessionErrorScreen message={state.message} />
  if (state.status === 'unauthenticated') {
    const from: FromState = { from: location.pathname + location.search }
    return <Navigate to="/login" replace state={from} />
  }
  return <Outlet />
}

/** Login / register: signed-in users are sent on to where they were going. */
export function RedirectIfAuthenticated() {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') return <FullScreenLoader />
  if (state.status === 'authenticated') {
    const from = (location.state as FromState | null)?.from
    const target = from && from.startsWith('/') && !from.startsWith('//') ? from : '/dashboard'
    return <Navigate to={target} replace />
  }
  return <Outlet />
}
