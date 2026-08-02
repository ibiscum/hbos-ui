import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { getAuthStatus, getCsrf, login, logout, setPassword, setPolicy } = vi.hoisted(() => ({
  getAuthStatus: vi.fn(),
  getCsrf: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  setPassword: vi.fn(),
  setPolicy: vi.fn(),
}))

vi.mock('@/api/auth', () => ({
  getAuthStatus,
  getCsrf,
  login,
  logout,
  setPassword,
  setPolicy,
}))

import { useAuthStore } from '@/stores/auth'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('auth store - regression tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
    getAuthStatus.mockReset()
    getCsrf.mockReset()
    login.mockReset()
    logout.mockReset()
    setPassword.mockReset()
    setPolicy.mockReset()
  })

  it('login sets loading for the full operation lifecycle', async () => {
    const d = deferred<{ csrf: string }>()
    login.mockReturnValue(d.promise)
    getAuthStatus.mockResolvedValue({ protection: 'risky', has_password: true, authenticated: true })
    const store = useAuthStore()

    const pending = store.login('secret')
    expect(store.loading).toBe(true)

    d.resolve({ csrf: 'tok-1' })
    await pending

    expect(store.loading).toBe(false)
  })

  it('setPassword sets loading for the full operation lifecycle', async () => {
    const d = deferred<{ csrf: string }>()
    setPassword.mockReturnValue(d.promise)
    getAuthStatus.mockResolvedValue({ protection: 'risky', has_password: true, authenticated: true })
    const store = useAuthStore()

    const pending = store.setPassword('new-secret')
    expect(store.loading).toBe(true)

    d.resolve({ csrf: 'tok-2' })
    await pending

    expect(store.loading).toBe(false)
  })

  it('logout sets loading while request is in flight', async () => {
    login.mockResolvedValue({ csrf: 'tok-3' })
    getAuthStatus.mockResolvedValue({ protection: 'risky', has_password: true, authenticated: false })
    const store = useAuthStore()
    await store.login('secret')

    const d = deferred<void>()
    logout.mockReturnValue(d.promise)

    const pending = store.logout()
    expect(store.loading).toBe(true)

    d.resolve()
    await pending

    expect(store.loading).toBe(false)
  })

  it('setPolicy sets loading while request is in flight', async () => {
    login.mockResolvedValue({ csrf: 'tok-4' })
    getAuthStatus.mockResolvedValue({ protection: 'all', has_password: true, authenticated: true })
    const store = useAuthStore()
    await store.login('secret')

    const d = deferred<void>()
    setPolicy.mockReturnValue(d.promise)

    const pending = store.setPolicy('all')
    expect(store.loading).toBe(true)

    d.resolve()
    await pending

    expect(store.loading).toBe(false)
  })
})
