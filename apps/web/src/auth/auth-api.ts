import type { LoginRequest, RegisterRequest, User } from '@riftroom/shared'
import { apiRequest } from '../lib/api-client'

export const authApi = {
  me: async (): Promise<User> => (await apiRequest('GET /auth/me')).user,
  login: async (body: LoginRequest): Promise<User> => (await apiRequest('POST /auth/login', body)).user,
  register: async (body: RegisterRequest): Promise<User> => (await apiRequest('POST /auth/register', body)).user,
  logout: (): Promise<undefined> => apiRequest('POST /auth/logout'),
}
