import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

import DisplayView from '../display.vue'

const mocks = vi.hoisted(() => {
  const darkModeRef = { value: false }
  const settingsStore = {
    loaded: true,
    isPi5OrHigher: true as boolean | null | undefined,
    getVuMeterEnabled: true as boolean | null | undefined,
    updateVuMeterEnabled: vi.fn(),
  }
  const toastStore = {
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
    showInfoToast: vi.fn(),
  }

  return {
    darkModeRef,
    settingsStore,
    toastStore,
  }
})

vi.mock('@/components/BackRouter.vue', () => ({
  default: {
    name: 'BackRouter',
    props: ['to'],
    template: '<a class="back-router-stub" :data-to="to?.name"><slot /></a>',
  },
}))

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['icon'],
    template: '<span class="icon-stub" :data-icon="icon" />',
  },
}))

vi.mock('@/components/PageContent.vue', () => ({
  default: {
    name: 'PageContent',
    template: '<section class="page-content-stub"><slot /></section>',
  },
}))

vi.mock('@/components/ToggleSwitch.vue', () => ({
  default: {
    name: 'ToggleSwitch',
    props: ['modelValue', 'disabled', 'loading'],
    emits: ['update:modelValue'],
    template:
      '<input class="toggle-switch-stub" type="checkbox" :checked="modelValue" :disabled="disabled" :aria-label="$attrs[\'aria-label\']" :aria-describedby="$attrs[\'aria-describedby\']" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
  },
}))

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => mocks.settingsStore,
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => mocks.toastStore,
}))

vi.mock('@vueuse/core', () => ({
  useDark: () => mocks.darkModeRef,
}))

const mountView = () => mount(DisplayView)

describe('services/display view consolidated unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.darkModeRef.value = false
    mocks.settingsStore.loaded = true
    mocks.settingsStore.isPi5OrHigher = true
    mocks.settingsStore.getVuMeterEnabled = true
    mocks.settingsStore.updateVuMeterEnabled.mockResolvedValue(undefined)
  })

  describe('unit coverage', () => {
    it('renders display title, info card copy, and dark mode section', () => {
      const wrapper = mountView()

      expect(wrapper.text()).toContain('Display Settings')
      expect(wrapper.text()).toContain('Display Configuration')
      expect(wrapper.text()).toContain('Configure display settings for your system.')
      expect(wrapper.text()).toContain('Dark mode')
    })

    it('renders dark mode toggle with valid accessibility linkage', () => {
      const wrapper = mountView()

      const darkToggle = wrapper.get('input[aria-label="Toggle dark mode"]')
      expect(darkToggle.attributes('aria-describedby')).toBe('dark-mode-description')
      expect(wrapper.get('#dark-mode-description').text()).toBe('System appearance preference')
    })

    it('renders and disables VU meter toggle when settings store is not loaded', async () => {
      mocks.settingsStore.loaded = false
      const wrapper = mountView()
      await flushPromises()

      const vuToggle = wrapper.get('input[aria-label="Toggle VU meter"]')
      expect(vuToggle.attributes('disabled')).toBeDefined()
    })

    it('hides VU meter section when platform capability is unavailable', async () => {
      mocks.settingsStore.isPi5OrHigher = false
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).not.toContain('VU meter')
      expect(wrapper.find('input[aria-label="Toggle VU meter"]').exists()).toBe(false)
    })
  })

  describe('regression coverage', () => {
    it('updates VU meter and shows success toast on toggle change', async () => {
      const wrapper = mountView()
      const vuToggle = wrapper.get('input[aria-label="Toggle VU meter"]')

      await vuToggle.trigger('change')
      await flushPromises()

      expect(mocks.settingsStore.updateVuMeterEnabled).toHaveBeenCalledWith(true)
      expect(mocks.toastStore.showSuccessToast).toHaveBeenCalledWith('VU meter enabled')
    })

    it('surfaces service error message when VU meter update fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      mocks.settingsStore.updateVuMeterEnabled.mockRejectedValueOnce(new Error('Service unavailable'))

      const wrapper = mountView()
      const vuToggle = wrapper.get('input[aria-label="Toggle VU meter"]')

      await vuToggle.trigger('change')
      await flushPromises()

      expect(mocks.toastStore.showErrorToast).toHaveBeenCalledWith('Service unavailable')
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('falls back to generic error copy for non-Error rejections', async () => {
      mocks.settingsStore.updateVuMeterEnabled.mockRejectedValueOnce('backend failed')

      const wrapper = mountView()
      const vuToggle = wrapper.get('input[aria-label="Toggle VU meter"]')

      await vuToggle.trigger('change')
      await flushPromises()

      expect(mocks.toastStore.showErrorToast).toHaveBeenCalledWith('Failed to update VU meter')
    })

    it('guards null capability values without rendering VU controls', async () => {
      mocks.settingsStore.isPi5OrHigher = null
      mocks.settingsStore.getVuMeterEnabled = null

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).not.toContain('VU meter')
      expect(wrapper.find('input[aria-label="Toggle VU meter"]').exists()).toBe(false)
    })
  })
})
