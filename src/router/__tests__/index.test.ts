import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/api/system', () => ({
  getSetupStatus: vi.fn(),
  resetSetup: vi.fn(),
}))

vi.mock('@/views/queue.vue', () => ({
  default: {
    template: '<div class="queue-view-stub">queue-view</div>',
  },
}))

vi.mock('@/views/setup.vue', () => ({
  default: {
    template: '<div class="setup-view-stub">setup-view</div>',
  },
}))

vi.mock('@/layouts/default.vue', () => ({
  default: {
    template: '<div class="default-layout-stub"><router-view /></div>',
  },
}))

vi.mock('@/views/router-view.vue', () => ({
  default: {
    template: '<div class="router-view-stub"><router-view /></div>',
  },
}))

vi.mock('@/views/library/index.vue', () => ({
  default: {
    template: '<div class="library-view-stub">library-view</div>',
  },
}))

vi.mock('@/views/library/albums/artist-album.vue', () => ({
  default: {
    template: '<div class="artist-album-view-stub">artist-album-view</div>',
  },
}))

vi.mock('@/views/services/index.vue', () => ({
  default: {
    template: '<div class="services-view-stub">services-view</div>',
  },
}))

vi.mock('@/views/now-playing.vue', () => ({
  default: {
    template: '<div class="now-playing-view-stub">now-playing-view</div>',
  },
}))

vi.mock('@/views/now-playing-minimal.vue', () => ({
  default: {
    template: '<div class="now-playing-minimal-view-stub">now-playing-minimal-view</div>',
  },
}))

const loadRouter = async () => {
  vi.resetModules()

  const routerModule = await import('../index')
  const systemApi = await import('@/api/system')

  return {
    router: routerModule.default,
    markSetupCompleted: routerModule.markSetupCompleted,
    getSetupStatus: vi.mocked(systemApi.getSetupStatus),
    resetSetup: vi.mocked(systemApi.resetSetup),
  }
}

