import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PlayerCard from '@/components/PlayerCard.vue'

const basePlayer = {
  name: 'Roon',
  providedBy: 'raat',
  systemdService: 'raat',
  config: 'none',
  status: 'inactive' as const,
  icon: 'roon',
  enabled: false,
  loading: false,
  allow_change: true,
  exists: true,
}

const externalPlayer = {
  name: 'Analog Input',
  providedBy: 'analog-recognition',
  systemdService: 'analog-recognition',
  config: 'none',
  status: 'inactive' as const,
  icon: 'analog',
  enabled: false,
  exists: true,
  isExternal: true,
  settings: [
    {
      key: 'songrec_enabled',
      type: 'toggle' as const,
      label: 'Recognize tracks',
      default: true,
      value: true,
    },
  ],
}

const mountCard = (player: Record<string, unknown>, isExpanded = false) =>
  mount(PlayerCard, {
    props: { player, isExpanded },
    global: {
      stubs: {
        Icon: true,
        InlineSvg: true,
        RouterLink: { template: '<a><slot /></a>' },
        ToggleSwitch: {
          name: 'ToggleSwitch',
          props: ['modelValue', 'disabled', 'loading'],
          template: '<button class="toggle-switch-stub" :disabled="disabled" @click="$emit(\'update:modelValue\', !modelValue)"></button>',
        },
      },
    },
  })

describe('PlayerCard', () => {
  it('offers an install link when the service is not installed', () => {
    const wrapper = mountCard({
      ...basePlayer,
      name: 'Tidal',
      systemdService: 'tidal-connect',
      exists: false,
      extension_package: 'hifiberry-tidal-connect',
    })

    expect(wrapper.find('[data-test="install-link"]').exists()).toBe(true)
  })

  it('does not offer an install link when the service exists', () => {
    const wrapper = mountCard({
      ...basePlayer,
      name: 'MPD',
      systemdService: 'mpd',
      exists: true,
      extension_package: 'hifiberry-mpd',
    })

    expect(wrapper.find('[data-test="install-link"]').exists()).toBe(false)
  })

  it('does not offer an install link when no extension package is known', () => {
    const wrapper = mountCard({
      ...basePlayer,
      name: 'Mystery',
      systemdService: 'mystery',
      exists: false,
      extension_package: undefined,
    })

    expect(wrapper.find('[data-test="install-link"]').exists()).toBe(false)
  })

  it('shows not-installed status text and styling when service is missing', () => {
    const wrapper = mountCard({
      ...basePlayer,
      exists: false,
      extension_package: 'hifiberry-roon',
    })

    expect(wrapper.find('.status-badge').text()).toBe('Not installed')
    expect(wrapper.find('.status-badge').classes()).toContain('gray')
    expect(wrapper.find('.player-item').classes()).toContain('not-installed')
  })

  it('does not show install link when exists is undefined', () => {
    const wrapper = mountCard({
      ...basePlayer,
      exists: undefined,
      extension_package: 'hifiberry-roon',
    })

    expect(wrapper.find('[data-test="install-link"]').exists()).toBe(false)
  })

  it('emits toggle when the main toggle switch updates', async () => {
    const wrapper = mountCard(basePlayer)

    await wrapper.find('.toggle-switch-stub').trigger('click')

    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })

  it('emits toggle-config when config caret is clicked', async () => {
    const wrapper = mountCard({
      ...basePlayer,
      name: 'Airplay',
      config: { airplayVersion: 2 },
    })

    await wrapper.find('.expand-caret').trigger('click')

    expect(wrapper.emitted('toggle-config')).toHaveLength(1)
  })

  it('emits navigate-bluetooth when bluetooth action is clicked', async () => {
    const wrapper = mountCard({
      ...basePlayer,
      name: 'Bluetooth',
      providedBy: 'hifiberry-bluetooth',
      systemdService: 'hifiberry-bluetooth',
    })

    await wrapper.find('.expand-caret').trigger('click')

    expect(wrapper.emitted('navigate-bluetooth')).toHaveLength(1)
  })

  it('emits update-airplay-version as a number when airplay select changes', async () => {
    const wrapper = mountCard({
      ...basePlayer,
      name: 'Airplay',
      config: { airplayVersion: 1 },
    }, true)

    await wrapper.find('.version-select').setValue('2')

    expect(wrapper.emitted('update-airplay-version')?.[0]).toEqual([2])
  })

  it('emits update-toslink-sensitivity when toslink select changes', async () => {
    const wrapper = mountCard({
      ...basePlayer,
      name: 'TOSLink',
      providedBy: 'DSP',
      systemdService: 'alsa-toslink',
      config: { inputSensitivity: 'medium' },
    }, true)

    await wrapper.find('.version-select').setValue('high')

    expect(wrapper.emitted('update-toslink-sensitivity')?.[0]).toEqual(['high'])
  })

  it('renders maintainer name as an external link when URL is available', () => {
    const wrapper = mountCard({
      ...basePlayer,
      maintainerName: 'Example Maintainer',
      maintainerUrl: 'https://example.com/maintainer',
    })

    const link = wrapper.find('.maintainer-link')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('https://example.com/maintainer')
  })

  it('renders a config caret for an external player that has settings', () => {
    const wrapper = mountCard(externalPlayer)

    expect(wrapper.find('.expand-caret').exists()).toBe(true)
  })

  it('emits update-external-setting when a toggle setting changes', async () => {
    const wrapper = mountCard(externalPlayer, true)

    // Scope to the settings row: PlayerCard also renders a top-level
    // enable/disable ToggleSwitch, so an unscoped findComponent would match
    // that one instead of the per-setting toggle.
    const toggle = wrapper.find('.config-option').findComponent({ name: 'ToggleSwitch' })
    toggle.vm.$emit('update:modelValue', false)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update-external-setting')?.[0]).toEqual(['songrec_enabled', false])
  })
})
