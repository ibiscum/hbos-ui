import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import BluetoothSettingsView from '../bluetooth-settings.vue'

vi.mock('@/components/PageContent.vue', () => ({
  default: {
    name: 'PageContent',
    props: ['title', 'backrouterLink'],
    template:
      '<section class="page-content-stub" :data-title="title" :data-back-link="backrouterLink?.name"><slot /></section>',
  },
}))

vi.mock('@/components/BluetoothSettings.vue', () => ({
  default: {
    name: 'BluetoothSettings',
    template: '<div class="bluetooth-settings-stub">Bluetooth Settings Component</div>',
  },
}))

vi.mock('@/components/BluetoothDevices.vue', () => ({
  default: {
    name: 'BluetoothDevices',
    template: '<div class="bluetooth-devices-stub">Bluetooth Devices Component</div>',
  },
}))

describe('services/bluetooth-settings view consolidated unit and regression tests', () => {
  it('renders PageContent with bluetooth settings title and services back link', () => {
    const wrapper = mount(BluetoothSettingsView)

    const pageContent = wrapper.get('.page-content-stub')
    expect(pageContent.attributes('data-title')).toBe('Bluetooth Settings')
    expect(pageContent.attributes('data-back-link')).toBe('services')
  })

  it('renders semantic bluetooth header copy', () => {
    const wrapper = mount(BluetoothSettingsView)

    expect(wrapper.get('.bluetooth-header h2').text()).toBe('Bluetooth')
    expect(wrapper.get('.bluetooth-header p').text()).toBe('Adjust Bluetooth settings.')
  })

  it('renders bluetooth settings and bluetooth devices sections exactly once', () => {
    const wrapper = mount(BluetoothSettingsView)

    expect(wrapper.findAll('.bluetooth-settings-stub')).toHaveLength(1)
    expect(wrapper.findAll('.bluetooth-devices-stub')).toHaveLength(1)
  })

  it('keeps bluetooth settings section before devices section', () => {
    const wrapper = mount(BluetoothSettingsView)

    const html = wrapper.html()
    const settingsIndex = html.indexOf('bluetooth-settings-stub')
    const devicesIndex = html.indexOf('bluetooth-devices-stub')

    expect(settingsIndex).toBeGreaterThan(-1)
    expect(devicesIndex).toBeGreaterThan(-1)
    expect(settingsIndex).toBeLessThan(devicesIndex)
  })
})
