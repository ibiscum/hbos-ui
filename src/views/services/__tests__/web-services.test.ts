import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import WebServicesView from '../web-services.vue'

vi.mock('@/components/PageContent.vue', () => ({
  default: {
    name: 'PageContent',
    props: ['title', 'backrouterLink'],
    template:
      '<section class="page-content-stub" :data-title="title" :data-back-link="backrouterLink?.name"><slot /></section>',
  },
}))

vi.mock('@/components/Lastfm.vue', () => ({
  default: {
    name: 'LastFMIntegration',
    template: '<article class="integration-stub" data-service="lastfm">Last.fm</article>',
  },
}))

vi.mock('@/components/Spotify.vue', () => ({
  default: {
    name: 'SpotifyIntegration',
    template: '<article class="integration-stub" data-service="spotify">Spotify</article>',
  },
}))

vi.mock('@/components/Musicbrainz.vue', () => ({
  default: {
    name: 'MusicBrainzIntegration',
    template: '<article class="integration-stub" data-service="musicbrainz">MusicBrainz</article>',
  },
}))

vi.mock('@/components/Theaudiodb.vue', () => ({
  default: {
    name: 'TheAudioDBIntegration',
    template: '<article class="integration-stub" data-service="theaudiodb">TheAudioDB</article>',
  },
}))

vi.mock('@/components/Fanarttv.vue', () => ({
  default: {
    name: 'FanartTvIntegration',
    template: '<article class="integration-stub" data-service="fanarttv">Fanart.tv</article>',
  },
}))

describe('services/web-services view consolidated unit and regression tests', () => {
  describe('unit coverage', () => {
    it('renders page shell with title and back-link route contract', () => {
      const wrapper = mount(WebServicesView)

      const page = wrapper.get('.page-content-stub')
      expect(page.attributes('data-title')).toBe('Web Services')
      expect(page.attributes('data-back-link')).toBe('services')
    })

    it('renders header title and aligned descriptive copy', () => {
      const wrapper = mount(WebServicesView)

      expect(wrapper.get('.services-header h2').text()).toBe('Web Services')
      expect(wrapper.get('.services-header p').text()).toBe('Connect and manage web-based music services')
    })

    it('renders all integration sections exactly once', () => {
      const wrapper = mount(WebServicesView)

      const services = wrapper.findAll('.integration-stub').map((node) => node.attributes('data-service'))
      expect(services).toHaveLength(5)
      expect(services).toContain('lastfm')
      expect(services).toContain('spotify')
      expect(services).toContain('musicbrainz')
      expect(services).toContain('theaudiodb')
      expect(services).toContain('fanarttv')
    })
  })

  describe('regression coverage', () => {
    it('preserves stable integration render order', () => {
      const wrapper = mount(WebServicesView)

      const serviceOrder = wrapper.findAll('.integration-stub').map((node) => node.attributes('data-service'))
      expect(serviceOrder).toEqual([
        'lastfm',
        'spotify',
        'musicbrainz',
        'theaudiodb',
        'fanarttv',
      ])
    })

    it('keeps integrations as direct children of page shell for layout contract', () => {
      const wrapper = mount(WebServicesView)

      const page = wrapper.get('.page-content-stub')
      const childServiceNodes = page.findAll(':scope > .integration-stub')
      expect(childServiceNodes).toHaveLength(5)
    })

    it('keeps integrations independent from header section', () => {
      const wrapper = mount(WebServicesView)

      const header = wrapper.get('.services-header')
      expect(header.find('.integration-stub').exists()).toBe(false)
      expect(wrapper.findAll('.services-header').length).toBe(1)
    })
  })
})
