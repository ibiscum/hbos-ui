import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'

import SecurityView from '../Security.vue'
import { AuthApiError, type AuthStatus } from '@/api/auth'

type StatusRef = ReturnType<typeof ref<AuthStatus | null>>

const makeStatus = (overrides: Partial<AuthStatus> = {}): AuthStatus => ({
  protection: 'off',
  has_password: false,
  authenticated: false,
  ...overrides,
})

const mocks = vi.hoisted(() => {
  const state = {
    statusRef: null as unknown as StatusRef,
  }

  const authStore = {
    refreshStatus: vi.fn(async () => state.statusRef.value),
    promptForAuth: vi.fn(async () => true),
    setPassword: vi.fn(async () => ({ csrf: 'token' })),
    setPolicy: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
  }

  return {
    ...state,
    authStore,
  }
})

vi.mock('pinia', () => ({
  storeToRefs: (store: { status: StatusRef }) => ({ status: store.status }),
}))

vi.mock('@/stores/auth', async () => {
  const status = ref<AuthStatus | null>({
    protection: 'off',
    has_password: false,
    authenticated: false,
  })
  ;(mocks as { statusRef: StatusRef }).statusRef = status

  return {
    useAuthStore: () => ({
      status,
      refreshStatus: mocks.authStore.refreshStatus,
      promptForAuth: mocks.authStore.promptForAuth,
      setPassword: mocks.authStore.setPassword,
      setPolicy: mocks.authStore.setPolicy,
      logout: mocks.authStore.logout,
    }),
  }
})

vi.mock('@/components/PageContent.vue', () => ({
  default: {
    name: 'PageContent',
    props: ['title', 'backrouterLink'],
    template:
      '<section class="page-content-stub" :data-title="title" :data-back-link="backrouterLink?.name"><slot /></section>',
  },
}))

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['icon'],
    template: '<i class="icon-stub" :data-icon="icon" />',
  },
}))

const mountView = () => mount(SecurityView)

