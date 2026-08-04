import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const { setFilterBankBypassStateMock } = vi.hoisted(() => ({
  setFilterBankBypassStateMock: vi.fn(),
}))

vi.mock('@/api/dsptoolkit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/dsptoolkit')>()
  return {
    ...actual,
    setFilterBankBypassState: setFilterBankBypassStateMock,
  }
})

import { useBypass } from '@/composables/useBypass'

const okResponse = () => ({
  status: 'success',
  message: 'ok',
  checksum: 'abc',
  address: '0x1000',
  bypassed: true,
})

describe('useBypass', () => {
  beforeEach(() => {
    setFilterBankBypassStateMock.mockReset()
    setFilterBankBypassStateMock.mockResolvedValue(okResponse())
    vi.restoreAllMocks()
  })

  it('does not start bypass while dragging', async () => {
    const isDragging = ref(true)
    const { isBypassed, startBypass } = useBypass(() => ['0x1000'], isDragging)

    await startBypass()

    expect(isBypassed.value).toBe(false)
    expect(setFilterBankBypassStateMock).not.toHaveBeenCalled()
  })

  it('does not enter bypass mode when there are no valid banks', async () => {
    const isDragging = ref(false)
    const { isBypassed, startBypass } = useBypass(() => ['', ''], isDragging)

    await startBypass()

    expect(isBypassed.value).toBe(false)
    expect(setFilterBankBypassStateMock).not.toHaveBeenCalled()
  })

  it('deduplicates banks and toggles bypass on start/end', async () => {
    const isDragging = ref(false)
    const { isBypassed, startBypass, endBypass } = useBypass(
      () => ['0x1000', '0x1000', '0x2000'],
      isDragging,
    )

    await startBypass()

    expect(isBypassed.value).toBe(true)
    expect(setFilterBankBypassStateMock).toHaveBeenCalledTimes(2)
    expect(setFilterBankBypassStateMock).toHaveBeenNthCalledWith(1, '0x1000', true)
    expect(setFilterBankBypassStateMock).toHaveBeenNthCalledWith(2, '0x2000', true)

    setFilterBankBypassStateMock.mockClear()

    await endBypass()

    expect(isBypassed.value).toBe(false)
    expect(setFilterBankBypassStateMock).toHaveBeenCalledTimes(2)
    expect(setFilterBankBypassStateMock).toHaveBeenNthCalledWith(1, '0x1000', false)
    expect(setFilterBankBypassStateMock).toHaveBeenNthCalledWith(2, '0x2000', false)
  })

  it('rolls back already-bypassed banks when start fails mid-flight', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    setFilterBankBypassStateMock.mockImplementation((bank: string, bypassed: boolean) => {
      if (bypassed && bank === '0x2000') {
        return Promise.reject(new Error('bypass failed'))
      }
      return Promise.resolve(okResponse())
    })

    const isDragging = ref(false)
    const { isBypassed, startBypass } = useBypass(() => ['0x1000', '0x2000'], isDragging)

    await startBypass()

    expect(isBypassed.value).toBe(false)
    expect(setFilterBankBypassStateMock).toHaveBeenCalledWith('0x1000', true)
    expect(setFilterBankBypassStateMock).toHaveBeenCalledWith('0x2000', true)
    expect(setFilterBankBypassStateMock).toHaveBeenCalledWith('0x1000', false)
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to start bypass:', expect.any(Error))
  })

  it('keeps bypass active when restore fails, then allows retry', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const isDragging = ref(false)
    const { isBypassed, startBypass, endBypass } = useBypass(() => ['0x1000', '0x2000'], isDragging)

    await startBypass()
    expect(isBypassed.value).toBe(true)

    setFilterBankBypassStateMock.mockReset()
    setFilterBankBypassStateMock
      .mockRejectedValueOnce(new Error('restore failed'))
      .mockResolvedValue(okResponse())

    await endBypass()

    expect(isBypassed.value).toBe(true)
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to end bypass:', expect.any(Error))

    setFilterBankBypassStateMock.mockReset()
    setFilterBankBypassStateMock.mockResolvedValue(okResponse())

    await endBypass()

    expect(isBypassed.value).toBe(false)
    expect(setFilterBankBypassStateMock).toHaveBeenCalledWith('0x1000', false)
    expect(setFilterBankBypassStateMock).toHaveBeenCalledWith('0x2000', false)
  })
})
