import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import SoundIndexView from '../index.vue'

vi.mock('@/components/PageContent.vue', () => ({
  default: {
    name: 'PageContent',
    props: ['title'],
    template: '<section class="page-content-stub" :data-title="title"><slot /></section>',
  },
}))

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['icon'],
    template: '<i class="icon-stub" :data-icon="icon" />',
  },
}))

vi.mock('@/components/ContentBoxLink.vue', () => ({
  default: {
    name: 'ContentBoxLink',
    props: ['to', 'height'],
    template: '<article class="content-box-link-stub" :data-route="to?.name" :data-height="String(height)"><slot /></article>',
  },
}))

const mountView = () => mount(SoundIndexView)

describe('sound/index view consolidated unit and regression tests', () => {
  describe('unit coverage', () => {
    it('renders the page shell and four navigation cards', () => {
      const wrapper = mountView()

      const page = wrapper.get('.page-content-stub')
      expect(page.attributes('data-title')).toBe('Sound')

      const cards = wrapper.findAll('.content-box-link-stub')
      expect(cards).toHaveLength(4)

      expect(wrapper.text()).toContain('General sound settings')
      expect(wrapper.text()).toContain('Speaker Equalizer')
      expect(wrapper.text()).toContain('Crossover Design')
      expect(wrapper.text()).toContain('Room Acoustics Correction')

      wrapper.unmount()
    })

    it('renders card descriptions for all sound sections', () => {
      const wrapper = mountView()

      expect(wrapper.text()).toContain('Configure global sound options and defaults for your system')
      expect(wrapper.text()).toContain('Advanced parametric equalizer with individual filter control and bypass functionality')
      expect(wrapper.text()).toContain('Configure frequency separation and phase alignment for multi-way speaker systems')
      expect(wrapper.text()).toContain('Automatically analyze and correct room acoustics for optimal sound reproduction')

      wrapper.unmount()
    })

    it('maps each card to the expected route names in order', () => {
      const wrapper = mountView()

      const routes = wrapper
        .findAll('.content-box-link-stub')
        .map((card) => card.attributes('data-route'))

      expect(routes).toEqual([
        'general-sound',
        'speaker-equalizer',
        'crossover-design',
        'room-acoustics',
      ])

      wrapper.unmount()
    })

    it('renders the expected section icons in order', () => {
      const wrapper = mountView()

      const icons = wrapper
        .findAll('.icon-stub')
        .map((icon) => icon.attributes('data-icon'))

      expect(icons).toEqual([
        'tabler/adjustments',
        'tabler/speaker',
        'tabler/crossover',
        'tabler/armchair',
      ])

      wrapper.unmount()
    })
  })

  describe('regression coverage', () => {
    it('keeps all cards at uniform height contract', () => {
      const wrapper = mountView()

      const heights = wrapper
        .findAll('.content-box-link-stub')
        .map((card) => card.attributes('data-height'))

      expect(heights).toEqual(['150', '150', '150', '150'])

      wrapper.unmount()
    })

    it('maintains exactly one card per expected route target', () => {
      const wrapper = mountView()

      const routes = wrapper
        .findAll('.content-box-link-stub')
        .map((card) => card.attributes('data-route'))

      const counts = new Map<string, number>()
      for (const route of routes) {
        counts.set(route ?? '', (counts.get(route ?? '') ?? 0) + 1)
      }

      expect(counts.get('general-sound')).toBe(1)
      expect(counts.get('speaker-equalizer')).toBe(1)
      expect(counts.get('crossover-design')).toBe(1)
      expect(counts.get('room-acoustics')).toBe(1)
      expect(counts.size).toBe(4)

      wrapper.unmount()
    })

    it('keeps tile heading order aligned with route progression', () => {
      const wrapper = mountView()

      const headings = wrapper
        .findAll('.soundCardHeader h2')
        .map((el) => el.text())

      expect(headings).toEqual([
        'General sound settings',
        'Speaker Equalizer',
        'Crossover Design',
        'Room Acoustics Correction',
      ])

      wrapper.unmount()
    })

    it('retains responsive overview grid hook class', () => {
      const wrapper = mountView()

      expect(wrapper.find('.soundOverview').exists()).toBe(true)

      wrapper.unmount()
    })
  })
})