describe('services/security view consolidated unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.statusRef.value = makeStatus()

    mocks.authStore.refreshStatus.mockResolvedValue(mocks.statusRef.value)
    mocks.authStore.promptForAuth.mockResolvedValue(true)
    mocks.authStore.setPassword.mockResolvedValue({ csrf: 'token' })
    mocks.authStore.setPolicy.mockResolvedValue(undefined)
    mocks.authStore.logout.mockResolvedValue(undefined)
  })

  describe('unit coverage', () => {
    it('renders page shell, protection copy and loaded status details', async () => {
      mocks.statusRef.value = makeStatus({
        protection: 'risky',
        has_password: true,
        authenticated: true,
      })

      const wrapper = mountView()
      await flushPromises()

      const page = wrapper.get('.page-content-stub')
      expect(page.attributes('data-title')).toBe('Security')
      expect(page.attributes('data-back-link')).toBe('services')
      expect(wrapper.text()).toContain('Password protection')
      expect(wrapper.text()).toContain('settings changes require a password')
      expect(wrapper.text()).toContain('Set')
      expect(wrapper.text()).toContain('Signed in')
      expect(wrapper.find('button.btn-secondary').text()).toBe('Log out')
    })

    it('shows load error when status refresh fails on mount', async () => {
      mocks.authStore.refreshStatus.mockRejectedValueOnce(new Error('status unavailable'))

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('.security-error').text()).toContain('status unavailable')
    })

    it('requires matching passwords and current password when changing existing password', async () => {
      mocks.statusRef.value = makeStatus({ has_password: true })

      const wrapper = mountView()
      await flushPromises()

      const submit = wrapper.get('button.btn-primary')
      expect(submit.attributes('disabled')).toBeDefined()

      await wrapper.get('#new-password').setValue('new-secret')
      await wrapper.get('#confirm-password').setValue('new-secret')
      await flushPromises()
      expect(submit.attributes('disabled')).toBeDefined()

      await wrapper.get('#current-password').setValue('old-secret')
      await flushPromises()
      expect(submit.attributes('disabled')).toBeUndefined()
    })

    it('maps password API auth errors to human-friendly copy', async () => {
      mocks.statusRef.value = makeStatus({ has_password: true })
      mocks.authStore.setPassword.mockRejectedValueOnce(new AuthApiError(401, 'Unauthorized'))

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('#current-password').setValue('wrong')
      await wrapper.get('#new-password').setValue('next')
      await wrapper.get('#confirm-password').setValue('next')
      await wrapper.get('form.password-form').trigger('submit')
      await flushPromises()

      expect(wrapper.text()).toContain('Wrong password. Please try again.')
    })
  })

  describe('regression coverage', () => {
    it('shows first-time password success copy even after status becomes has_password=true', async () => {
      mocks.statusRef.value = makeStatus({ has_password: false })
      mocks.authStore.setPassword.mockImplementationOnce(async () => {
        mocks.statusRef.value = makeStatus({
          protection: 'risky',
          has_password: true,
          authenticated: true,
        })
        return { csrf: 'token' }
      })

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('#new-password').setValue('first-pass')
      await wrapper.get('#confirm-password').setValue('first-pass')
      await wrapper.get('.security-remember input').setValue(true)
      await wrapper.get('form.password-form').trigger('submit')
      await flushPromises()

      expect(mocks.authStore.setPassword).toHaveBeenCalledWith('first-pass', undefined, true)
      expect(wrapper.text()).toContain('Password set. Settings changes are now protected.')
      expect(wrapper.text()).not.toContain('Password changed.')
    })

    it('uses change-password flow and current password for existing credentials', async () => {
      mocks.statusRef.value = makeStatus({ has_password: true })

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('#current-password').setValue('old-pass')
      await wrapper.get('#new-password').setValue('new-pass')
      await wrapper.get('#confirm-password').setValue('new-pass')
      await wrapper.get('form.password-form').trigger('submit')
      await flushPromises()

      expect(mocks.authStore.setPassword).toHaveBeenCalledWith('new-pass', 'old-pass', false)
      expect(wrapper.text()).toContain('Password changed.')
    })

    it('prompts for auth before policy change when unauthenticated and applies chosen policy', async () => {
      mocks.statusRef.value = makeStatus({
        has_password: true,
        authenticated: false,
        protection: 'risky',
      })

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('input[type="radio"][value="all"]').trigger('change')
      await flushPromises()

      expect(mocks.authStore.promptForAuth).toHaveBeenCalledWith('login')
      expect(mocks.authStore.setPolicy).toHaveBeenCalledWith('all')
    })

    it('does not apply policy when auth prompt is declined', async () => {
      mocks.statusRef.value = makeStatus({ has_password: true, authenticated: false, protection: 'risky' })
      mocks.authStore.promptForAuth.mockResolvedValueOnce(false)

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('input[type="radio"][value="all"]').trigger('change')
      await flushPromises()

      expect(mocks.authStore.setPolicy).not.toHaveBeenCalled()
    })

    it('turns protection off through danger action', async () => {
      mocks.statusRef.value = makeStatus({ has_password: true, authenticated: true, protection: 'risky' })

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('button.danger-link').trigger('click')
      await flushPromises()

      expect(mocks.authStore.setPolicy).toHaveBeenCalledWith('off')
    })

    it('logout always clears busy even if refreshStatus fails after logout attempt', async () => {
      mocks.statusRef.value = makeStatus({ has_password: true, authenticated: true })
      mocks.authStore.logout.mockRejectedValueOnce(new Error('logout failed'))
      mocks.authStore.refreshStatus
        .mockResolvedValueOnce(mocks.statusRef.value)
        .mockRejectedValueOnce(new Error('refresh failed'))

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('button.btn-secondary').trigger('click')
      await flushPromises()

      expect(mocks.authStore.logout).toHaveBeenCalledTimes(1)
      expect(mocks.authStore.refreshStatus).toHaveBeenCalledTimes(2)
      expect(wrapper.get('button.btn-secondary').attributes('disabled')).toBeUndefined()
    })
  })
})
