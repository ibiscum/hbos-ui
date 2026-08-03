import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import HomeView from '../home.vue'

describe('home view', () => {
  it('renders a semantic section with accessible label and title', () => {
    const wrapper = mount(HomeView)

    const section = wrapper.get('section.home-view')
    expect(section.attributes('aria-label')).toBe('Home')
    expect(wrapper.get('h1.home-view__title').text()).toBe('Home')
  })

  it('renders helper copy and no longer uses the legacy all-caps placeholder', () => {
    const wrapper = mount(HomeView)

    expect(wrapper.get('.home-view__subtitle').text()).toBe(
      'Select a section from the sidebar to get started.',
    )
    expect(wrapper.text()).not.toContain('HOME')
  })
})
