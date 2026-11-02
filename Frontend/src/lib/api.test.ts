import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/features/auth/hooks/use-auth-store'
import { api } from './api'

const user = {
  id: '1',
  email: 'ana@example.com',
  fullName: 'Ana Silva',
  onboardingCompleted: false,
  onboardingSkipped: false,
}

function respond(config: InternalAxiosRequestConfig, status: number, data: unknown = {}) {
  const response = { status, statusText: '', data, headers: {}, config }
  if (status < 400) return Promise.resolve(response)
  return Promise.reject(new AxiosError('failed', undefined, config, undefined, response))
}

describe('api client', () => {
  const calls: string[] = []

  beforeEach(() => {
    calls.length = 0
    useAuthStore.setState({ user, accessToken: 'old', isSessionChecked: true })
  })

  it('refreshes once and retries with the new token when requests expire together', async () => {
    api.defaults.adapter = vi.fn((config: InternalAxiosRequestConfig) => {
      calls.push(`${config.url} ${new AxiosHeaders(config.headers).get('Authorization')}`)
      if (config.url === '/auth/refresh') {
        return respond(config, 200, { user, accessToken: 'new' })
      }
      return respond(config, useAuthStore.getState().accessToken === 'old' ? 401 : 200)
    })

    await Promise.all([api.get('/users/me'), api.patch('/users/me', {})])

    expect(calls.filter((call) => call.startsWith('/auth/refresh'))).toHaveLength(1)
    expect(useAuthStore.getState().accessToken).toBe('new')
    expect(calls.filter((call) => call.endsWith('Bearer new'))).toHaveLength(2)
  })

  it('ends the session when the refresh fails', async () => {
    api.defaults.adapter = vi.fn((config: InternalAxiosRequestConfig) => respond(config, 401))

    await expect(api.get('/users/me')).rejects.toBeInstanceOf(AxiosError)

    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('does not try to refresh after a failed login', async () => {
    const adapter = vi.fn((config: InternalAxiosRequestConfig) => respond(config, 401))
    api.defaults.adapter = adapter

    await expect(api.post('/auth/login', {})).rejects.toBeInstanceOf(AxiosError)

    expect(adapter).toHaveBeenCalledTimes(1)
    expect(useAuthStore.getState().accessToken).toBe('old')
  })
})
