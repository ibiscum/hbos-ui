import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

import SoundView from '../sound.vue'
import { frequencyToX, DEFAULT_FREQ_RANGE } from '@/utils/filtergraph'

vi.mock('@/helpers/dspFilterBankTranslations', () => ({
  getFilterBankDisplayName: (channel: 'left' | 'right' | 'both') =>
    ({ left: 'Left', right: 'Right', both: 'Linked' })[channel],
}))

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['icon'],
    template: '<button class="icon-stub" :data-icon="icon" v-bind="$attrs"><slot /></button>',
  },
}))

vi.mock('@/components/ToggleSwitch.vue', () => ({
  default: {
    name: 'ToggleSwitch',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input class="toggle-switch-stub" type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
  },
}))

describe('sound view consolidated unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() {
        return 900
      },
    })
  })

  const mountView = async () => {
    const wrapper = mount(SoundView, {
      global: {
        stubs: {
          teleport: true,
        },
      },
    })

    await flushPromises()
    return wrapper
  }

  describe('unit coverage', () => {
    it('renders default filter controls and add-filter affordance', async () => {
      const wrapper = await mountView()

      expect(wrapper.text()).toContain('Speaker Equaliser')
      expect(wrapper.findAll('.filter-item')).toHaveLength(2)
      expect(wrapper.text()).toContain('Add New Filter')
      expect(wrapper.text()).toContain('Peaking EQ')
    })

    it('toggles channel mode and marks both tabs active in linked mode', async () => {
      const wrapper = await mountView()

      const linkToggle = wrapper.find('[data-icon="link-unlinked"]')
      expect(linkToggle.exists()).toBe(true)

      await linkToggle.trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-icon="link"]').exists()).toBe(true)
      expect(wrapper.findAll('.tab.active')).toHaveLength(2)
    })

    it('opens add-filter modal and adds a selected filter type', async () => {
      const wrapper = await mountView()

      expect(wrapper.find('.modal-backdrop').exists()).toBe(false)
      const initialCount = wrapper.findAll('.filter-item').length

      await wrapper.get('.add-filter-item').trigger('click')
      await flushPromises()

      expect(wrapper.find('.modal-backdrop').exists()).toBe(true)

      const typeButton = wrapper.get('.filter-type-option')
      await typeButton.trigger('click')
      await flushPromises()

      expect(wrapper.find('.modal-backdrop').exists()).toBe(false)
      expect(wrapper.findAll('.filter-item')).toHaveLength(initialCount + 1)
    })

    it('temporarily bypasses filters while ear button is held and restores on release', async () => {
      const wrapper = await mountView()

      expect(wrapper.find('path[stroke="#00b8ff"]').exists()).toBe(true)

      const earButton = wrapper.get('[data-icon="ear"]')
      await earButton.trigger('mousedown')
      await flushPromises()

      expect(wrapper.find('path[stroke="#00b8ff"]').exists()).toBe(false)

      await earButton.trigger('mouseup')
      await flushPromises()

      expect(wrapper.find('path[stroke="#00b8ff"]').exists()).toBe(true)
    })
  })

  describe('regression coverage', () => {
    it('uses peaking-Q bandwidth formula for active peaking filter markers', async () => {
      const wrapper = await mountView()

      const startLine = wrapper.get('line[stroke="#e11e4a"][stroke-dasharray="8 4"]')
      const endLine = wrapper.get('line[stroke="#00b8ff"][stroke-dasharray="4 2"]')

      const startX = Number(startLine.attributes('x1'))
      const endX = Number(endLine.attributes('x1'))

      const bandwidthHz = 1000 / 0.71
      const expectedStartFreq = Math.max(20, 1000 - bandwidthHz / 2)
      const expectedEndFreq = Math.min(DEFAULT_FREQ_RANGE.max, 1000 + bandwidthHz / 2)

      const expectedStartX = frequencyToX(expectedStartFreq, 820)
      const expectedEndX = frequencyToX(expectedEndFreq, 820)

      expect(startX).toBeCloseTo(expectedStartX, 3)
      expect(endX).toBeCloseTo(expectedEndX, 3)
    })

    it('closes add-filter modal on Escape', async () => {
      const wrapper = await mountView()

      await wrapper.get('.add-filter-item').trigger('click')
      await flushPromises()
      expect(wrapper.find('.modal-backdrop').exists()).toBe(true)

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()

      expect(wrapper.find('.modal-backdrop').exists()).toBe(false)
    })
  })
})
