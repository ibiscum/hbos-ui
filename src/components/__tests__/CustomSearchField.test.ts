import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import CustomSearchField from '@/components/CustomSearchField.vue'

const mountSearchField = (props: Record<string, unknown> = {}) =>
  mount(CustomSearchField, {
    props,
    global: {
      stubs: {
        ContentBox: {
          name: 'ContentBox',
          template: '<div class="content-box-stub"><slot /></div>',
        },
        Icon: {
          name: 'Icon',
          props: ['icon'],
          template: '<span class="icon-stub" :data-icon="icon" />',
        },
      },
    },
  })

describe('CustomSearchField.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllTimers()
  })

  describe('unit', () => {
    it('renders input with default props', () => {
      const wrapper = mountSearchField()

      const input = wrapper.get('input')
      expect(input.attributes('type')).toBe('text')
      expect(input.attributes('placeholder')).toBe('Search')
      expect(input.attributes('required')).toBeUndefined()
    })

    it('applies provided native input props', () => {
      const wrapper = mountSearchField({
        type: 'search',
        placeholder: 'Search albums...',
        required: true,
      })

      const input = wrapper.get('input')
      expect(input.attributes('type')).toBe('search')
      expect(input.attributes('placeholder')).toBe('Search albums...')
      expect(input.attributes('required')).toBeDefined()
    })

    it('shows search icon when model value is empty', () => {
      const wrapper = mountSearchField({
        modelValue: '',
      })

      expect(wrapper.find('[data-icon="magnifying-glass-light"]').exists()).toBe(true)
      expect(wrapper.find('.clear-button').exists()).toBe(false)
    })

    it('shows clear button when model value is not empty', () => {
      const wrapper = mountSearchField({
        modelValue: 'miles',
      })

      expect(wrapper.find('[data-icon="magnifying-glass-light"]').exists()).toBe(false)
      const clearButton = wrapper.get('.clear-button')
      expect(clearButton.attributes('type')).toBe('button')
      expect(wrapper.find('[data-icon="clear"]').exists()).toBe(true)
    })

    it('emits update:modelValue and change immediately when debounce is zero', async () => {
      const wrapper = mountSearchField({
        debounce: 0,
      })

      await wrapper.get('input').setValue('abba')

      expect(wrapper.emitted('update:modelValue')).toEqual([['abba']])
      expect(wrapper.emitted('change')).toEqual([['abba']])
    })

    it('emits clear events with empty string when clear button is clicked', async () => {
      const wrapper = mountSearchField({
        modelValue: 'queen',
      })

      await wrapper.get('.clear-button').trigger('click')

      expect(wrapper.emitted('update:modelValue')).toEqual([['']])
      expect(wrapper.emitted('change')).toEqual([['']])
    })
  })

  describe('regression', () => {
    it('does not trim user input before emitting', async () => {
      const wrapper = mountSearchField({
        debounce: 0,
      })

      await wrapper.get('input').setValue('  spaced query  ')

      expect(wrapper.emitted('update:modelValue')).toEqual([['  spaced query  ']])
      expect(wrapper.emitted('change')).toEqual([['  spaced query  ']])
    })

    it('debounces emissions and emits only latest value', async () => {
      const wrapper = mountSearchField({
        debounce: 50,
      })

      await wrapper.get('input').setValue('a')
      await wrapper.get('input').setValue('ab')

      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
      expect(wrapper.emitted('change')).toBeUndefined()

      vi.advanceTimersByTime(49)
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()

      vi.advanceTimersByTime(1)
      expect(wrapper.emitted('update:modelValue')).toEqual([['ab']])
      expect(wrapper.emitted('change')).toEqual([['ab']])
    })

    it('uses updated debounce delay after prop changes', async () => {
      const wrapper = mountSearchField({
        debounce: 200,
      })

      await wrapper.setProps({ debounce: 10 })
      await wrapper.get('input').setValue('new delay')

      vi.advanceTimersByTime(9)
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()

      vi.advanceTimersByTime(1)
      expect(wrapper.emitted('update:modelValue')).toEqual([['new delay']])
      expect(wrapper.emitted('change')).toEqual([['new delay']])
    })
  })
})
