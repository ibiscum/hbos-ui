import { describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'

import RouterViewWrapper from '../router-view.vue'

const createWrapper = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/container',
        component: RouterViewWrapper,
        children: [
          {
            path: '',
            name: 'container-default',
            component: { template: '<div class="child-view">Default Child</div>' },
          },
          {
            path: 'detail',
            name: 'container-detail',
            component: { template: '<div class="child-view">Detail Child</div>' },
          },
        ],
      },
    ],
  })

  await router.push('/container')
  await router.isReady()

  const wrapper = mount(RouterViewWrapper, {
    global: {
      plugins: [router],
    },
  })

  await flushPromises()
  return { wrapper, router }
}

describe('router-view wrapper view', () => {
  it('renders nested default child route content', async () => {
    const { wrapper } = await createWrapper()

    expect(wrapper.get('.child-view').text()).toBe('Default Child')
  })

  it('reacts to route changes and renders the new child outlet content', async () => {
    const { wrapper, router } = await createWrapper()

    await router.push('/container/detail')
    await flushPromises()

    expect(wrapper.get('.child-view').text()).toBe('Detail Child')
  })
})
