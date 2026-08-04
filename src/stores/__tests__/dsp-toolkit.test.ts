import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { mockCheckDSPToolkit } = vi.hoisted(() => ({
  mockCheckDSPToolkit: vi.fn(),
}))

vi.mock('@/api/dsptoolkit', () => ({
  check_dsp_toolkit: mockCheckDSPToolkit,
}))

import { useDSPToolkitStore } from '@/stores/dsp-toolkit'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('dsp-toolkit store - regression tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('keeps isChecking true until all concurrent checks complete', async () => {
    const store = useDSPToolkitStore()

    const first = deferred<'yes'>()
    const second = deferred<'yes'>()
    mockCheckDSPToolkit.mockReturnValueOnce(first.promise)
    mockCheckDSPToolkit.mockReturnValueOnce(second.promise)

    const firstPending = store.checkDSPStatus(true)
    const secondPending = store.checkDSPStatus(true)

    expect(store.isChecking).toBe(true)

    first.resolve('yes')
    await firstPending

    // Second check is still pending, so loading must remain true.
    expect(store.isChecking).toBe(true)

    second.resolve('yes')
    await secondPending

    expect(store.isChecking).toBe(false)
  })

  it('returns backend_error and keeps status consistent on thrown check', async () => {
    const store = useDSPToolkitStore()
    mockCheckDSPToolkit.mockRejectedValueOnce(new Error('backend down'))

    const result = await store.checkDSPStatus(true)

    expect(result).toBe('backend_error')
    expect(store.status).toBe('backend_error')
    expect(store.isChecking).toBe(false)
  })
})
