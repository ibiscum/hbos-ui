import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ProgressTime from '@/components/ProgressTime.vue'

describe('ProgressTime.vue', () => {
  it('renders wrapper and hides time labels by default', () => {
    const wrapper = mount(ProgressTime)

    expect(wrapper.find('.app-progress-time').exists()).toBe(true)
    expect(wrapper.findAll('span')).toHaveLength(0)
  })

  it('renders seek and duration labels when a duration is available', () => {
    const wrapper = mount(ProgressTime, {
      props: {
        seekPositionTime: '01:23',
        songDurationTime: '04:56',
      },
    })

    const labels = wrapper.findAll('span')

    expect(labels).toHaveLength(2)
    expect(labels[0]?.text()).toBe('01:23')
    expect(labels[1]?.text()).toBe('04:56')
  })

  it('keeps labels hidden when duration is 00:00', () => {
    const wrapper = mount(ProgressTime, {
      props: {
        seekPositionTime: '00:42',
        songDurationTime: '00:00',
      },
    })

    expect(wrapper.findAll('span')).toHaveLength(0)
  })

  it('regression: keeps labels hidden for blank or whitespace-only duration values', async () => {
    const wrapper = mount(ProgressTime, {
      props: {
        seekPositionTime: '00:15',
        songDurationTime: '',
      },
    })

    expect(wrapper.findAll('span')).toHaveLength(0)

    await wrapper.setProps({ songDurationTime: '   ' })

    expect(wrapper.findAll('span')).toHaveLength(0)
  })

  it('uses default seek label when only duration is provided', () => {
    const wrapper = mount(ProgressTime, {
      props: {
        songDurationTime: '03:00',
      },
    })

    const labels = wrapper.findAll('span')

    expect(labels).toHaveLength(2)
    expect(labels[0]?.text()).toBe('00:00')
    expect(labels[1]?.text()).toBe('03:00')
  })
})