describe('router index', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('declares critical top-level routes', async () => {
    const { router } = await loadRouter()

    const playlistRoute = router.getRoutes().find((route) => route.name === 'playlist')
    const setupRoute = router.getRoutes().find((route) => route.name === 'setup')
    const artistAlbumRoute = router.getRoutes().find((route) => route.name === 'artist-album')

    expect(setupRoute?.path).toBe('/setup')
    expect(playlistRoute?.path).toBe('/playlist')
    expect(artistAlbumRoute?.path).toBe('/library/albums/artist/:artistId')
  })

  it('declares sound route hierarchy with canonical child paths', async () => {
    const { router } = await loadRouter()

    const soundRoute = router.getRoutes().find((route) => route.name === 'sound')
    const generalSoundRoute = router.getRoutes().find((route) => route.name === 'general-sound')
    const speakerEqRoute = router.getRoutes().find((route) => route.name === 'speaker-equalizer')
    const crossoverRoute = router.getRoutes().find((route) => route.name === 'crossover-design')
    const roomAcousticsRoute = router.getRoutes().find((route) => route.name === 'room-acoustics')

    expect(soundRoute?.path).toBe('/sound')
    expect(generalSoundRoute?.path).toBe('/sound/general')
    expect(speakerEqRoute?.path).toBe('/sound/speaker-equalizer')
    expect(crossoverRoute?.path).toBe('/sound/crossover-design')
    expect(roomAcousticsRoute?.path).toBe('/sound/room-acoustics')
  })

  it('resolves artist-album named route to canonical nested URL shape', async () => {
    const { router } = await loadRouter()

    const resolved = router.resolve({
      name: 'artist-album',
      params: { artistId: 'artist-42' },
    })

    expect(resolved.name).toBe('artist-album')
    expect(resolved.path).toBe('/library/albums/artist/artist-42')
    expect(resolved.href).toContain('/library/albums/artist/artist-42')
  })

  it('resolves /playlist to queue wrapper and renders queue view', async () => {
    const { router } = await loadRouter()

    const playlistRoute = router.getRoutes().find((route) => route.name === 'playlist')
    expect(playlistRoute?.path).toBe('/playlist')

    const componentLoader = playlistRoute?.components?.default
    expect(typeof componentLoader).toBe('function')

    const loadedComponent = await (componentLoader as () => Promise<{ default: unknown }>)()
    const wrapper = mount(loadedComponent.default as object)

    expect(wrapper.find('.queue-view-stub').exists()).toBe(true)
  })

  it('setup-restart guard calls resetSetup and redirects to setup', async () => {
    const { router, resetSetup, getSetupStatus } = await loadRouter()
    resetSetup.mockResolvedValue({ status: 'success', message: 'ok' } as never)

    const setupRestartRoute = router.getRoutes().find((route) => route.name === 'setup-restart')
    const setupRestartGuard = setupRestartRoute?.beforeEnter as
      | ((to: unknown, from: unknown) => Promise<unknown>)
      | undefined

    const result = await setupRestartGuard?.({} as unknown, {} as unknown)
    expect(result).toEqual({ name: 'setup' })
    expect(resetSetup).toHaveBeenCalledTimes(1)

    await router.push('/library')

    expect(getSetupStatus).toHaveBeenCalledTimes(0)
    expect(router.currentRoute.value.name).toBe('setup')
  })

  it('setup-restart guard still redirects when resetSetup fails', async () => {
    const { router, resetSetup } = await loadRouter()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    resetSetup.mockRejectedValue(new Error('reset failed'))

    const setupRestartRoute = router.getRoutes().find((route) => route.name === 'setup-restart')
    const setupRestartGuard = setupRestartRoute?.beforeEnter as
      | ((to: unknown, from: unknown) => Promise<unknown>)
      | undefined

    const result = await setupRestartGuard?.({} as unknown, {} as unknown)

    expect(result).toEqual({ name: 'setup' })
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
  })

  it('skips setup status fetch for setup route', async () => {
    const { router, getSetupStatus } = await loadRouter()
    getSetupStatus.mockResolvedValue({ data: { setup_completed: false } } as never)

    await router.push('/setup')

    expect(getSetupStatus).toHaveBeenCalledTimes(0)
    expect(router.currentRoute.value.name).toBe('setup')
  })

  it('redirects to setup when setup is incomplete', async () => {
    const { router, getSetupStatus } = await loadRouter()
    getSetupStatus.mockResolvedValue({ data: { setup_completed: false } } as never)

    await router.push('/library')

    expect(getSetupStatus).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.name).toBe('setup')
  })

  it('allows navigation when setup is complete', async () => {
    const { router, getSetupStatus } = await loadRouter()
    getSetupStatus.mockResolvedValue({ data: { setup_completed: true } } as never)

    await router.push('/library')

    expect(getSetupStatus).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.name).toBe('library')
  })

  it('assumes setup is complete when setup API fails', async () => {
    const { router, getSetupStatus } = await loadRouter()
    getSetupStatus.mockRejectedValue(new Error('status failed'))

    await router.push('/library')

    expect(getSetupStatus).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.name).toBe('library')
  })

  it('checks setup status only once after first guarded navigation', async () => {
    const { router, getSetupStatus } = await loadRouter()
    getSetupStatus.mockResolvedValue({ data: { setup_completed: true } } as never)

    await router.push('/library')
    await router.push('/services')

    expect(getSetupStatus).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.name).toBe('services')
  })

  it('markSetupCompleted bypasses setup API checks', async () => {
    const { router, markSetupCompleted, getSetupStatus } = await loadRouter()

    markSetupCompleted()
    await router.push('/library')

    expect(getSetupStatus).toHaveBeenCalledTimes(0)
    expect(router.currentRoute.value.name).toBe('library')
  })

  it('falls back unknown routes to root redirect chain', async () => {
    const { router, getSetupStatus } = await loadRouter()
    getSetupStatus.mockResolvedValue({ data: { setup_completed: true } } as never)

    await router.push('/path/that/does/not/exist')

    expect(router.currentRoute.value.name).toBe('now-playing')
  })

  it('loads all lazy-loaded route components', async () => {
    const { router } = await loadRouter()

    const loaders = router
      .getRoutes()
      .flatMap((route) => Object.values(route.components ?? {}))
      .filter((component): component is () => Promise<{ default: unknown }> =>
        typeof component === 'function',
      )

    expect(loaders.length).toBeGreaterThan(0)

    const loadedModules = await Promise.all(loaders.map((loader) => loader()))

    for (const loadedModule of loadedModules) {
      expect(loadedModule).toHaveProperty('default')
    }
  })
})
