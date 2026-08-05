import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import RoomEqLoaderModal, { type RoomEQConfigItem } from '@/components/speaker-eq/RoomEqLoaderModal.vue'

function buildConfigs(): RoomEQConfigItem[] {
  return [
    {
      key: 'room-a',
      data: {
        name: 'Room A',
        created_at: '2026-01-15T10:00:00.000Z',
        filters: [
          { filter_type: 'peaking', frequency: 1000, gain_db: 2, q: 0.8 },
          { filter_type: 'lowshelf', frequency: 80, gain_db: -1, q: 0.71 },
        ],
      },
    },
    {
      key: 'room-b',
      data: {
        name: 'Room B',
        created_at: 'not-a-date',
        filters: [{ filter_type: 'highshelf', frequency: 10000, gain_db: 1, q: 0.71 }],
      },
    },
  ]
}

function mountModal(overrides: {
  open?: boolean
  loading?: boolean
  configs?: RoomEQConfigItem[]
} = {}) {
  return mount(RoomEqLoaderModal, {
    props: {
      open: true,
      loading: false,
      configs: buildConfigs(),
      ...overrides,
    },
    global: {
      stubs: {
        Teleport: true,
      },
    },
  })
}

describe('RoomEqLoaderModal.vue consolidated unit and regression tests', () => {
  beforeEach(() => {
    // no-op: kept for consistency with sibling suites
  })

  it('renders only when open is true', () => {
    const closedWrapper = mountModal({ open: false })
    const openWrapper = mountModal({ open: true })

    expect(closedWrapper.find('.modal-backdrop').exists()).toBe(false)
    expect(openWrapper.find('.modal-backdrop').exists()).toBe(true)
  })

  it('shows loading state when loading is true', () => {
    const wrapper = mountModal({ loading: true })

    expect(wrapper.get('.loading-message').text()).toContain('Loading configurations...')
    expect(wrapper.find('.config-list').exists()).toBe(false)
  })

  it('shows empty state when no configs are available', () => {
    const wrapper = mountModal({ loading: false, configs: [] })

    expect(wrapper.get('.no-configs-message').text()).toContain('No Room EQ configurations found.')
  })

  it('renders config list with details and invalid-date fallback copy', () => {
    const wrapper = mountModal()

    const items = wrapper.findAll('.config-item')
    expect(items).toHaveLength(2)
    expect(wrapper.text()).toContain('Room A')
    expect(wrapper.text()).toContain('2 filters')
    expect(wrapper.text()).toContain('Unknown date')
  })

  it('allows selecting a config and toggles selected class by key', async () => {
    const wrapper = mountModal()
    let items = wrapper.findAll('.config-item')

    expect(items[0].classes()).not.toContain('selected')
    expect(items[1].classes()).not.toContain('selected')

    await items[1].trigger('click')
    await nextTick()
    items = wrapper.findAll('.config-item')

    expect(items[0].classes()).not.toContain('selected')
    expect(items[1].classes()).toContain('selected')
  })

  it('keeps load button disabled until selection exists and emits load with default channel mode', async () => {
    const configs = buildConfigs()
    const wrapper = mountModal({ configs })
    let loadButton = wrapper.get('.btn.primary')

    expect(loadButton.attributes('disabled')).toBeDefined()

    await wrapper.findAll('.config-item')[0].trigger('click')
    await nextTick()
    loadButton = wrapper.get('.btn.primary')

    expect(loadButton.attributes('disabled')).toBeUndefined()

    await loadButton.trigger('click')

    expect(wrapper.emitted('load')).toEqual([[configs[0], 'both']])
  })

  it('emits load with selected channel mode after user picks mode', async () => {
    const configs = buildConfigs()
    const wrapper = mountModal({ configs })

    await wrapper.findAll('.config-item')[0].trigger('click')
    await wrapper.get('input[type="radio"][value="right"]').setValue()
    await wrapper.get('.btn.primary').trigger('click')

    expect(wrapper.emitted('load')).toEqual([[configs[0], 'right']])
  })

  it('allows explicitly switching back to both channels before load', async () => {
    const configs = buildConfigs()
    const wrapper = mountModal({ configs })

    await wrapper.findAll('.config-item')[0].trigger('click')
    await wrapper.get('input[type="radio"][value="right"]').setValue()
    await wrapper.get('input[type="radio"][value="both"]').setValue()
    await wrapper.get('.btn.primary').trigger('click')

    expect(wrapper.emitted('load')).toEqual([[configs[0], 'both']])
  })

  it('does not emit load when forced click occurs without any selection', async () => {
    const wrapper = mountModal()
    const loadButton = wrapper.get('.btn.primary')

    ;(loadButton.element as HTMLButtonElement).disabled = false
    await loadButton.trigger('click')

    expect(wrapper.emitted('load')).toBeUndefined()
  })

  it('does not emit close when modal content is clicked and emits close on overlay self-click', async () => {
    const wrapper = mountModal()

    await wrapper.get('.modal-content').trigger('click')
    expect(wrapper.emitted('close')).toBeUndefined()

    await wrapper.get('.modal-backdrop').trigger('click')
    expect(wrapper.emitted('close')).toEqual([[]])
  })

  it('emits close from close and cancel buttons', async () => {
    const wrapper = mountModal()

    await wrapper.get('.close-btn').trigger('click')
    await wrapper.get('.btn.secondary').trigger('click')

    expect(wrapper.emitted('close')).toEqual([[], []])
  })

  it('resets selected config and channel mode when modal closes and reopens', async () => {
    const wrapper = mountModal()

    await wrapper.findAll('.config-item')[0].trigger('click')
    await wrapper.get('input[type="radio"][value="left"]').setValue()
    expect(wrapper.get('.btn.primary').attributes('disabled')).toBeUndefined()

    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })
    await nextTick()

    expect(wrapper.get('.btn.primary').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.channel-selection').exists()).toBe(false)
  })

  it('opens from closed state and renders loader content after prop toggle', async () => {
    const wrapper = mountModal({ open: false, loading: true })

    expect(wrapper.find('.modal-backdrop').exists()).toBe(false)

    await wrapper.setProps({ open: true })
    await nextTick()

    expect(wrapper.find('.modal-backdrop').exists()).toBe(true)
    expect(wrapper.get('.loading-message').text()).toContain('Loading configurations...')
  })

  it('clears stale selection when configs change and selected key no longer exists', async () => {
    const wrapper = mountModal({ configs: buildConfigs() })

    await wrapper.findAll('.config-item')[1].trigger('click')
    expect(wrapper.get('.btn.primary').attributes('disabled')).toBeUndefined()

    await wrapper.setProps({
      configs: [
        {
          key: 'room-c',
          data: {
            name: 'Room C',
            created_at: '2026-02-03T10:00:00.000Z',
            filters: [{ filter_type: 'peaking', frequency: 900, gain_db: 0, q: 1.0 }],
          },
        },
      ],
    })

    expect(wrapper.get('.btn.primary').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.config-item.selected').exists()).toBe(false)
  })

  it('keeps selection when configs refresh contains the same selected key', async () => {
    const wrapper = mountModal({ configs: buildConfigs() })

    await wrapper.findAll('.config-item')[0].trigger('click')
    await nextTick()
    expect(wrapper.findAll('.config-item')[0].classes()).toContain('selected')

    await wrapper.setProps({ configs: buildConfigs() })
    await nextTick()

    expect(wrapper.findAll('.config-item')[0].classes()).toContain('selected')
    expect(wrapper.get('.btn.primary').attributes('disabled')).toBeUndefined()
  })

  it('keeps load button disabled when configs update occurs without a selection', async () => {
    const wrapper = mountModal({ configs: buildConfigs() })

    expect(wrapper.get('.btn.primary').attributes('disabled')).toBeDefined()

    await wrapper.setProps({ configs: buildConfigs().slice(0, 1) })
    await nextTick()

    expect(wrapper.get('.btn.primary').attributes('disabled')).toBeDefined()
  })

  it('uses explicit button semantics and close button accessibility label', () => {
    const wrapper = mountModal()

    const closeButton = wrapper.get('.close-btn')
    expect(closeButton.attributes('type')).toBe('button')
    expect(closeButton.attributes('aria-label')).toBe('Close room EQ loader')

    expect(wrapper.get('.btn.secondary').attributes('type')).toBe('button')
    expect(wrapper.get('.btn.primary').attributes('type')).toBe('button')
  })
})
