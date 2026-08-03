import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    template: '<i class="icon-stub" />',
    props: ['icon'],
  },
}))

import ConfirmationDialog from '@/components/ConfirmationDialog.vue'

const baseProps = {
  isOpen: true,
  title: 'Confirm Action',
  message: 'Line one\nLine two',
}

describe('ConfirmationDialog', () => {
  it('renders when isOpen is true', () => {
    const wrapper = mount(ConfirmationDialog, {
      props: baseProps,
    })

    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    expect(wrapper.text()).toContain('Confirm Action')
  })

  it('does not render when isOpen is false', () => {
    const wrapper = mount(ConfirmationDialog, {
      props: {
        ...baseProps,
        isOpen: false,
      },
    })

    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
  })

  it('uses default button labels', () => {
    const wrapper = mount(ConfirmationDialog, {
      props: baseProps,
    })

    expect(wrapper.find('.cancel-button').text()).toBe('Cancel')
    expect(wrapper.find('.confirm-button').text()).toBe('Confirm')
  })

  it('emits close when clicking close button', async () => {
    const wrapper = mount(ConfirmationDialog, {
      props: baseProps,
    })

    await wrapper.find('.close-button').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits close when clicking cancel button', async () => {
    const wrapper = mount(ConfirmationDialog, {
      props: baseProps,
    })

    await wrapper.find('.cancel-button').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits close when clicking overlay', async () => {
    const wrapper = mount(ConfirmationDialog, {
      props: baseProps,
    })

    await wrapper.find('.modal-overlay').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('does not emit close when clicking modal content', async () => {
    const wrapper = mount(ConfirmationDialog, {
      props: baseProps,
    })

    await wrapper.find('.modal-content').trigger('click')

    expect(wrapper.emitted('close')).toBeFalsy()
  })

  it('emits confirm when clicking confirm button', async () => {
    const wrapper = mount(ConfirmationDialog, {
      props: baseProps,
    })

    await wrapper.find('.confirm-button').trigger('click')

    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('requires exact text before confirming when text confirmation is enabled', async () => {
    const wrapper = mount(ConfirmationDialog, {
      props: {
        ...baseProps,
        requiresTextConfirmation: true,
        confirmationText: 'DELETE',
      },
    })

    const input = wrapper.find('.confirmation-input')
    await input.setValue('delete')
    await wrapper.find('.confirm-button').trigger('click')

    expect(wrapper.emitted('confirm')).toBeFalsy()

    await input.setValue('DELETE')
    await wrapper.find('.confirm-button').trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('resets text input after successful confirm', async () => {
    const wrapper = mount(ConfirmationDialog, {
      props: {
        ...baseProps,
        requiresTextConfirmation: true,
        confirmationText: 'RESET',
      },
    })

    const input = wrapper.find('.confirmation-input')
    await input.setValue('RESET')
    await wrapper.find('.confirm-button').trigger('click')
    await nextTick()

    expect((wrapper.find('.confirmation-input').element as HTMLInputElement).value).toBe('')
  })

  it('resets text input when dialog closes via prop update', async () => {
    const wrapper = mount(ConfirmationDialog, {
      props: {
        ...baseProps,
        requiresTextConfirmation: true,
      },
    })

    const input = wrapper.find('.confirmation-input')
    await input.setValue('CONFIRM')

    await wrapper.setProps({ isOpen: false })
    await nextTick()

    expect(wrapper.find('.confirmation-input').exists()).toBe(false)

    await wrapper.setProps({ isOpen: true })
    await nextTick()

    expect((wrapper.find('.confirmation-input').element as HTMLInputElement).value).toBe('')
  })

  it('disables confirm button when text confirmation does not match', async () => {
    const wrapper = mount(ConfirmationDialog, {
      props: {
        ...baseProps,
        requiresTextConfirmation: true,
        confirmationText: 'CONFIRM',
      },
    })

    const input = wrapper.find('.confirmation-input')
    const confirmButton = wrapper.find('.confirm-button')

    await input.setValue('WRONG')
    expect(confirmButton.attributes('disabled')).toBeDefined()

    await input.setValue('CONFIRM')
    expect(confirmButton.attributes('disabled')).toBeUndefined()
  })

  it('applies critical warning style to critical lines', () => {
    const wrapper = mount(ConfirmationDialog, {
      props: {
        ...baseProps,
        message: 'Safe line\nCRITICAL WARNINGS: irreversible',
      },
    })

    const lines = wrapper.findAll('.message-line')
    expect(lines).toHaveLength(2)
    expect(lines[1].classes()).toContain('critical-warning')
  })

  it('renders message as text instead of HTML markup', () => {
    const wrapper = mount(ConfirmationDialog, {
      props: {
        ...baseProps,
        message: '<strong>Do not parse as HTML</strong>',
      },
    })

    expect(wrapper.find('.message-line').html()).not.toContain('<strong>')
    expect(wrapper.text()).toContain('<strong>Do not parse as HTML</strong>')
  })

  it('does not emit confirm on Enter key when disabled (regression)', async () => {
    const wrapper = mount(ConfirmationDialog, {
      props: {
        ...baseProps,
        requiresTextConfirmation: true,
        confirmationText: 'CONFIRM',
        disabled: true,
      },
    })

    const input = wrapper.find('.confirmation-input')
    await input.setValue('CONFIRM')
    await input.trigger('keyup.enter')

    expect(wrapper.emitted('confirm')).toBeFalsy()
  })

  it('hides cancel button when hideCancelButton is true', () => {
    const wrapper = mount(ConfirmationDialog, {
      props: {
        ...baseProps,
        hideCancelButton: true,
      },
    })

    expect(wrapper.find('.cancel-button').exists()).toBe(false)
  })
})
