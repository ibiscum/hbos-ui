import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

import type { BiquadFilterType } from '@/utils/biquad'
import AddFilterModal from '@/components/speaker-eq/AddFilterModal.vue'
import { getFilterIconName, formatFilterTypeName } from '@/utils/filter-display'

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

const filterTypes: BiquadFilterType[] = ['lowshelf', 'peaking', 'highshelf', 'generic_normalized']

function mountModal(open = true, types: BiquadFilterType[] = filterTypes) {
  return mount(AddFilterModal, {
    props: {
      open,
      filterTypes: types,
    },
    global: {
      stubs: {
        Teleport: true,
      },
    },
  })
}

describe('AddFilterModal.vue consolidated unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders only when open is true', () => {
    const closedWrapper = mountModal(false)
    const openWrapper = mountModal(true)

    expect(closedWrapper.find('.modal-backdrop').exists()).toBe(false)
    expect(openWrapper.find('.modal-backdrop').exists()).toBe(true)
  })

  it('renders title, helper text, and one option per filter type', () => {
    const wrapper = mountModal(true)

    expect(wrapper.get('.modal-content h2').text()).toBe('Add New Filter')
    expect(wrapper.get('.modal-content p').text()).toBe('Select a filter type.')
    expect(wrapper.findAll('.filter-type-option')).toHaveLength(filterTypes.length)
  })

  it('formats labels and icon names through filter-display utilities', () => {
    const wrapper = mountModal(true)

    expect(mockFormatFilterTypeName).toHaveBeenCalledTimes(filterTypes.length)
    expect(mockGetFilterIconName).toHaveBeenCalledTimes(filterTypes.length)

    for (const type of filterTypes) {
      expect(mockFormatFilterTypeName).toHaveBeenCalledWith(type)
      expect(mockGetFilterIconName).toHaveBeenCalledWith(type)
    }

    const labels = wrapper.findAll('.filter-name').map((node) => node.text())
    expect(labels).toEqual(filterTypes.map((type) => `Pretty ${type}`))

    const icons = wrapper.findAll('.icon-stub').map((node) => node.attributes('data-icon'))
    expect(icons).toEqual(filterTypes.map((type) => `icon-${type}`))
  })

  it('emits add with selected filter type when option is clicked', async () => {
    const wrapper = mountModal(true)
    const options = wrapper.findAll('.filter-type-option')

    await options[0].trigger('click')
    await options[2].trigger('click')

    expect(wrapper.emitted('add')).toEqual([['lowshelf'], ['highshelf']])
  })

  it('keeps option buttons as type button to avoid implicit form submit regressions', () => {
    const wrapper = mountModal(true)

    for (const option of wrapper.findAll('.filter-type-option')) {
      expect(option.attributes('type')).toBe('button')
    }
  })

  it('emits close when clicking backdrop', async () => {
    const wrapper = mountModal(true)

    await wrapper.get('.modal-backdrop').trigger('click')

    expect(wrapper.emitted('close')).toEqual([[]])
  })

  it('does not emit close when clicking modal content', async () => {
    const wrapper = mountModal(true)

    await wrapper.get('.modal-content').trigger('click')

    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('preserves filter type order in rendered options (regression contract)', () => {
    const orderedTypes: BiquadFilterType[] = ['generic_normalized', 'peaking', 'lowshelf']
    const wrapper = mountModal(true, orderedTypes)

    const labels = wrapper.findAll('.filter-name').map((node) => node.text())
    expect(labels).toEqual(orderedTypes.map((type) => `Pretty ${type}`))
  })
})
