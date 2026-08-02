import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useFilterStore } from '@/stores/filter_connector'

describe('filter connector - custom bank regression tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('allows adding filters to custom-created banks', async () => {
    const store = useFilterStore()

    await store.createFilterBank('C1')

    const id = await store.addFilter('C1', 0, {
      type: 'highpass',
      frequency: 80,
      q: 0.7,
      enabled: true,
    })

    expect(id).toMatch(/^filter_/)
    expect(store.getFilterCount('C1')).toBe(1)
  })

  it('reports custom banks in backend capabilities after creation', async () => {
    const store = useFilterStore()

    await store.createFilterBank('C2')
    const capabilities = await store.getBackendCapabilities()
    const c2 = capabilities.availableFilterBanks.find((bank) => bank.name === 'C2')

    expect(c2).toBeDefined()
    expect(c2?.maxFilters).toBeGreaterThan(0)
  })
})
