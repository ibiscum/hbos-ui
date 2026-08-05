import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import Fanarttv from '@/components/Fanarttv.vue'

function mountComponent() {
  return mount(Fanarttv, {
    global: {
      stubs: {
        ContentBox: {
          template: '<section class="content-box-stub"><slot /></section>',
        },
        Icon: {
          props: ['icon'],
          template: '<i class="icon-stub" :data-icon="icon" />',
        },
      },
    },
  })
}

describe('Fanarttv.vue', () => {
  it('renders service title, description, and active status', () => {
    const wrapper = mountComponent()

    expect(wrapper.get('h3').text()).toBe('Fanart.tv')
    expect(wrapper.get('.service-description').text()).toBe(
      'Fanart.tv is used to retrieve high-quality album covers and artist images',
    )

    const statusBadge = wrapper.get('.status-badge')
    expect(statusBadge.classes()).toContain('green')
    expect(statusBadge.text().trim()).toBe('Active')
  })

  it('forwards the expected icon name to Icon', () => {
    const wrapper = mountComponent()

    expect(wrapper.get('.icon-stub').attributes('data-icon')).toBe('tabler/database')
  })

  it('keeps service card layout hierarchy inside ContentBox', () => {
    const wrapper = mountComponent()

    const contentBox = wrapper.get('.content-box-stub')
    const directChildren = contentBox.findAll(':scope > .card')

    expect(directChildren).toHaveLength(1)
    expect(wrapper.find('.card .service-item .service-main .service-info .service-details').exists()).toBe(true)
  })
})
