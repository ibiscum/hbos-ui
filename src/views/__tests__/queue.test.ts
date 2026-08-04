import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import QueueView from '../queue.vue'

vi.mock('@/views/playlist.vue', () => ({
  default: {
    name: 'PlaylistView',
    template: '<section class="playlist-view-stub">Playlist Stub</section>',
  },
}))

describe('queue view', () => {
  it('renders PlaylistView as a direct pass-through route wrapper', () => {
    const wrapper = mount(QueueView)

    const playlist = wrapper.get('.playlist-view-stub')
    expect(playlist.text()).toBe('Playlist Stub')
  })

  it('renders exactly one PlaylistView instance and no extra wrapper shells', () => {
    const wrapper = mount(QueueView)

    expect(wrapper.findAll('.playlist-view-stub')).toHaveLength(1)
    expect(wrapper.find('section.playlist-view-stub').exists()).toBe(true)
  })
})
