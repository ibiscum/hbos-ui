import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/http')
vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({
    getConfigApiBaseUrl: () => 'http://api.test',
  }),
}))

import { apiFetch } from '@/api/http'
import BluetoothSettingsModal from '@/components/BluetoothSettings/BluetoothSettingsModal.vue'

const mockFetch = vi.mocked(apiFetch)

function mountModal(open = true) {
  return mount(BluetoothSettingsModal, {
    props: { open },
    global: {
      stubs: {
        Teleport: true,
        ContentBox: {
          template: '<div class="content-box-stub"><slot /></div>',
        },
      },
    },
  })
}

describe('BluetoothSettingsModal.vue consolidated unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders only when open is true', () => {
    const closedWrapper = mountModal(false)
    const openWrapper = mountModal(true)

    expect(closedWrapper.find('.modal').exists()).toBe(false)
    expect(openWrapper.find('.modal').exists()).toBe(true)
    expect(openWrapper.text()).toContain('Enter Passkey')
  })

  it('sanitizes passkey to numeric characters and max length 6', async () => {
    const wrapper = mountModal(true)
    const input = wrapper.get('input')

    await input.setValue('12ab34c789')

    expect((input.element as HTMLInputElement).value).toBe('123478')
    expect(wrapper.get('button:last-of-type').attributes('disabled')).toBeUndefined()
  })

  it('keeps Enter button disabled until passkey is exactly 6 digits', async () => {
    const wrapper = mountModal(true)
    const input = wrapper.get('input')
    const enterButton = wrapper.get('button:last-of-type')

    await input.setValue('12345')
    expect(enterButton.attributes('disabled')).toBeDefined()

    await input.setValue('123456')
    expect(enterButton.attributes('disabled')).toBeUndefined()
  })

  it('emits update:open false and clears passkey when close is clicked', async () => {
    const wrapper = mountModal(true)
    const input = wrapper.get('input')

    await input.setValue('987654')
    await wrapper.get('button:first-of-type').trigger('click')

    expect(wrapper.emitted('update:open')).toEqual([[false]])
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it('sends passkey to backend and closes on successful response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response)

    const wrapper = mountModal(true)
    const input = wrapper.get('input')

    await input.setValue('123456')
    await wrapper.get('button:last-of-type').trigger('click')
    await flushPromises()

    expect(mockFetch).toHaveBeenCalledWith('http://api.test/bluetooth/passkey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passkey: '123456' }),
    })
    expect(wrapper.emitted('update:open')).toEqual([[false]])
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it('does not call backend when passkey is invalid length', async () => {
    const wrapper = mountModal(true)
    const enterButton = wrapper.get('button:last-of-type')

    await wrapper.get('input').setValue('12345')
    expect(enterButton.attributes('disabled')).toBeDefined()

    // Simulate a forced click path (e.g. scripted interaction) to hit the guard.
    ;(enterButton.element as HTMLButtonElement).disabled = false
    await enterButton.trigger('click')

    expect(mockFetch).not.toHaveBeenCalled()
    expect(wrapper.emitted('update:open')).toBeUndefined()
  })

  it('does not close modal on non-ok backend response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 } as Response)

    const wrapper = mountModal(true)
    await wrapper.get('input').setValue('123456')
    await wrapper.get('button:last-of-type').trigger('click')
    await flushPromises()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('update:open')).toBeUndefined()
  })

  it('does not close modal when request throws', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const wrapper = mountModal(true)
    await wrapper.get('input').setValue('123456')
    await wrapper.get('button:last-of-type').trigger('click')
    await flushPromises()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('update:open')).toBeUndefined()
  })
})
