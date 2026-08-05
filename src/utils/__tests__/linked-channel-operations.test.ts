import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Filter } from '@/utils/filtercalc'
import {
  addFilterToLinkedChannels,
  applyToLinkedChannels,
  copyFiltersToChannels,
  getTargetChannels,
  removeFilterFromLinkedChannels,
  toggleFilterEnabledLinked,
  updateFilterPropertyLinked,
  updateGenericCoeffLinked,
  type LinkedChannelConfig,
} from '@/utils/linked-channel-operations'

const mocks = vi.hoisted(() => ({
  setIndividualFilterBypassState: vi.fn(),
}))

vi.mock('@/api/dsptoolkit', () => ({
  setIndividualFilterBypassState: mocks.setIndividualFilterBypassState,
}))

const makeFilter = (id: number, overrides: Partial<Filter> = {}): Filter => ({
  id,
  icon: 'peaking',
  text: `F-${id}`,
  frequency: 1000,
  gain: 0,
  Q: 0.71,
  enabled: true,
  ...overrides,
})

const makeConfig = (): LinkedChannelConfig => ({
  channelMode: 'both',
  activeChannel: 'left',
  channelArrays: {
    left: [makeFilter(1), makeFilter(2)],
    right: [makeFilter(1), makeFilter(3)],
  },
  bankAddresses: {
    left: 'IIR_L',
    right: 'IIR_R',
  },
})

