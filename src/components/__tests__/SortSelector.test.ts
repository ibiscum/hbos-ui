import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import SortSelector from '@/components/SortSelector.vue'

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['icon', 'width', 'height'],
    template: '<i class="sort-icon-stub" :data-icon="icon" />',
  },
}))

describe('SortSelector.vue', () => {
  it('renders label and both sort buttons', () => {
    const wrapper = mount(SortSelector, {
      props: {
        sortBy: 'release_date',
        sortOrder: 'desc',
      },
    })

    expect(wrapper.find('.sort-label').text()).toBe('Sort by:')

    const buttons = wrapper.findAll('.sort-btn')
    expect(buttons).toHaveLength(2)
    expect(buttons[0].text()).toContain('Year')
    expect(buttons[1].text()).toContain('Artist')
  })

  it('applies active state based on selected sort mode', async () => {
    const wrapper = mount(SortSelector, {
      props: {
        sortBy: 'release_date',
        sortOrder: 'desc',
      },
    })

    const buttons = wrapper.findAll('.sort-btn')
    expect(buttons[0].classes()).toContain('active')
    expect(buttons[1].classes()).not.toContain('active')

    await wrapper.setProps({ sortBy: 'artist' })

    expect(buttons[0].classes()).not.toContain('active')
    expect(buttons[1].classes()).toContain('active')
  })

  it('shows caret icon only for release_date and follows sort order direction', async () => {
    const wrapper = mount(SortSelector, {
      props: {
        sortBy: 'release_date',
        sortOrder: 'asc',
      },
    })

    expect(wrapper.find('.sort-icon-stub').attributes('data-icon')).toBe('caret-up')

    await wrapper.setProps({ sortOrder: 'desc' })
    expect(wrapper.find('.sort-icon-stub').attributes('data-icon')).toBe('caret-down')

    await wrapper.setProps({ sortBy: 'artist' })
    expect(wrapper.find('.sort-icon-stub').exists()).toBe(false)
  })

  it('emits sort-by-change and toggle-order when clicking Year while already sorting by year (regression)', async () => {
    const wrapper = mount(SortSelector, {
      props: {
        sortBy: 'release_date',
        sortOrder: 'desc',
      },
    })

    await wrapper.findAll('.sort-btn')[0].trigger('click')

    expect(wrapper.emitted('sort-by-change')).toEqual([['release_date']])
    expect(wrapper.emitted('toggle-order')).toEqual([[]])
  })

  it('emits only sort-by-change when switching from artist to year', async () => {
    const wrapper = mount(SortSelector, {
      props: {
        sortBy: 'artist',
        sortOrder: 'desc',
      },
    })

    await wrapper.findAll('.sort-btn')[0].trigger('click')

    expect(wrapper.emitted('sort-by-change')).toEqual([['release_date']])
    expect(wrapper.emitted('toggle-order')).toBeUndefined()
  })

  it('emits only sort-by-change when switching from random to year (regression)', async () => {
    const wrapper = mount(SortSelector, {
      props: {
        sortBy: 'random',
        sortOrder: 'desc',
      },
    })

    await wrapper.findAll('.sort-btn')[0].trigger('click')

    expect(wrapper.emitted('sort-by-change')).toEqual([['release_date']])
    expect(wrapper.emitted('toggle-order')).toBeUndefined()
  })

  it('emits only sort-by-change when clicking Artist (regression)', async () => {
    const wrapper = mount(SortSelector, {
      props: {
        sortBy: 'release_date',
        sortOrder: 'desc',
      },
    })

    await wrapper.findAll('.sort-btn')[1].trigger('click')

    expect(wrapper.emitted('sort-by-change')).toEqual([['artist']])
    expect(wrapper.emitted('toggle-order')).toBeUndefined()
  })
})
