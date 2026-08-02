import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCheckDSPToolkit = vi.fn()
const mockGetMetadata = vi.fn()
const mockReadMemory = vi.fn()
const mockWriteMemory = vi.fn()

vi.mock('@/api/dsptoolkit', () => ({
  check_dsp_toolkit: (...args: unknown[]) => mockCheckDSPToolkit(...args),
  getMetadata: (...args: unknown[]) => mockGetMetadata(...args),
  readMemory: (...args: unknown[]) => mockReadMemory(...args),
  writeMemory: (...args: unknown[]) => mockWriteMemory(...args),
}))

import {
  checkDSPAvailability,
  checkTOSLinkAvailable,
  disableTOSLink,
  enableTOSLink,
  getTOSLinkSensitivity,
  getTOSLinkStatus,
  setTOSLinkSensitivity,
  TOSLINK_CONFIG,
} from '@/services/toslink'

describe('toslink service - unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    mockGetMetadata.mockResolvedValue({
      enableSPDIFRegister: '1000',
      readSPDIFOnRegister: '1001',
      sensitivitySPDIFRegister: '1002',
    })
  })

  it('exposes stable config register keys', () => {
    expect(TOSLINK_CONFIG.registers.enable).toBe('enableSPDIFRegister')
    expect(TOSLINK_CONFIG.registers.signalDetection).toBe('readSPDIFOnRegister')
    expect(TOSLINK_CONFIG.registers.sensitivity).toBe('sensitivitySPDIFRegister')
  })

  it('maps dsp check response to boolean availability', async () => {
    mockCheckDSPToolkit.mockResolvedValueOnce('yes')
    await expect(checkDSPAvailability()).resolves.toBe(true)

    mockCheckDSPToolkit.mockResolvedValueOnce('no')
    await expect(checkDSPAvailability()).resolves.toBe(false)
  })

  it('returns false when dsp check throws', async () => {
    mockCheckDSPToolkit.mockRejectedValueOnce(new Error('backend down'))
    await expect(checkDSPAvailability()).resolves.toBe(false)
  })

  it('checks toslink availability from dsp and metadata register presence', async () => {
    mockCheckDSPToolkit.mockResolvedValueOnce('yes')
    await expect(checkTOSLinkAvailable()).resolves.toBe(true)

    mockCheckDSPToolkit.mockResolvedValueOnce('yes')
    mockGetMetadata.mockResolvedValueOnce({
      enableSPDIFRegister: '1000',
      readSPDIFOnRegister: '',
      sensitivitySPDIFRegister: '1002',
    })
    await expect(checkTOSLinkAvailable()).resolves.toBe(false)
  })

  it('returns unavailable status with user-facing error when dsp is missing', async () => {
    mockCheckDSPToolkit.mockResolvedValueOnce('no')

    await expect(getTOSLinkStatus()).resolves.toEqual({
      available: false,
      enabled: false,
      signalDetected: false,
      allowChange: false,
      requiresDSP: true,
      error: 'DSP sound card with TOSLink input required',
    })

    expect(mockGetMetadata).not.toHaveBeenCalled()
  })

  it('regression: parses numeric memory values (number and hex string) without crashing', async () => {
    mockCheckDSPToolkit.mockResolvedValueOnce('yes')
    mockReadMemory
      .mockResolvedValueOnce({ address: '1000', values: [1] })
      .mockResolvedValueOnce({ address: '1001', values: ['0x1'] })
      .mockResolvedValueOnce({ address: '1002', values: ['0.001'] })

    const status = await getTOSLinkStatus()

    expect(status.available).toBe(true)
    expect(status.allowChange).toBe(true)
    expect(status.enabled).toBe(true)
    expect(status.signalDetected).toBe(true)
    expect(status.sensitivity).toBe('medium')
  })

  it('falls back to medium sensitivity if sensitivity read fails', async () => {
    mockCheckDSPToolkit.mockResolvedValueOnce('yes')
    mockReadMemory
      .mockResolvedValueOnce({ address: '1000', values: ['1'] })
      .mockResolvedValueOnce({ address: '1001', values: ['0'] })
      .mockRejectedValueOnce(new Error('read error'))

    const status = await getTOSLinkStatus()
    expect(status.sensitivity).toBe('medium')
    expect(status.signalDetected).toBe(false)
  })

  it('maps nearest float values to sensitivity levels', async () => {
    mockReadMemory.mockResolvedValueOnce({ address: '1002', values: ['0.009'] })
    await expect(getTOSLinkSensitivity()).resolves.toBe('low')

    mockReadMemory.mockResolvedValueOnce({ address: '1002', values: ['0.00095'] })
    await expect(getTOSLinkSensitivity()).resolves.toBe('medium')

    mockReadMemory.mockResolvedValueOnce({ address: '1002', values: ['0.00004'] })
    await expect(getTOSLinkSensitivity()).resolves.toBe('high')
  })

  it('defaults to medium sensitivity when metadata is missing or read value is invalid', async () => {
    mockGetMetadata.mockResolvedValueOnce({})
    await expect(getTOSLinkSensitivity()).resolves.toBe('medium')

    mockGetMetadata.mockResolvedValueOnce({ sensitivitySPDIFRegister: '1002' })
    mockReadMemory.mockResolvedValueOnce({ address: '1002', values: ['not-a-number'] })
    await expect(getTOSLinkSensitivity()).resolves.toBe('medium')
  })

  it('writes enable and disable states with persisted store flag', async () => {
    mockCheckDSPToolkit.mockResolvedValue('yes')
    mockReadMemory
      .mockResolvedValue({ address: 'x', values: ['1'] })

    await enableTOSLink()
    expect(mockWriteMemory).toHaveBeenCalledWith({ address: '1000', value: 1, store: true })

    await disableTOSLink()
    expect(mockWriteMemory).toHaveBeenCalledWith({ address: '1000', value: 0, store: true })
  })

  it('writes mapped float value for sensitivity changes', async () => {
    mockCheckDSPToolkit.mockResolvedValue('yes')
    mockReadMemory.mockResolvedValue({ address: 'x', values: ['1'] })

    await setTOSLinkSensitivity('high')

    expect(mockWriteMemory).toHaveBeenCalledWith({
      address: '1002',
      value: 0.00005,
      store: true,
    })
  })

  it('prevents mutating actions when toslink is unavailable', async () => {
    mockCheckDSPToolkit.mockResolvedValue('no')

    await expect(enableTOSLink()).rejects.toThrow('DSP sound card with TOSLink input required')
    await expect(disableTOSLink()).rejects.toThrow('DSP sound card with TOSLink input required')
    await expect(setTOSLinkSensitivity('low')).rejects.toThrow('DSP sound card with TOSLink input required')
  })
})
