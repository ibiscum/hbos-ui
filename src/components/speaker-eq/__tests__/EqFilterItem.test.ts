import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import type { Filter } from '@/utils/filtercalc'
import EqFilterItem from '@/components/speaker-eq/EqFilterItem.vue'
import { formatFilterTypeName, getFilterIconName } from '@/utils/filter-display'

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['icon'],
    template: '<i class="icon-stub" :data-icon="icon" />',
  },
}))

vi.mock('@/utils/filter-display', () => ({
  getFilterIconName: vi.fn((type: string) => `icon-${type}`),
  formatFilterTypeName: vi.fn((type: string) => `Pretty ${type}`),
}))

const mockGetFilterIconName = vi.mocked(getFilterIconName)
const mockFormatFilterTypeName = vi.mocked(formatFilterTypeName)

function buildFilter(overrides: Partial<Filter> = {}): Filter {
  return {
    id: 1,
    icon: 'peaking',
    text: '1000',
    frequency: 1000,
    gain: 3,
    Q: 0.71,
    enabled: true,
    ...overrides,
  }
}

function mountItem(filter: Filter = buildFilter(), isActive = false) {
  return mount(EqFilterItem, {
    props: {
      filter,
      isActive,
    },
  })
}

describe('EqFilterItem.vue consolidated unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders active class and standard filter summary', () => {
    const wrapper = mountItem(buildFilter({ frequency: 1200, gain: 1.5, Q: 0.5 }), true)

    expect(wrapper.get('.filter-item').classes()).toContain('active')
    expect(wrapper.text()).toContain('Pretty peaking')
    expect(wrapper.text()).toContain('1200 Hz')
    expect(wrapper.text()).toContain('1.5 dB')
    expect(wrapper.text()).toContain('Q 0.50')
  })

  it('renders Q as N/A when undefined', () => {
    const wrapper = mountItem(buildFilter({ Q: undefined }))

    expect(wrapper.text()).toContain('Q N/A')
  })

  it('renders Q zero as 0.00 (regression contract)', () => {
    const wrapper = mountItem(buildFilter({ Q: 0 }))

    expect(wrapper.text()).toContain('Q 0.00')
  })

  it('renders generic filter coefficient view and nullish-safe coefficient values', () => {
    const wrapper = mountItem(buildFilter({
      icon: 'generic_normalized',
      genericCoeffs: { b0: 0, b1: 0.12, b2: -0.5, a1: 0, a2: 2.25 },
    }))

    expect(wrapper.find('.standard-controls').exists()).toBe(false)
    expect(wrapper.findAll('.coefficient-group')).toHaveLength(5)
    expect(wrapper.text()).toContain('Pretty generic_normalized')
    expect(wrapper.text()).toContain('b0=0')
    expect(wrapper.text()).toContain('a2=2.25')
  })

  it('uses fallback generic coefficient values when coefficients are missing (regression contract)', () => {
    const wrapper = mountItem(buildFilter({ icon: 'generic_normalized', genericCoeffs: undefined }))

    expect(wrapper.text()).toContain('b0=1')
    expect(wrapper.text()).toContain('b1=0')
    expect(wrapper.text()).toContain('b2=0')
    expect(wrapper.text()).toContain('a1=0')
    expect(wrapper.text()).toContain('a2=0')

    const inputValues = wrapper.findAll('.coefficient-group input').map((node) => node.element.getAttribute('value'))
    expect(inputValues).toEqual(['1', '0', '0', '0', '0'])
  })

  it('emits select on root click', async () => {
    const wrapper = mountItem(buildFilter({ id: 42 }))

    await wrapper.get('.filter-item').trigger('click')

    expect(wrapper.emitted('select')).toEqual([[42]])
  })

  it('emits remove without selecting when remove button is clicked', async () => {
    const wrapper = mountItem(buildFilter({ id: 21 }))

    await wrapper.get('.filter-remove').trigger('click')

    expect(wrapper.emitted('remove')).toEqual([[21]])
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('emits standard control events with filter payload', async () => {
    const filter = buildFilter({ id: 7 })
    const wrapper = mountItem(filter)

    const groups = wrapper.findAll('.control-group')

    await groups[0].findAll('.control-btn')[0].trigger('click')
    await groups[0].findAll('.control-btn')[1].trigger('click')
    await groups[1].findAll('.control-btn')[0].trigger('click')
    await groups[1].findAll('.control-btn')[1].trigger('click')
    await groups[2].findAll('.control-btn')[0].trigger('click')
    await groups[2].findAll('.control-btn')[1].trigger('click')

    expect(wrapper.emitted('decrement-frequency')).toEqual([[filter]])
    expect(wrapper.emitted('increment-frequency')).toEqual([[filter]])
    expect(wrapper.emitted('decrement-gain')).toEqual([[filter]])
    expect(wrapper.emitted('increment-gain')).toEqual([[filter]])
    expect(wrapper.emitted('widen-band')).toEqual([[filter]])
    expect(wrapper.emitted('narrow-band')).toEqual([[filter]])
  })

  it('emits update-generic-coeff with filter, coeff name, and native input event', async () => {
    const filter = buildFilter({
      icon: 'generic_normalized',
      genericCoeffs: { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 },
    })
    const wrapper = mountItem(filter)

    const firstInput = wrapper.findAll('.coefficient-group input')[0]
    await firstInput.setValue('1.234')

    const coeffEvent = wrapper.emitted('update-generic-coeff')
    expect(coeffEvent).toBeTruthy()
    expect(coeffEvent?.[0]?.[0]).toEqual(filter)
    expect(coeffEvent?.[0]?.[1]).toBe('b0')
    expect(coeffEvent?.[0]?.[2]).toBeInstanceOf(Event)
  })

  it('uses explicit button semantics and accessibility labels for controls', () => {
    const wrapper = mountItem()

    const removeButton = wrapper.get('.filter-remove')
    expect(removeButton.attributes('type')).toBe('button')
    expect(removeButton.attributes('aria-label')).toBe('Remove filter')

    const controlButtons = wrapper.findAll('.control-btn')
    expect(controlButtons.length).toBe(6)
    for (const button of controlButtons) {
      expect(button.attributes('type')).toBe('button')
      expect(button.attributes('aria-label')).toBeDefined()
    }
  })

  it('formats icon and filter type via filter-display utilities', () => {
    mountItem(buildFilter({ icon: 'highshelf' }))

    expect(mockGetFilterIconName).toHaveBeenCalledWith('highshelf')
    expect(mockFormatFilterTypeName).toHaveBeenCalledWith('highshelf')
  })
})
