import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { resetApiClientState } from '../lib/api-client'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  resetApiClientState()
})
