import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import type { BackendCapabilities } from '@/stores/filter-connector'
import BackendInfoModal from '@/components/speaker-eq/BackendInfoModal.vue'

function buildCapabilities(overrides: Partial<BackendCapabilities> = {}): BackendCapabilities {
  return {
    availableFilterBanks: [],
    backendName: 'DSP Toolkit',
    backendDescription: '<p>Backend description with <a href="https://example.com">link</a>.</p>',
    backendShortDescription: 'Short description',
    ...overrides,
  }
}

function mountModal(open = true, capabilities: BackendCapabilities | null = buildCapabilities()) {
  return mount(BackendInfoModal, {
    props: {
      open,
      capabilities,
    },
    global: {
      stubs: {
        Teleport: true,
      },
    },
  })
}

describe('BackendInfoModal.vue consolidated unit and regression tests', () => {
  beforeEach(() => {
    // no-op for symmetry and future mock setup
  })

  it('renders only when open is true', () => {
    const closedWrapper = mountModal(false)
    const openWrapper = mountModal(true)

    expect(closedWrapper.find('.modal-backdrop').exists()).toBe(false)
    expect(openWrapper.find('.modal-backdrop').exists()).toBe(true)
  })

  it('renders backend title and HTML description when capabilities are present', () => {
    const wrapper = mountModal(true, buildCapabilities({ backendName: 'My Backend' }))

    expect(wrapper.get('.modal-header h2').text()).toBe('My Backend Information')
    expect(wrapper.get('.modal-body').html()).toContain('<p>Backend description with <a href="https://example.com">link</a>.</p>')
  })

  it('falls back to generic title and empty-description copy when capabilities are missing', () => {
    const wrapper = mountModal(true, null)

    expect(wrapper.get('.modal-header h2').text()).toBe('Backend Information')
    expect(wrapper.get('.empty-description').text()).toBe('No backend description available.')
  })

  it('falls back to empty-description copy when backendDescription is empty', () => {
    const wrapper = mountModal(true, buildCapabilities({ backendDescription: '' }))

    expect(wrapper.find('.empty-description').exists()).toBe(true)
    expect(wrapper.get('.empty-description').text()).toBe('No backend description available.')
  })

  it('emits close when overlay is clicked', async () => {
    const wrapper = mountModal(true)

    await wrapper.get('.modal-backdrop').trigger('click')

    expect(wrapper.emitted('close')).toEqual([[]])
  })

  it('does not emit close when modal content is clicked (overlay self-only regression)', async () => {
    const wrapper = mountModal(true)

    await wrapper.get('.modal-content').trigger('click')

    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('emits close when close button is clicked', async () => {
    const wrapper = mountModal(true)

    await wrapper.get('.close-btn').trigger('click')

    expect(wrapper.emitted('close')).toEqual([[]])
  })

  it('uses button type button and accessible close label (regression contract)', () => {
    const wrapper = mountModal(true)
    const closeBtn = wrapper.get('.close-btn')

    expect(closeBtn.attributes('type')).toBe('button')
    expect(closeBtn.attributes('aria-label')).toBe('Close backend information')
  })
})
