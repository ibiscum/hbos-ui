import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const successMock = vi.fn()
const errorMock = vi.fn()
const infoMock = vi.fn()

vi.mock('vue3-toastify', () => ({
  toast: {
    success: (...args: unknown[]) => successMock(...args),
    error: (...args: unknown[]) => errorMock(...args),
    info: (...args: unknown[]) => infoMock(...args),
  },
}))

import { useToastStore } from '../toast'

describe('Toast Store - Regression Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('showSuccessToast trims message before showing toast', () => {
    const store = useToastStore()

    store.showSuccessToast('  success  ')

    expect(successMock).toHaveBeenCalledWith('success')
  })

  it('showErrorToast sends normalized message without redundant options object', () => {
    const store = useToastStore()

    store.showErrorToast('  error  ')

    expect(errorMock).toHaveBeenCalledWith('error')
  })

  it('showInfoToast ignores empty/whitespace messages', () => {
    const store = useToastStore()

    store.showInfoToast('   ')

    expect(infoMock).not.toHaveBeenCalled()
  })

  it('showErrorToast ignores empty/whitespace messages', () => {
    const store = useToastStore()

    store.showErrorToast('')

    expect(errorMock).not.toHaveBeenCalled()
  })
})
