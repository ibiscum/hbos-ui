import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import PosterSkeleton from '@/components/skeletons/PosterSkeleton.vue'

describe('PosterSkeleton.vue', () => {
  describe('unit', () => {
    it('renders 8 skeleton cards', () => {
      const wrapper = mount(PosterSkeleton)

      expect(wrapper.findAll('.poster-skeleton')).toHaveLength(8)
    })

    it('renders 3 AppSkeleton elements per card by default', () => {
      const wrapper = mount(PosterSkeleton)

      expect(wrapper.findAllComponents({ name: 'AppSkeleton' })).toHaveLength(24)
      expect(wrapper.findAll('.poster-skeleton__row')).toHaveLength(16)
    })

    it('renders note line placeholders when isNote is true', () => {
      const wrapper = mount(PosterSkeleton, {
        props: {
          isNote: true,
        },
      })

      expect(wrapper.findAllComponents({ name: 'AppSkeleton' })).toHaveLength(32)
      expect(wrapper.findAll('.poster-skeleton__row')).toHaveLength(16)
    })

    it('forwards square shape to image placeholders by default', () => {
      const wrapper = mount(PosterSkeleton)

      const imageShapes = wrapper
        .findAll('.poster-skeleton__img')
        .map((img) => img.findComponent({ name: 'AppSkeleton' }).props('shape'))

      expect(imageShapes).toHaveLength(8)
      expect(imageShapes.every((shape) => shape === 'square')).toBe(true)
    })

    it('forwards circle shape to image placeholders when posterForm is circle', () => {
      const wrapper = mount(PosterSkeleton, {
        props: {
          posterForm: 'circle',
        },
      })

      const imageShapes = wrapper
        .findAll('.poster-skeleton__img')
        .map((img) => img.findComponent({ name: 'AppSkeleton' }).props('shape'))

      expect(imageShapes).toHaveLength(8)
      expect(imageShapes.every((shape) => shape === 'circle')).toBe(true)
    })
  })

  describe('regression', () => {
    it('falls back to square when runtime posterForm is invalid', () => {
      const wrapper = mount(PosterSkeleton, {
        props: {
          posterForm: 'triangle' as unknown as 'square' | 'circle',
        },
      })

      const imageShapes = wrapper
        .findAll('.poster-skeleton__img')
        .map((img) => img.findComponent({ name: 'AppSkeleton' }).props('shape'))

      expect(imageShapes.every((shape) => shape === 'square')).toBe(true)
    })

    it('updates image placeholder shape when posterForm changes', async () => {
      const wrapper = mount(PosterSkeleton, {
        props: {
          posterForm: 'square',
        },
      })

      await wrapper.setProps({ posterForm: 'circle' })

      const imageShapes = wrapper
        .findAll('.poster-skeleton__img')
        .map((img) => img.findComponent({ name: 'AppSkeleton' }).props('shape'))

      expect(imageShapes.every((shape) => shape === 'circle')).toBe(true)
    })

    it('toggles note placeholders when isNote changes', async () => {
      const wrapper = mount(PosterSkeleton)

      expect(wrapper.findAllComponents({ name: 'AppSkeleton' })).toHaveLength(24)

      await wrapper.setProps({ isNote: true })
      expect(wrapper.findAllComponents({ name: 'AppSkeleton' })).toHaveLength(32)

      await wrapper.setProps({ isNote: false })
      expect(wrapper.findAllComponents({ name: 'AppSkeleton' })).toHaveLength(24)
    })
  })
})
