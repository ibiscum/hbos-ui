import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ToggleSwitch from '@/components/ToggleSwitch.vue'

describe('ToggleSwitch', () => {
  it('renders a checkbox reflecting modelValue', () => {
    const wrapper = mount(ToggleSwitch, {
      props: {
        modelValue: true,
      },
    })

    const input = wrapper.find('input[type="checkbox"]')

    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.classes()).toContain('toggle-switch')
  })

  it('emits update:modelValue when toggled', async () => {
    const wrapper = mount(ToggleSwitch, {
      props: {
        modelValue: false,
      },
    })

    const input = wrapper.find('input')

    await input.setValue(true)

    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
  })

  it('applies disabled state and does not emit updates while disabled', async () => {
    const wrapper = mount(ToggleSwitch, {
      props: {
        modelValue: false,
        disabled: true,
      },
    })

    const input = wrapper.find('input')

    expect(input.attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('disabled')

    ;(input.element as HTMLInputElement).checked = true
    await input.trigger('change')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('treats loading state as non-interactive (regression)', async () => {
    const wrapper = mount(ToggleSwitch, {
      props: {
        modelValue: false,
        loading: true,
      },
    })

    const input = wrapper.find('input')
    const slider = wrapper.find('.toggle-slider')

    expect(slider.classes()).toContain('loading')
    expect(input.attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('disabled')

    ;(input.element as HTMLInputElement).checked = true
    await input.trigger('change')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('forwards functional attrs to input and keeps class/style on wrapper (regression)', () => {
    const wrapper = mount(ToggleSwitch, {
      props: {
        modelValue: false,
      },
      attrs: {
        'aria-label': 'Toggle dark mode',
        'aria-describedby': 'dark-mode-description',
        'data-test': 'dark-mode-toggle',
        class: 'external-class',
        style: 'margin-left: 4px;',
      },
    })

    const input = wrapper.find('input')

    expect(input.attributes('aria-label')).toBe('Toggle dark mode')
    expect(input.attributes('aria-describedby')).toBe('dark-mode-description')
    expect(input.attributes('data-test')).toBe('dark-mode-toggle')

    expect(wrapper.classes()).toContain('external-class')
    expect(wrapper.attributes('style')).toContain('margin-left: 4px;')
    expect(wrapper.attributes('aria-label')).toBeUndefined()
  })
})
