import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import ServicesIndexView from '../index.vue'

vi.mock('@/components/PageContent.vue', () => ({
  default: {
    name: 'PageContent',
    props: ['title'],
    template: '<section class="page-content-stub" :data-title="title"><slot /></section>',
  },
}))

vi.mock('@/components/ContentBoxLink.vue', () => ({
  default: {
    name: 'ContentBoxLink',
    props: ['to', 'height'],
    template:
      '<article class="content-box-link-stub" :data-route="to?.name" :data-height="String(height)"><slot /></article>',
  },
}))

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['icon'],
    template: '<span class="icon-stub" :data-icon="icon" />',
  },
}))

const expectedCards = [
  { route: 'players', title: 'Players' },
  { route: 'web-services', title: 'Web Services' },
  { route: 'music-files', title: 'Music Files' },
  { route: 'dsp-programs', title: 'DSP Programs' },
  { route: 'dsp-backends', title: 'DSP Backends' },
  { route: 'system-info', title: 'System Information' },
  { route: 'display', title: 'Display' },
  { route: 'bluetooth-settings', title: 'Bluetooth' },
  { route: 'system-tools', title: 'System Tools' },
  { route: 'extensions', title: 'Extensions' },
  { route: 'security', title: 'Security' },
]

describe('services/index view consolidated unit and regression tests', () => {
  it('renders settings page shell with all service cards', () => {
    const wrapper = mount(ServicesIndexView)

    expect(wrapper.get('.page-content-stub').attributes('data-title')).toBe('Settings')

    const cards = wrapper.findAll('.content-box-link-stub')
    expect(cards).toHaveLength(expectedCards.length)

    for (const card of cards) {
      expect(card.attributes('data-height')).toBe('150')
    }
  })

  it('renders expected service card titles in stable order', () => {
    const wrapper = mount(ServicesIndexView)

    const titles = wrapper.findAll('.content-box-link-stub h2').map((node) => node.text())
    expect(titles).toEqual(expectedCards.map((card) => card.title))
  })

  it('maps each service card to the expected route name in order', () => {
    const wrapper = mount(ServicesIndexView)

    const routes = wrapper
      .findAll('.content-box-link-stub')
      .map((node) => node.attributes('data-route'))

    expect(routes).toEqual(expectedCards.map((card) => card.route))
  })

  it('renders one icon per card and preserves icon binding values', () => {
    const wrapper = mount(ServicesIndexView)

    const iconNodes = wrapper.findAll('.icon-stub')
    expect(iconNodes).toHaveLength(expectedCards.length)

    const iconValues = iconNodes.map((node) => node.attributes('data-icon'))
    expect(iconValues).toEqual([
      'tabler/player-play',
      'tabler/cloud',
      'nas',
      'tabler/download',
      'tabler/server',
      'computer',
      'tv',
      'tabler/bluetooth',
      'tool',
      'puzzle',
      'lock',
    ])
  })

  it('keeps system-tools caution copy visible and emphasized', () => {
    const wrapper = mount(ServicesIndexView)

    const warningText = wrapper.get('.settingsCardWarningText').text()
    expect(warningText).toContain('Warning:')
    expect(warningText).toContain('unusable state')
    expect(warningText).toContain('used incorrectly')
  })

  it('renders non-empty descriptive copy for every card', () => {
    const wrapper = mount(ServicesIndexView)

    const descriptions = wrapper.findAll('.content-box-link-stub p').map((node) => node.text().trim())
    expect(descriptions).toHaveLength(expectedCards.length)
    expect(descriptions.every((text) => text.length > 0)).toBe(true)
  })
})
