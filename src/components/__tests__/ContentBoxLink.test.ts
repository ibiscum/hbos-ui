import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { RouteLocationRaw } from 'vue-router'
import ContentBoxLink from '@/components/ContentBoxLink.vue'

const mountContentBoxLink = (
  props: { to: RouteLocationRaw, height?: number },
  attrs: Record<string, unknown> = {},
  slots: Record<string, string> = {},
) => {
  return mount(ContentBoxLink, {
    props,
    attrs,
    slots,
    global: {
      stubs: {
        'router-link': {
          name: 'RouterLink',
          props: ['to'],
          template: '<a class="router-link-stub"><slot /></a>',
        },
        ContentBox: {
          name: 'ContentBox',
          template: '<div class="content-box-stub" v-bind="$attrs"><slot /></div>',
        },
      },
    },
  })
}

describe('ContentBoxLink', () => {
  it('passes the to prop to router-link', () => {
    const route = { name: 'web-services', params: { section: 'api' } }
    const wrapper = mountContentBoxLink({ to: route })

    const routerLink = wrapper.getComponent({ name: 'RouterLink' })
    expect(routerLink.props('to')).toEqual(route)
  })

  it('renders provided slot content', () => {
    const wrapper = mountContentBoxLink(
      { to: '/settings' },
      {},
      {
        default: '<span class="slot-content">Service Settings</span>',
      },
    )

    expect(wrapper.find('.slot-content').exists()).toBe(true)
    expect(wrapper.text()).toContain('Service Settings')
  })

  it('applies semantic and legacy link classes to ContentBox', () => {
    const wrapper = mountContentBoxLink({ to: '/settings' })
    const contentBox = wrapper.get('.content-box-stub')

    expect(contentBox.classes()).toContain('content-box-link')
    expect(contentBox.classes()).toContain('contentBoxLink')
  })

  it('applies fixed pixel height when height prop is provided', () => {
    const wrapper = mountContentBoxLink({ to: '/settings', height: 150 })
    const contentBox = wrapper.get('.content-box-stub')

    expect(contentBox.attributes('style')).toContain('height: 150px;')
  })

  it('regression: does not render undefinedpx when height is omitted', () => {
    const wrapper = mountContentBoxLink({ to: '/settings' })
    const contentBox = wrapper.get('.content-box-stub')
    const style = contentBox.attributes('style') ?? ''

    expect(style).not.toContain('undefinedpx')
    expect(style).not.toContain('height:')
  })

  it('forwards non-prop attributes to router-link root element', () => {
    const wrapper = mountContentBoxLink(
      { to: '/settings' },
      {
        'data-testid': 'settings-link',
        'aria-label': 'Open settings',
      },
    )
    const link = wrapper.get('.router-link-stub')

    expect(link.attributes('data-testid')).toBe('settings-link')
    expect(link.attributes('aria-label')).toBe('Open settings')
  })
})
