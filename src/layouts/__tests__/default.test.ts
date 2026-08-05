import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'

const RouteComponentStub = {
  template: '<section class="route-component">Route Content</section>',
}

const routeState = reactive<{ name: string | null }>({
  name: null,
})

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')

  return {
    ...actual,
    useRoute: () => routeState,
  }
})

vi.mock('@/components/Header.vue', () => ({
  default: {
    name: 'Header',
    props: {
      isPlayerControls: {
        type: Boolean,
        required: true,
      },
    },
    template: '<header class="header-stub" :data-player-controls="String(isPlayerControls)" />',
  },
}))

vi.mock('@/components/Sidebar.vue', () => ({
  default: {
    name: 'Sidebar',
    props: {
      isPlayerControls: {
        type: Boolean,
        required: true,
      },
    },
    template: '<aside class="sidebar-stub" :data-player-controls="String(isPlayerControls)" />',
  },
}))

import DefaultLayout from '../default.vue'

const mountLayout = () =>
  mount(DefaultLayout, {
    global: {
      stubs: {
        RouterView: {
          name: 'RouterView',
          template: '<div class="router-view-stub"><slot :Component="RouteComponentStub" /></div>',
          data() {
            return { RouteComponentStub }
          },
        },
        Transition: {
          name: 'Transition',
          template: '<div class="transition-stub"><slot /></div>',
        },
      },
    },
  })

describe('default layout', () => {
  beforeEach(() => {
    routeState.name = null
  })

  it('shows header and keeps default spacing when player controls are enabled', () => {
    routeState.name = 'library'

    const wrapper = mountLayout()

    expect(wrapper.find('.header-stub').exists()).toBe(true)

    const main = wrapper.get('main')
    expect(main.classes()).not.toContain('no-player-controls')
    expect(main.classes()).not.toContain('no-header')

    expect(wrapper.get('.sidebar-stub').attributes('data-player-controls')).toBe('true')
    expect(wrapper.get('.header-stub').attributes('data-player-controls')).toBe('true')
  })

  it('hides header and applies compact spacing for now-playing route', () => {
    routeState.name = 'now-playing'

    const wrapper = mountLayout()

    expect(wrapper.find('.header-stub').exists()).toBe(false)

    const main = wrapper.get('main')
    expect(main.classes()).toContain('no-player-controls')
    expect(main.classes()).toContain('no-header')

    expect(wrapper.get('.sidebar-stub').attributes('data-player-controls')).toBe('false')
  })

  it('renders routed content through transition wrapper', () => {
    routeState.name = 'library'

    const wrapper = mountLayout()

    expect(wrapper.find('transition-stub').exists() || wrapper.find('.transition-stub').exists()).toBe(true)
    expect(wrapper.find('.route-component').text()).toBe('Route Content')
  })
})
