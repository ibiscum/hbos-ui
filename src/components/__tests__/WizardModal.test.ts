import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'

import WizardModal from '@/components/WizardModal.vue'

const IconStub = defineComponent({
  props: {
    icon: {
      type: String,
      default: '',
    },
  },
  template: '<i data-test="icon" :data-icon="icon" />',
})

interface MountOptions {
  isOpen?: boolean
  title?: string
  currentStep?: number
  totalSteps?: number
  canProceedNext?: boolean
  nextLabel?: string
  finalLabel?: string
  finalIcon?: string
  savingFinal?: boolean
}

function mountModal(options: MountOptions = {}) {
  return mount(WizardModal, {
    props: {
      isOpen: true,
      title: 'Test Wizard',
      currentStep: 1,
      totalSteps: 3,
      canProceedNext: true,
      ...options,
    },
    slots: {
      default: '<div data-test="body-content">Wizard content</div>',
    },
    global: {
      stubs: {
        Icon: IconStub,
      },
    },
  })
}

describe('WizardModal.vue', () => {
  it('does not render when closed', () => {
    const wrapper = mountModal({ isOpen: false })

    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
  })

  it('renders title, slot content, and step indicator when open', () => {
    const wrapper = mountModal({ title: 'Room Wizard', currentStep: 2, totalSteps: 5 })

    expect(wrapper.get('.modal-header h2').text()).toBe('Room Wizard')
    expect(wrapper.get('[data-test="body-content"]').text()).toBe('Wizard content')
    expect(wrapper.get('.step-indicator').text()).toBe('Step 2 of 5')
  })

  it('emits close when clicking the overlay or close button, but not modal content', async () => {
    const wrapper = mountModal()

    await wrapper.get('.modal-content').trigger('click')
    expect(wrapper.emitted('close')).toBeUndefined()

    await wrapper.get('.modal-overlay').trigger('click')
    await wrapper.get('.close-button').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(2)
  })

  it('shows previous and next actions before the final step and emits events', async () => {
    const wrapper = mountModal({ currentStep: 2, totalSteps: 4 })

    expect(wrapper.find('.step-navigation .secondary').exists()).toBe(true)
    expect(wrapper.find('.step-navigation .primary').text()).toContain('Next')
    expect(wrapper.get('.step-navigation .secondary [data-test="icon"]').attributes('data-icon')).toBe('tabler/chevron-left')
    expect(wrapper.get('.step-navigation .primary [data-test="icon"]').attributes('data-icon')).toBe('tabler/chevron-right')

    await wrapper.get('.step-navigation .secondary').trigger('click')
    await wrapper.get('.step-navigation .primary').trigger('click')

    expect(wrapper.emitted('previous')).toHaveLength(1)
    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('disables next button when canProceedNext is false', async () => {
    const wrapper = mountModal({ currentStep: 2, totalSteps: 4, canProceedNext: false })

    const nextButton = wrapper.get('.step-navigation .primary')
    expect(nextButton.attributes('disabled')).toBeDefined()

    await nextButton.trigger('click')
    expect(wrapper.emitted('next')).toBeUndefined()
  })

  it('shows final action on last step with default and custom labels/icons', async () => {
    const defaultWrapper = mountModal({ currentStep: 3, totalSteps: 3 })
    const defaultFinish = defaultWrapper.get('.step-navigation .primary')

    expect(defaultFinish.text()).toContain('Save')
    expect(defaultWrapper.get('.step-navigation .primary [data-test="icon"]').attributes('data-icon')).toBe('checkmark')

    await defaultFinish.trigger('click')
    expect(defaultWrapper.emitted('finish')).toHaveLength(1)

    const customWrapper = mountModal({
      currentStep: 3,
      totalSteps: 3,
      finalLabel: 'Apply',
      finalIcon: 'save',
    })
    expect(customWrapper.get('.step-navigation .primary').text()).toContain('Apply')
    expect(customWrapper.get('.step-navigation .primary [data-test="icon"]').attributes('data-icon')).toBe('save')
  })

  it('shows loading icon and disables finish while savingFinal is true', async () => {
    const wrapper = mountModal({ currentStep: 3, totalSteps: 3, savingFinal: true })

    const finishButton = wrapper.get('.step-navigation .primary')
    expect(finishButton.attributes('disabled')).toBeDefined()
    expect(wrapper.get('.step-navigation .primary [data-test="icon"]').attributes('data-icon')).toBe('tabler/loader')

    await finishButton.trigger('click')
    expect(wrapper.emitted('finish')).toBeUndefined()
  })

  it('uses button type button for all actions to prevent accidental form submits', () => {
    const wrapperStep2 = mountModal({ currentStep: 2, totalSteps: 3 })

    expect(wrapperStep2.get('.close-button').attributes('type')).toBe('button')
    expect(wrapperStep2.get('.step-navigation .secondary').attributes('type')).toBe('button')
    expect(wrapperStep2.get('.step-navigation .primary').attributes('type')).toBe('button')

    const wrapperFinalStep = mountModal({ currentStep: 3, totalSteps: 3 })
    expect(wrapperFinalStep.get('.step-navigation .primary').attributes('type')).toBe('button')
  })

  it('applies custom next label before final step', () => {
    const wrapper = mountModal({ currentStep: 1, totalSteps: 3, nextLabel: 'Continue' })

    expect(wrapper.get('.step-navigation .primary').text()).toContain('Continue')
  })
})
