import { describe, expect, it, expectTypeOf } from 'vitest'

import {
  FilterBackend,
  type BackendCapabilities,
  type Filter,
  type FilterBanks,
  type FilterBankInfo,
  type FilterUpdate,
  type NewFilter,
} from '@/stores/filter-backend-interface'

class InMemoryContractBackend extends FilterBackend {
  readonly name = 'Contract Backend'
  readonly shortDescription = 'Contract test backend'
  readonly description = 'Backend used to validate FilterBackend contract behavior'

  private nextId = 0
  private banks: FilterBanks = {
    left: { name: 'left', filters: [] },
    right: { name: 'right', filters: [] },
  }

  async getBackendCapabilities(): Promise<BackendCapabilities> {
    const availableFilterBanks: FilterBankInfo[] = Object.entries(this.banks).map(([name, bank]) => ({
      name,
      maxFilters: 16,
      currentFilterCount: bank.filters.length,
      filterBankType: name === 'left' || name === 'right' ? 'speaker-equalizer' : 'custom',
      bankAddress: name,
    }))

    return {
      availableFilterBanks,
      backendName: this.name,
      backendDescription: this.description,
      backendShortDescription: this.shortDescription,
      sampleRate: 48000,
    }
  }

  async addFilter(bankName: string, position: number, filter: NewFilter): Promise<string> {
    if (!this.banks[bankName]) {
      this.banks[bankName] = { name: bankName, filters: [] }
    }

    const id = `filter_${this.nextId++}`
    const nextFilter: Filter = { ...filter, id }
    const target = this.banks[bankName].filters
    const index = Math.max(0, Math.min(position, target.length))
    target.splice(index, 0, nextFilter)
    return id
  }

  async removeFilter(bankName: string, position: number): Promise<boolean> {
    const bank = this.banks[bankName]
    if (!bank || position < 0 || position >= bank.filters.length) {
      return false
    }

    bank.filters.splice(position, 1)
    return true
  }

  async updateFilter(bankName: string, position: number, updates: FilterUpdate): Promise<boolean> {
    const bank = this.banks[bankName]
    if (!bank || position < 0 || position >= bank.filters.length) {
      return false
    }

    const current = bank.filters[position]
    bank.filters[position] = {
      ...current,
      ...updates,
      id: current.id,
    }

    return true
  }

  async clearFiltersFromBank(bankName: string): Promise<void> {
    if (!this.banks[bankName]) {
      this.banks[bankName] = { name: bankName, filters: [] }
    }

    this.banks[bankName].filters = []
  }

  async createFilterBank(bankName: string): Promise<void> {
    if (!this.banks[bankName]) {
      this.banks[bankName] = { name: bankName, filters: [] }
    }
  }

  async removeFilterBank(bankName: string): Promise<boolean> {
    if (!this.banks[bankName]) {
      return false
    }

    delete this.banks[bankName]
    return true
  }

  async exportFilterConfig(): Promise<FilterBanks> {
    return JSON.parse(JSON.stringify(this.banks)) as FilterBanks
  }

  async importFilterConfig(config: FilterBanks): Promise<void> {
    this.banks = JSON.parse(JSON.stringify(config)) as FilterBanks
  }

  async getCurrentConfig(): Promise<FilterBanks> {
    return this.exportFilterConfig()
  }
}

const makeFilter = (overrides: Partial<NewFilter> = {}): NewFilter => ({
  type: 'highpass',
  frequency: 80,
  q: 0.7,
  enabled: true,
  ...overrides,
})

describe('filter backend interface - unit and regression tests', () => {
  it('keeps NewFilter and FilterUpdate aliases aligned with Filter shape', () => {
    expectTypeOf<NewFilter>().toEqualTypeOf<Omit<Filter, 'id'>>()
    expectTypeOf<FilterUpdate>().toEqualTypeOf<Partial<Omit<Filter, 'id'>>>()
  })

  it('exposes consistent backend capability metadata', async () => {
    const backend = new InMemoryContractBackend()

    const capabilities = await backend.getBackendCapabilities()

    expect(capabilities.backendName).toBe('Contract Backend')
    expect(capabilities.backendShortDescription).toBe('Contract test backend')
    expect(capabilities.sampleRate).toBe(48000)
    expect(capabilities.availableFilterBanks.map((bank) => bank.name)).toEqual(['left', 'right'])
  })

  it('adds filters with clamped insertion positions and unique ids', async () => {
    const backend = new InMemoryContractBackend()

    const idA = await backend.addFilter('left', 99, makeFilter({ frequency: 100 }))
    const idB = await backend.addFilter('left', -5, makeFilter({ frequency: 200 }))

    expect(idA).toBe('filter_0')
    expect(idB).toBe('filter_1')

    const config = await backend.getCurrentConfig()
    expect(config.left.filters).toHaveLength(2)
    expect(config.left.filters[0].frequency).toBe(200)
    expect(config.left.filters[1].frequency).toBe(100)
  })

  it('updates filters while preserving id when runtime payload includes id', async () => {
    const backend = new InMemoryContractBackend()

    const id = await backend.addFilter('left', 0, makeFilter({ frequency: 120 }))
    const updatesWithId = {
      id: 'should-not-overwrite',
      frequency: 1000,
      gain: 3,
    } as unknown as FilterUpdate

    const updated = await backend.updateFilter('left', 0, updatesWithId)

    expect(updated).toBe(true)
    const config = await backend.getCurrentConfig()
    expect(config.left.filters[0].id).toBe(id)
    expect(config.left.filters[0].frequency).toBe(1000)
    expect(config.left.filters[0].gain).toBe(3)
  })

  it('returns status for invalid remove/update positions', async () => {
    const backend = new InMemoryContractBackend()
    await backend.addFilter('left', 0, makeFilter())

    await expect(backend.removeFilter('left', -1)).resolves.toBe(false)
    await expect(backend.removeFilter('left', 99)).resolves.toBe(false)
    await expect(backend.updateFilter('left', -1, { frequency: 900 })).resolves.toBe(false)
    await expect(backend.updateFilter('left', 99, { frequency: 900 })).resolves.toBe(false)
  })

  it('export and current config return snapshots (no mutable aliasing)', async () => {
    const backend = new InMemoryContractBackend()
    await backend.addFilter('left', 0, makeFilter())

    const exported = await backend.exportFilterConfig()
    exported.left.filters[0].frequency = 9999

    const current = await backend.getCurrentConfig()
    current.left.filters[0].frequency = 8888

    const persisted = await backend.getCurrentConfig()
    expect(persisted.left.filters[0].frequency).toBe(80)
  })
})
