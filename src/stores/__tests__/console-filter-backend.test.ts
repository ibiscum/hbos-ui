import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ConsoleFilterBackend } from '@/stores/console-filter-backend'
import type { Filter } from '@/stores/filter-backend-interface'

const makeFilter = (overrides: Partial<Omit<Filter, 'id'>> = {}): Omit<Filter, 'id'> => ({
  type: 'highpass',
  frequency: 80,
  q: 0.7,
  enabled: true,
  ...overrides,
})

describe('console filter backend - unit and regression tests', () => {
  let backend: ConsoleFilterBackend

  beforeEach(() => {
    vi.clearAllMocks()
    backend = new ConsoleFilterBackend()
  })

  it('initializes with predefined speaker and crossover banks', () => {
    expect(backend.getBankNames().sort()).toEqual(['A', 'B', 'C', 'D', 'left', 'right'])
    expect(backend.bankExists('left')).toBe(true)
    expect(backend.bankExists('D')).toBe(true)
  })

  it('returns predefined capabilities with max filters and types', async () => {
    const caps = await backend.getBackendCapabilities()

    expect(caps.backendName).toBe('Demo')
    expect(caps.backendShortDescription).toContain('Demo')

    const left = caps.availableFilterBanks.find((bank) => bank.name === 'left')
    const a = caps.availableFilterBanks.find((bank) => bank.name === 'A')

    expect(left).toMatchObject({ maxFilters: 16, filterBankType: 'speaker-equalizer' })
    expect(a).toMatchObject({ maxFilters: 16, filterBankType: 'crossover-designer' })
  })

  it('addFilter clamps insertion position and generates sequential ids', async () => {
    const id1 = await backend.addFilter('left', 99, makeFilter({ frequency: 120 }))
    const id2 = await backend.addFilter('left', -5, makeFilter({ frequency: 50 }))

    expect(id1).toBe('filter_0')
    expect(id2).toBe('filter_1')

    const filters = backend.getFiltersFromBank('left')
    expect(filters).toHaveLength(2)
    expect(filters[0].id).toBe('filter_1')
    expect(filters[1].id).toBe('filter_0')
  })

  it('enforces max capacity for predefined banks', async () => {
    for (let i = 0; i < 16; i += 1) {
      await backend.addFilter('left', i, makeFilter({ frequency: 100 + i }))
    }

    await expect(backend.addFilter('left', 16, makeFilter())).rejects.toThrow(
      'Cannot add filter: Bank "left" has reached its maximum capacity of 16 filters',
    )
  })

  it('supports custom banks with default capacity and surfaces them in capabilities', async () => {
    expect(backend.canAcceptMoreFilters('custom-1')).toBe(true)

    for (let i = 0; i < 16; i += 1) {
      await backend.addFilter('custom-1', i, makeFilter({ frequency: 200 + i }))
    }

    expect(backend.canAcceptMoreFilters('custom-1')).toBe(false)

    const caps = await backend.getBackendCapabilities()
    const custom = caps.availableFilterBanks.find((bank) => bank.name === 'custom-1')

    expect(custom).toMatchObject({
      name: 'custom-1',
      maxFilters: 16,
      currentFilterCount: 16,
      filterBankType: 'custom',
    })
  })

  it('removeFilter returns false for invalid positions and true for valid ones', async () => {
    await backend.addFilter('left', 0, makeFilter())

    await expect(backend.removeFilter('left', -1)).resolves.toBe(false)
    await expect(backend.removeFilter('left', 3)).resolves.toBe(false)
    await expect(backend.removeFilter('left', 0)).resolves.toBe(true)
    expect(backend.getFiltersFromBank('left')).toHaveLength(0)
  })

  it('updateFilter merges updates and preserves original id', async () => {
    const id = await backend.addFilter('left', 0, makeFilter({ gain: 0 }))

    const updatesWithId = {
      frequency: 400,
      gain: 3,
      id: 'should-not-overwrite',
    } as unknown as Partial<Omit<Filter, 'id'>>

    const updated = await backend.updateFilter('left', 0, updatesWithId)

    expect(updated).toBe(true)
    const filter = backend.getFilter('left', 0)
    expect(filter?.id).toBe(id)
    expect(filter?.frequency).toBe(400)
    expect(filter?.gain).toBe(3)
  })

  it('clearFiltersFromBank empties bank without deleting it', async () => {
    await backend.addFilter('right', 0, makeFilter())
    expect(backend.getFiltersFromBank('right')).toHaveLength(1)

    await backend.clearFiltersFromBank('right')

    expect(backend.bankExists('right')).toBe(true)
    expect(backend.getFiltersFromBank('right')).toHaveLength(0)
  })

  it('exportFilterConfig and getCurrentConfig return deep-cloned snapshots', async () => {
    await backend.addFilter('left', 0, makeFilter())

    const exported = await backend.exportFilterConfig()
    exported.left.filters[0].frequency = 9999

    const current = await backend.getCurrentConfig()
    current.left.filters[0].frequency = 8888

    const persisted = backend.getFilter('left', 0)
    expect(persisted?.frequency).toBe(80)
  })

  it('importFilterConfig updates next id based on highest existing filter id (regression)', async () => {
    await backend.importFilterConfig({
      left: {
        name: 'left',
        filters: [
          { id: 'filter_2', ...makeFilter({ frequency: 100 }) },
          { id: 'filter_8', ...makeFilter({ frequency: 200 }) },
        ],
      },
    })

    const newId = await backend.addFilter('left', 2, makeFilter({ frequency: 300 }))

    expect(newId).toBe('filter_9')
  })

  it('removeFilterBank reports status and resetAllBanks restores defaults', async () => {
    await backend.createFilterBank('temp')
    expect(backend.bankExists('temp')).toBe(true)

    await expect(backend.removeFilterBank('temp')).resolves.toBe(true)
    await expect(backend.removeFilterBank('temp')).resolves.toBe(false)

    await backend.addFilter('left', 0, makeFilter())
    expect(backend.getFiltersFromBank('left')).toHaveLength(1)

    backend.resetAllBanks()

    expect(backend.getFiltersFromBank('left')).toHaveLength(0)
    expect(backend.getBankNames().sort()).toEqual(['A', 'B', 'C', 'D', 'left', 'right'])

    const idAfterReset = await backend.addFilter('left', 0, makeFilter())
    expect(idAfterReset).toBe('filter_0')
  })
})
