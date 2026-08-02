import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Musicbrainz from '@/components/Musicbrainz.vue'

const mountMusicbrainz = (props: Record<string, unknown> = {}) => {
  const Icon = { template: '<i class="icon" :data-icon="$attrs.icon"></i>' }

  return mount(Musicbrainz, {
    props,
    global: {
      stubs: {
        ContentBox: { template: '<div class="content-box"><slot /></div>' },
        Icon,
      },
    },
  })
}

describe('Musicbrainz component', () => {
  it('renders default service title, description and active status', () => {
    const wrapper = mountMusicbrainz()

    expect(wrapper.find('.content-box').exists()).toBe(true)
    expect(wrapper.find('h3').text()).toBe('MusicBrainz')
    expect(wrapper.find('.service-description').text()).toContain('retrieve additional artist, song and album metadata')
    expect(wrapper.find('.status-badge').text()).toContain('Active')
    expect(wrapper.find('.status-badge').classes()).toContain('green')
  })

  it('regression: supports custom title, description and icon via props', () => {
    const wrapper = mountMusicbrainz({
      title: 'MusicBrainz Mirror',
      description: 'Custom description text',
      icon: 'tabler/brand-music',
    })

    expect(wrapper.find('h3').text()).toBe('MusicBrainz Mirror')
    expect(wrapper.find('.service-description').text()).toBe('Custom description text')
    expect(wrapper.find('[data-icon]').attributes('data-icon')).toBe('tabler/brand-music')
  })

  it('regression: exposes status semantics with role and aria-label', () => {
    const wrapper = mountMusicbrainz({
      title: 'MusicBrainz',
      statusText: 'Unavailable',
      statusVariant: 'red',
    })

    const badge = wrapper.find('.status-badge')
    expect(badge.attributes('role')).toBe('status')
    expect(badge.attributes('aria-label')).toBe('MusicBrainz service status: Unavailable')
    expect(badge.classes()).toContain('red')
    expect(badge.text()).toContain('Unavailable')
  })
})
