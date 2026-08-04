import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/api/system', () => ({
  getSetupStatus: vi.fn(),
  resetSetup: vi.fn(),
}))

vi.mock('@/views/playlist.vue', () => ({
  default: {
    template: '<div class="playlist-view-stub">playlist-view</div>',
  },
}))

import router from '../index'

describe('router playlist route', () => {
  it('resolves /playlist to queue wrapper and renders playlist view', async () => {
    const playlistRoute = router.getRoutes().find((route) => route.name === 'playlist')

    expect(playlistRoute).toBeDefined()
    expect(playlistRoute?.path).toBe('/playlist')

    const componentLoader = playlistRoute?.components?.default
    expect(typeof componentLoader).toBe('function')

    const loadedComponent = await (componentLoader as () => Promise<{ default: unknown }>)()
    const wrapper = mount(loadedComponent.default as object)

    expect(wrapper.find('.playlist-view-stub').exists()).toBe(true)
  })
})