describe('linked-channel-operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.setIndividualFilterBypassState.mockResolvedValue({ message: 'ok' })
  })

  describe('getTargetChannels', () => {
    it('returns provided channel list in both mode', () => {
      expect(getTargetChannels('both', 'left', ['left', 'right', 'sub'])).toEqual(['left', 'right', 'sub'])
    })

    it('falls back to left/right in both mode when channels are missing', () => {
      expect(getTargetChannels('both', 'left')).toEqual(['left', 'right'])
    })

    it('returns active channel in individual mode', () => {
      expect(getTargetChannels('individual', 'sub', ['left', 'right', 'sub'])).toEqual(['sub'])
    })
  })

  describe('applyToLinkedChannels', () => {
    it('applies updates and invokes updateStoreCallback for matching filters', async () => {
      const config = makeConfig()
      const updateStoreCallback = vi.fn().mockResolvedValue(undefined)
      config.updateStoreCallback = updateStoreCallback

      await applyToLinkedChannels(config, 1, (filter) => {
        filter.gain = 3
      })

      expect(config.channelArrays.left[0].gain).toBe(3)
      expect(config.channelArrays.right[0].gain).toBe(3)
      expect(updateStoreCallback).toHaveBeenCalledTimes(2)
      expect(updateStoreCallback).toHaveBeenNthCalledWith(1, 'left', 0, config.channelArrays.left[0])
      expect(updateStoreCallback).toHaveBeenNthCalledWith(2, 'right', 0, config.channelArrays.right[0])
    })

    it('supports async update functions and skips unknown channels with warning', async () => {
      const config = makeConfig()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await applyToLinkedChannels(
        config,
        1,
        async (filter) => {
          filter.frequency = 1800
        },
        ['left', 'missing'],
      )

      expect(config.channelArrays.left[0].frequency).toBe(1800)
      expect(warnSpy).toHaveBeenCalledWith('[Linked Channels] Unknown channel: missing')

      warnSpy.mockRestore()
    })

    it('does nothing when filter id is not found', async () => {
      const config = makeConfig()
      const updateStoreCallback = vi.fn().mockResolvedValue(undefined)
      config.updateStoreCallback = updateStoreCallback

      await applyToLinkedChannels(config, 999, (filter) => {
        filter.gain = 99
      })

      expect(updateStoreCallback).not.toHaveBeenCalled()
      expect(config.channelArrays.left[0].gain).toBe(0)
      expect(config.channelArrays.right[0].gain).toBe(0)
    })
  })

  describe('addFilterToLinkedChannels', () => {
    it('adds cloned filters to each channel and calls addStoreCallback with the new index', async () => {
      const config = makeConfig()
      const addStoreCallback = vi.fn().mockResolvedValue(undefined)
      config.addStoreCallback = addStoreCallback
      const newFilter = makeFilter(99, { text: 'new' })

      await addFilterToLinkedChannels(config, newFilter)

      expect(config.channelArrays.left).toHaveLength(3)
      expect(config.channelArrays.right).toHaveLength(3)
      expect(config.channelArrays.left[2]).not.toBe(newFilter)
      expect(config.channelArrays.right[2]).not.toBe(newFilter)
      expect(addStoreCallback).toHaveBeenNthCalledWith(1, 'left', 2, config.channelArrays.left[2])
      expect(addStoreCallback).toHaveBeenNthCalledWith(2, 'right', 2, config.channelArrays.right[2])
    })

    it('warns and skips unknown channels when explicit targets include missing entries', async () => {
      const config = makeConfig()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await addFilterToLinkedChannels(config, makeFilter(77), ['left', 'missing'])

      expect(config.channelArrays.left).toHaveLength(3)
      expect(warnSpy).toHaveBeenCalledWith('[Linked Channels] Unknown channel: missing')

      warnSpy.mockRestore()
    })
  })

  describe('removeFilterFromLinkedChannels', () => {
    it('removes matching filters and invokes removeStoreCallback for each channel', async () => {
      const config = makeConfig()
      const removeStoreCallback = vi.fn().mockResolvedValue(undefined)
      config.removeStoreCallback = removeStoreCallback

      await removeFilterFromLinkedChannels(config, 1)

      expect(config.channelArrays.left.map(f => f.id)).toEqual([2])
      expect(config.channelArrays.right.map(f => f.id)).toEqual([3])
      expect(removeStoreCallback).toHaveBeenNthCalledWith(1, 'left', 0)
      expect(removeStoreCallback).toHaveBeenNthCalledWith(2, 'right', 0)
    })

    it('keeps arrays unchanged when filter does not exist', async () => {
      const config = makeConfig()
      const beforeLeft = [...config.channelArrays.left]

      await removeFilterFromLinkedChannels(config, 999)

      expect(config.channelArrays.left).toEqual(beforeLeft)
    })

    it('warns when explicit targets include an unknown channel', async () => {
      const config = makeConfig()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await removeFilterFromLinkedChannels(config, 1, ['missing'])

      expect(warnSpy).toHaveBeenCalledWith('[Linked Channels] Unknown channel: missing')

      warnSpy.mockRestore()
    })

    it('removes filters even when removeStoreCallback is not provided', async () => {
      const config = makeConfig()

      await removeFilterFromLinkedChannels(config, 1, ['left'])

      expect(config.channelArrays.left.map(f => f.id)).toEqual([2])
    })
  })

  describe('toggleFilterEnabledLinked', () => {
    it('warns and exits when target filter does not exist in any channel', async () => {
      const config = makeConfig()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await toggleFilterEnabledLinked(config, 500)

      expect(mocks.setIndividualFilterBypassState).not.toHaveBeenCalled()
      expect(warnSpy).toHaveBeenCalledWith('[Linked Channels] Filter 500 not found in any channel')

      warnSpy.mockRestore()
    })

    it('updates UI state, calls store callback, and toggles hardware bypass for each channel', async () => {
      const config = makeConfig()
      const updateStoreCallback = vi.fn().mockResolvedValue(undefined)
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      config.updateStoreCallback = updateStoreCallback

      await toggleFilterEnabledLinked(config, 1)

      expect(config.channelArrays.left[0].enabled).toBe(false)
      expect(config.channelArrays.right[0].enabled).toBe(false)
      expect(updateStoreCallback).toHaveBeenCalledTimes(2)
      expect(mocks.setIndividualFilterBypassState).toHaveBeenNthCalledWith(1, 'IIR_L', 0, true)
      expect(mocks.setIndividualFilterBypassState).toHaveBeenNthCalledWith(2, 'IIR_R', 0, true)
      expect(logSpy).toHaveBeenCalledTimes(2)

      logSpy.mockRestore()
    })

    it('warns and skips channels with missing filters or bank addresses', async () => {
      const config = makeConfig()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      config.channelArrays.right = undefined as unknown as Filter[]
      config.bankAddresses.left = ''

      await toggleFilterEnabledLinked(config, 1, ['left', 'right'])

      expect(warnSpy).toHaveBeenCalledWith('[Linked Channels] Missing filters or bank address for channel: left')
      expect(warnSpy).toHaveBeenCalledWith('[Linked Channels] Missing filters or bank address for channel: right')
      expect(mocks.setIndividualFilterBypassState).not.toHaveBeenCalled()

      warnSpy.mockRestore()
    })

    it('reverts local state and rethrows when bypass API fails', async () => {
      const config = makeConfig()
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mocks.setIndividualFilterBypassState.mockRejectedValueOnce(new Error('bypass failed'))

      await expect(toggleFilterEnabledLinked(config, 1, ['left'])).rejects.toThrow('bypass failed')
      expect(config.channelArrays.left[0].enabled).toBe(true)

      errorSpy.mockRestore()
    })

    it('logs enabled action when filter starts disabled and becomes enabled', async () => {
      const config = makeConfig()
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      config.channelArrays.left[0].enabled = false

      await toggleFilterEnabledLinked(config, 1, ['left'])

      expect(config.channelArrays.left[0].enabled).toBe(true)
      expect(logSpy).toHaveBeenCalledWith('Filter left[0] enabled - ok')

      logSpy.mockRestore()
    })
  })

  describe('copyFiltersToChannels', () => {
    it('warns and returns when source channel does not exist', async () => {
      const config = makeConfig()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await copyFiltersToChannels(config, 'missing', ['right'])

      expect(warnSpy).toHaveBeenCalledWith('[Linked Channels] Source channel missing not found')

      warnSpy.mockRestore()
    })

    it('copies filters with new ids and rebuilds backend store for target channels', async () => {
      const config = makeConfig()
      const clearStoreCallback = vi.fn().mockResolvedValue(undefined)
      const addStoreCallback = vi.fn().mockResolvedValue(undefined)
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(12345)
      config.clearStoreCallback = clearStoreCallback
      config.addStoreCallback = addStoreCallback

      await copyFiltersToChannels(config, 'left', ['left', 'right'])

      expect(config.channelArrays.right).toHaveLength(2)
      expect(config.channelArrays.right[0].id).toBe(12345 + 0 + 1000 + ('r'.charCodeAt(0) * 100))
      expect(config.channelArrays.right[1].id).toBe(12345 + 1 + 1000 + ('r'.charCodeAt(0) * 100))
      expect(clearStoreCallback).toHaveBeenCalledWith('right')
      expect(addStoreCallback).toHaveBeenCalledTimes(2)
      expect(addStoreCallback).toHaveBeenNthCalledWith(1, 'right', 0, config.channelArrays.right[0])
      expect(addStoreCallback).toHaveBeenNthCalledWith(2, 'right', 1, config.channelArrays.right[1])

      nowSpy.mockRestore()
    })

    it('warns and skips unknown target channels', async () => {
      const config = makeConfig()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await copyFiltersToChannels(config, 'left', ['missing'])

      expect(warnSpy).toHaveBeenCalledWith('[Linked Channels] Target channel missing not found')

      warnSpy.mockRestore()
    })

    it('copies filters without backend callbacks when callbacks are omitted', async () => {
      const config = makeConfig()
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(5000)

      await copyFiltersToChannels(config, 'left', ['right'])

      expect(config.channelArrays.right).toHaveLength(2)
      expect(config.channelArrays.right[0].id).toBe(5000 + 0 + 1000 + ('r'.charCodeAt(0) * 100))

      nowSpy.mockRestore()
    })
  })

  describe('linked property/coefficient updates', () => {
    it('updateFilterPropertyLinked applies updater across linked channels', async () => {
      const config = makeConfig()

      await updateFilterPropertyLinked(config, 1, (filter) => {
        filter.frequency = 2222
      })

      expect(config.channelArrays.left[0].frequency).toBe(2222)
      expect(config.channelArrays.right[0].frequency).toBe(2222)
    })

    it('updateGenericCoeffLinked initializes genericCoeffs and updates known coefficient', async () => {
      const config = makeConfig()
      config.channelArrays.left[0].icon = 'generic_normalized'
      config.channelArrays.right[0].icon = 'generic_normalized'
      delete config.channelArrays.left[0].genericCoeffs
      delete config.channelArrays.right[0].genericCoeffs

      await updateGenericCoeffLinked(config, 1, 'b1', 0.25)

      expect(config.channelArrays.left[0].genericCoeffs).toEqual({ b0: 1, b1: 0.25, b2: 0, a1: 0, a2: 0 })
      expect(config.channelArrays.right[0].genericCoeffs).toEqual({ b0: 1, b1: 0.25, b2: 0, a1: 0, a2: 0 })
    })

    it('ignores unknown generic coefficient names', async () => {
      const config = makeConfig()
      config.channelArrays.left[0].genericCoeffs = { b0: 1, b1: 2, b2: 3, a1: 4, a2: 5 }

      await updateGenericCoeffLinked(config, 1, 'unknown', 99, ['left'])

      expect(config.channelArrays.left[0].genericCoeffs).toEqual({ b0: 1, b1: 2, b2: 3, a1: 4, a2: 5 })
    })

    it('updates each supported generic coefficient name', async () => {
      const config = makeConfig()
      config.channelArrays.left[0].genericCoeffs = { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 }

      await updateGenericCoeffLinked(config, 1, 'b0', 9, ['left'])
      await updateGenericCoeffLinked(config, 1, 'b2', 8, ['left'])
      await updateGenericCoeffLinked(config, 1, 'a1', 7, ['left'])
      await updateGenericCoeffLinked(config, 1, 'a2', 6, ['left'])

      expect(config.channelArrays.left[0].genericCoeffs).toEqual({ b0: 9, b1: 0, b2: 8, a1: 7, a2: 6 })
    })
  })
})
