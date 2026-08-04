import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import ListenNow from '@/components/ListenNow.vue'

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['icon'],
    template: '<svg class="icon-stub" :data-icon="icon" aria-hidden="true" />',
  },
}))

describe('ListenNow.vue', () => {
  it('renders the Listen Now label and play icon', () => {
    const wrapper = mount(ListenNow)

    expect(wrapper.find('.listen-now-text').text()).toBe('Listen Now')

    const icon = wrapper.get('.icon-stub')
    expect(icon.attributes('data-icon')).toBe('play')
  })

  it('emits click when button is pressed', async () => {
    const wrapper = mount(ListenNow)

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('regression: uses type=button to avoid accidental form submission', () => {
    const wrapper = mount(ListenNow)

    expect(wrapper.get('button').attributes('type')).toBe('button')
  })
})
