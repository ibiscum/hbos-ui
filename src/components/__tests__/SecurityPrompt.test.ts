import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import SecurityPrompt from '@/components/SecurityPrompt.vue'
import { AuthApiError } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    template: '<i class="icon-stub" :data-icon="icon" />',
    props: ['icon'],
  },
}))

vi.mock('@/stores/auth', async () => {
  const { reactive } = await import('vue')

  const store = reactive({
    promptOpen: false,
    promptHint: 'login' as 'set-password' | 'login' | null,
    promptError: null as string | null,
    login: vi.fn(),
    setPassword: vi.fn(),
    setPolicy: vi.fn(),
    resolvePrompt: vi.fn(),
  })

  return {
    useAuthStore: () => store,
  }
})

type AuthStoreMock = ReturnType<typeof useAuthStore> & {
  login: ReturnType<typeof vi.fn>
  setPassword: ReturnType<typeof vi.fn>
  setPolicy: ReturnType<typeof vi.fn>
  resolvePrompt: ReturnType<typeof vi.fn>
}

function getAuthStoreMock(): AuthStoreMock {
  return useAuthStore() as AuthStoreMock
}

function mountComponent() {
  return mount(SecurityPrompt)
}

describe('SecurityPrompt.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const authStore = getAuthStoreMock()
    authStore.promptOpen = false
    authStore.promptHint = 'login'
    authStore.promptError = null

    authStore.login.mockResolvedValue(undefined)
    authStore.setPassword.mockResolvedValue(undefined)
    authStore.setPolicy.mockResolvedValue(undefined)
  })

  it('renders only when prompt is open', async () => {
    const authStore = getAuthStoreMock()
    const wrapper = mountComponent()

    expect(wrapper.find('.modal-overlay').exists()).toBe(false)

    authStore.promptOpen = true
    await nextTick()

    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    expect(wrapper.find('h2').text()).toContain('Enter your password')
  })

  it('shows set-password mode copy and controls', async () => {
    const authStore = getAuthStoreMock()
    authStore.promptOpen = true
    authStore.promptHint = 'set-password'

    const wrapper = mountComponent()
    await nextTick()

    expect(wrapper.find('h2').text()).toContain('Protect your settings')
    expect(wrapper.find('.not-now-button').exists()).toBe(true)
    expect(wrapper.find('.cancel-button').exists()).toBe(false)
    expect(wrapper.find('.confirm-button').text()).toContain('Set a password')
    expect(wrapper.find('.security-label').text()).toBe('New password')
    expect(wrapper.find('.security-input').attributes('autocomplete')).toBe('new-password')
  })

  it('shows login mode input metadata', async () => {
    const authStore = getAuthStoreMock()
    authStore.promptOpen = true
    authStore.promptHint = 'login'

    const wrapper = mountComponent()
    await nextTick()

    expect(wrapper.find('.security-label').text()).toBe('Password')
    expect(wrapper.find('.security-input').attributes('autocomplete')).toBe('current-password')
    expect(wrapper.find('.confirm-button').text()).toContain('Unlock')
  })

  it('submits login with password and remember option', async () => {
    const authStore = getAuthStoreMock()
    authStore.promptOpen = true

    const wrapper = mountComponent()
    await nextTick()

    await wrapper.find('.security-input').setValue('secret')
    await wrapper.find('.security-remember input').setValue(true)
    await wrapper.find('.confirm-button').trigger('click')
    await flushPromises()

    expect(authStore.login).toHaveBeenCalledWith('secret', true)
    expect(authStore.resolvePrompt).toHaveBeenCalledWith(true)
  })

  it('submits set-password flow via setPassword action', async () => {
    const authStore = getAuthStoreMock()
    authStore.promptOpen = true
    authStore.promptHint = 'set-password'

    const wrapper = mountComponent()
    await nextTick()

    await wrapper.find('.security-input').setValue('new-secret')
    await wrapper.find('.confirm-button').trigger('click')
    await flushPromises()

    expect(authStore.setPassword).toHaveBeenCalledWith('new-secret', undefined, false)
    expect(authStore.resolvePrompt).toHaveBeenCalledWith(true)
  })

  it('maps 401 AuthApiError to wrong-password message', async () => {
    const authStore = getAuthStoreMock()
    authStore.promptOpen = true
    authStore.login.mockRejectedValueOnce(new AuthApiError(401, 'Unauthorized'))

    const wrapper = mountComponent()
    await nextTick()

    await wrapper.find('.security-input').setValue('wrong')
    await wrapper.find('.confirm-button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Wrong password. Please try again.')
    expect(authStore.resolvePrompt).not.toHaveBeenCalled()
  })

  it('maps 429 AuthApiError to rate-limit message', async () => {
    const authStore = getAuthStoreMock()
    authStore.promptOpen = true
    authStore.login.mockRejectedValueOnce(new AuthApiError(429, 'Slow down'))

    const wrapper = mountComponent()
    await nextTick()

    await wrapper.find('.security-input').setValue('try-again')
    await wrapper.find('.confirm-button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Too many attempts. Please wait a moment and try again.')
    expect(authStore.resolvePrompt).not.toHaveBeenCalled()
  })

  it('cancels via cancel button and overlay in login mode', async () => {
    const authStore = getAuthStoreMock()
    authStore.promptOpen = true

    const wrapper = mountComponent()
    await nextTick()

    await wrapper.find('.cancel-button').trigger('click')
    expect(authStore.resolvePrompt).toHaveBeenCalledWith(false)

    authStore.resolvePrompt.mockClear()
    await wrapper.find('.modal-overlay').trigger('click')
    expect(authStore.resolvePrompt).toHaveBeenCalledWith(false)
  })

  it('handles not-now action by disabling protection and resolving success', async () => {
    const authStore = getAuthStoreMock()
    authStore.promptOpen = true
    authStore.promptHint = 'set-password'

    const wrapper = mountComponent()
    await nextTick()

    await wrapper.find('.not-now-button').trigger('click')
    await flushPromises()

    expect(authStore.setPolicy).toHaveBeenCalledWith('off')
    expect(authStore.resolvePrompt).toHaveBeenCalledWith(true)
  })

  it('regression: busy state blocks cancellation and disables close button', async () => {
    const authStore = getAuthStoreMock()
    authStore.promptOpen = true

    let resolveLogin: (() => void) | undefined
    authStore.login.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveLogin = resolve
        }),
    )

    const wrapper = mountComponent()
    await nextTick()

    await wrapper.find('.security-input').setValue('secret')
    await wrapper.find('.confirm-button').trigger('click')
    await nextTick()

    expect(wrapper.find('.close-button').attributes('disabled')).toBeDefined()

    await wrapper.find('.cancel-button').trigger('click')
    await wrapper.find('.modal-overlay').trigger('click')
    expect(authStore.resolvePrompt).not.toHaveBeenCalledWith(false)

    if (resolveLogin) {
      resolveLogin()
    }
    await flushPromises()
  })

  it('regression: re-opening resets password, remember and previous error', async () => {
    const authStore = getAuthStoreMock()
    authStore.promptOpen = true
    authStore.login.mockRejectedValueOnce(new AuthApiError(401, 'Unauthorized'))

    const wrapper = mountComponent()
    await nextTick()

    const input = wrapper.find('.security-input')
    const rememberBox = wrapper.find('.security-remember input')

    await input.setValue('wrong')
    await rememberBox.setValue(true)
    await wrapper.find('.confirm-button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Wrong password. Please try again.')
    expect((input.element as HTMLInputElement).value).toBe('wrong')
    expect((rememberBox.element as HTMLInputElement).checked).toBe(true)

    authStore.promptOpen = false
    await nextTick()

    authStore.promptOpen = true
    await flushPromises()

    expect((wrapper.find('.security-input').element as HTMLInputElement).value).toBe('')
    expect((wrapper.find('.security-remember input').element as HTMLInputElement).checked).toBe(false)
    expect(wrapper.find('.security-error').exists()).toBe(false)
  })
})
