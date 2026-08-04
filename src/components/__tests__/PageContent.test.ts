import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import PageContent from '@/components/PageContent.vue'

const mountPageContent = (props: Record<string, unknown> = {}, slotContent = '<div class="slot-body">Body</div>') =>
  mount(PageContent, {
    props,
    slots: {
      default: slotContent,
    },
    global: {
      stubs: {
        BackRouter: {
          name: 'BackRouter',
          props: ['to'],
          template: '<a class="back-router-stub" :data-to="JSON.stringify(to)"><slot /></a>',
        },
        'router-link': {
          name: 'RouterLink',
          props: ['to'],
          template: '<a class="router-link-stub" :data-to="JSON.stringify(to)"><slot /></a>',
        },
      },
    },
  })

describe('PageContent.vue', () => {
  describe('unit', () => {
    it('always renders content wrapper and slot content', () => {
      const wrapper = mountPageContent()

      expect(wrapper.find('.content').exists()).toBe(true)
      expect(wrapper.find('.slot-body').exists()).toBe(true)
      expect(wrapper.text()).toContain('Body')
    })

    it('renders BackRouter branch when backrouterLink is provided', () => {
      const route = { name: 'albums' }
      const wrapper = mountPageContent({
        title: 'Albums',
        backrouterLink: route,
      })

      const backRouter = wrapper.get('.back-router-stub')
      expect(backRouter.text()).toContain('Albums')
      expect(backRouter.attributes('data-to')).toBe(JSON.stringify(route))
      expect(wrapper.find('.router-link-stub').exists()).toBe(false)
      expect(wrapper.find('h1').exists()).toBe(false)
    })

    it('renders hint-link branch with title and hint text', () => {
      const wrapper = mountPageContent({
        title: 'Now Playing',
        hintLink: '/now-playing-minimal',
        hintString: 'Switch to minimal view',
      })

      const hintLink = wrapper.get('.router-link-stub')
      expect(hintLink.classes()).toContain('title-hint-link')
      expect(hintLink.classes()).toContain('titleHintLink')
      expect(hintLink.find('h1').text()).toBe('Now Playing')
      expect(wrapper.find('.minimal-hint').text()).toBe('Switch to minimal view')
      expect(wrapper.find('.minimalHint').exists()).toBe(true)
      expect(wrapper.find('.back-router-stub').exists()).toBe(false)
    })

    it('renders plain title heading when only title is provided', () => {
      const wrapper = mountPageContent({
        title: 'Library',
      })

      const heading = wrapper.get('h1')
      expect(heading.text()).toBe('Library')
      expect(wrapper.find('.back-router-stub').exists()).toBe(false)
      expect(wrapper.find('.router-link-stub').exists()).toBe(false)
    })

    it('does not render any header branch when title is missing', () => {
      const wrapper = mountPageContent({
        hintLink: '/somewhere',
        hintString: 'Hint',
      })

      expect(wrapper.find('.back-router-stub').exists()).toBe(false)
      expect(wrapper.find('.router-link-stub').exists()).toBe(false)
      expect(wrapper.find('h1').exists()).toBe(false)
      expect(wrapper.find('.content').exists()).toBe(true)
    })

    it('applies no-padding and noPadding classes when headerHasContentBelow is true', () => {
      const wrapper = mountPageContent({
        title: 'Albums',
        backrouterLink: { name: 'library' },
        headerHasContentBelow: true,
      })

      const backRouter = wrapper.get('.back-router-stub')
      expect(backRouter.classes()).toContain('no-padding')
      expect(backRouter.classes()).toContain('noPadding')
    })

    it('hides hint badge when hintString is not provided', () => {
      const wrapper = mountPageContent({
        title: 'Now Playing',
        hintLink: '/now-playing-minimal',
      })

      expect(wrapper.find('.minimal-hint').exists()).toBe(false)
      expect(wrapper.find('.minimalHint').exists()).toBe(false)
    })
  })

  describe('regression', () => {
    it('prioritizes backrouterLink branch over hintLink branch', () => {
      const wrapper = mountPageContent({
        title: 'Albums',
        backrouterLink: { name: 'library' },
        hintLink: '/hint-target',
        hintString: 'Use hint',
      })

      expect(wrapper.find('.back-router-stub').exists()).toBe(true)
      expect(wrapper.find('.router-link-stub').exists()).toBe(false)
      expect(wrapper.find('.minimal-hint').exists()).toBe(false)
    })

    it('switches header branch correctly on prop updates', async () => {
      const wrapper = mountPageContent({
        title: 'Initial',
      })

      expect(wrapper.find('h1').exists()).toBe(true)
      expect(wrapper.find('.router-link-stub').exists()).toBe(false)

      await wrapper.setProps({
        hintLink: '/minimal',
        hintString: 'Switch',
      })

      expect(wrapper.find('h1').exists()).toBe(true)
      expect(wrapper.find('.router-link-stub').exists()).toBe(true)
      expect(wrapper.find('.minimal-hint').exists()).toBe(true)

      await wrapper.setProps({
        backrouterLink: { name: 'library' },
      })

      expect(wrapper.find('.back-router-stub').exists()).toBe(true)
      expect(wrapper.find('.router-link-stub').exists()).toBe(false)
    })

    it('keeps slot content stable across header mode changes', async () => {
      const wrapper = mountPageContent({
        title: 'Title A',
      }, '<p class="page-slot">Persistent body</p>')

      expect(wrapper.get('.page-slot').text()).toBe('Persistent body')

      await wrapper.setProps({ hintLink: '/minimal', hintString: 'Switch' })
      await wrapper.setProps({ backrouterLink: { name: 'library' } })

      expect(wrapper.get('.page-slot').text()).toBe('Persistent body')
    })
  })
})
