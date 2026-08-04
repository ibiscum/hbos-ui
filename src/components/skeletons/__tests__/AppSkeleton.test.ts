import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import AppSkeleton from '@/components/skeletons/AppSkeleton.vue'

describe('AppSkeleton.vue', () => {
  describe('unit', () => {
    it('renders the base skeleton class', () => {
      const wrapper = mount(AppSkeleton)

      expect(wrapper.classes()).toContain('skeleton')
    })

    it('uses square shape by default', () => {
      const wrapper = mount(AppSkeleton)

      expect(wrapper.classes()).not.toContain('skeleton--circle')
    })

    it('applies the circle modifier when shape is circle', () => {
      const wrapper = mount(AppSkeleton, {
        props: {
          shape: 'circle',
        },
      })

      expect(wrapper.classes()).toContain('skeleton--circle')
    })

    it('applies default width and height props', () => {
      const wrapper = mount(AppSkeleton)

      expect(wrapper.props('width')).toBe('100%')
      expect(wrapper.props('height')).toBe('1em')
    })

    it('accepts custom width and height props', () => {
      const wrapper = mount(AppSkeleton, {
        props: {
          width: '40%',
          height: '24px',
        },
      })

      expect(wrapper.props('width')).toBe('40%')
      expect(wrapper.props('height')).toBe('24px')
    })

    it('merges inherited classes on the root element', () => {
      const wrapper = mount(AppSkeleton, {
        attrs: {
          class: 'custom-skeleton-class',
        },
      })

      expect(wrapper.classes()).toContain('skeleton')
      expect(wrapper.classes()).toContain('custom-skeleton-class')
    })
  })

  describe('regression', () => {
    it('renders no filler text content', () => {
      const wrapper = mount(AppSkeleton)

      expect(wrapper.text()).toBe('')
    })

    it('is marked as presentational for accessibility', () => {
      const wrapper = mount(AppSkeleton)

      expect(wrapper.attributes('aria-hidden')).toBe('true')
      expect(wrapper.attributes('role')).toBe('presentation')
    })
  })
})
