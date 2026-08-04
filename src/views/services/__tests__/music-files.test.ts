import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import MusicFilesView from '../music-files.vue'

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const baseMount = {
  id: 1,
  server: '192.168.1.10',
  share: 'music',
  mountpoint: '/mnt/music',
  user: 'alice',
  version: '3.0',
  options: 'rw,vers=3.0',
  mounted: true,
}

const mocks = vi.hoisted(() => {
  const getSmbMounts = vi.fn()
  const unmountSmbShare = vi.fn()
  const apiFetch = vi.fn()

  const appConfigStore = {
    getApiBaseUrl: vi.fn(() => 'http://host/api/v1'),
  }

  const toastStore = {
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
    showInfoToast: vi.fn(),
  }

  return {
    getSmbMounts,
    unmountSmbShare,
    apiFetch,
    appConfigStore,
    toastStore,
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
    template: '<span class="icon-stub" :data-icon="icon" />',
  },
}))

vi.mock('@/components/AddSmbMountDialog.vue', () => ({
  default: {
    name: 'AddSmbMountDialog',
    props: ['isOpen'],
    emits: ['close', 'mount-created'],
    template: `
      <div class="add-smb-dialog-stub" :data-open="isOpen ? 'yes' : 'no'">
        <button type="button" class="dialog-close" @click="$emit('close')">Close</button>
        <button type="button" class="dialog-created" @click="$emit('mount-created')">Created</button>
      </div>
    `,
  },
}))

vi.mock('@/api/smb', () => ({
  getSmbMounts: mocks.getSmbMounts,
  unmountSmbShare: mocks.unmountSmbShare,
}))

vi.mock('@/api/http', () => ({
  apiFetch: mocks.apiFetch,
}))

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => mocks.appConfigStore,
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => mocks.toastStore,
}))

const mountView = () => mount(MusicFilesView)

describe('services/music-files view consolidated unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('confirm', vi.fn(() => true))

    mocks.getSmbMounts.mockResolvedValue({
      status: 'success',
      data: {
        mounts: [baseMount],
        summary: { total: 1, mounted: 1, unmounted: 0 },
      },
    })

    mocks.unmountSmbShare.mockResolvedValue({ status: 'success', data: {} })

    mocks.apiFetch.mockResolvedValue({ ok: true, status: 200, statusText: 'OK' })
  })

  describe('unit coverage', () => {
    it('renders page shell and service information copy', async () => {
      const wrapper = mountView()
      await flushPromises()

      const page = wrapper.get('.page-content-stub')
      expect(page.attributes('data-title')).toBe('Music Files')
      expect(page.attributes('data-back-link')).toBe('services')
      expect(wrapper.text()).toContain('/var/lib/mpd/music')
      expect(wrapper.text()).toContain('SMB/CIFS Mounts')
    })

    it('shows loading copy while mounts request is pending', async () => {
      const pending = deferred<unknown>()
      mocks.getSmbMounts.mockReturnValueOnce(pending.promise)

      const wrapper = mountView()
      await Promise.resolve()

      expect(wrapper.text()).toContain('Loading SMB mounts...')

      pending.resolve({
        status: 'success',
        data: { mounts: [], summary: { total: 0, mounted: 0, unmounted: 0 } },
      })
      await flushPromises()

      expect(wrapper.text()).toContain('No SMB Mounts')
    })

    it('renders mounts list and summary from successful response', async () => {
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('1 total, 1 mounted')
      expect(wrapper.text()).toContain('192.168.1.10/music')
      expect(wrapper.text()).toContain('/mnt/music')
      expect(wrapper.text()).toContain('Mounted')
    })

    it('renders empty state when no mounts are configured', async () => {
      mocks.getSmbMounts.mockResolvedValueOnce({
        status: 'success',
        data: {
          mounts: [],
          summary: { total: 0, mounted: 0, unmounted: 0 },
        },
      })

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('No SMB Mounts')
      expect(wrapper.text()).toContain('Add using the + symbol')
    })

    it('expands and collapses mount details table', async () => {
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).not.toContain('Server')

      await wrapper.get('.expand-caret').trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Server')
      expect(wrapper.text()).toContain('Share')
      expect(wrapper.text()).toContain('Options')

      await wrapper.get('.expand-caret').trigger('click')
      await flushPromises()

      expect(wrapper.text()).not.toContain('Options')
    })
  })

  describe('regression coverage', () => {
    it('shows error state when mounts API returns status error and supports retry', async () => {
      mocks.getSmbMounts
        .mockResolvedValueOnce({ status: 'error', message: 'list failed', data: { mounts: [], summary: null } })
        .mockResolvedValueOnce({
          status: 'success',
          data: { mounts: [baseMount], summary: { total: 1, mounted: 1, unmounted: 0 } },
        })

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('list failed')
      expect(wrapper.text()).not.toContain('1 total, 1 mounted')

      await wrapper.get('.retry-button').trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('1 total, 1 mounted')
      expect(mocks.getSmbMounts).toHaveBeenCalledTimes(2)
    })

    it('shows catch-path error copy when mounts fetch throws', async () => {
      mocks.getSmbMounts.mockRejectedValueOnce(new Error('network down'))

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('network down')
      expect(wrapper.text()).not.toContain('1 total, 1 mounted')
    })

    it('opens add dialog and handles close + mount-created events', async () => {
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.get('.add-smb-dialog-stub').attributes('data-open')).toBe('no')

      await wrapper.get('.add-button').trigger('click')
      await flushPromises()
      expect(wrapper.get('.add-smb-dialog-stub').attributes('data-open')).toBe('yes')

      await wrapper.get('.dialog-close').trigger('click')
      await flushPromises()
      expect(wrapper.get('.add-smb-dialog-stub').attributes('data-open')).toBe('no')

      await wrapper.get('.dialog-created').trigger('click')
      await flushPromises()
      expect(mocks.getSmbMounts).toHaveBeenCalledTimes(2)
    })

    it('removes mount after confirmation and refreshes list', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.delete-button').trigger('click')
      await flushPromises()

      expect(mocks.unmountSmbShare).toHaveBeenCalledWith('192.168.1.10', 'music')
      expect(mocks.getSmbMounts).toHaveBeenCalledTimes(2)
    })

    it('does not remove mount when confirmation is declined', async () => {
      vi.stubGlobal('confirm', vi.fn(() => false))

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.delete-button').trigger('click')
      await flushPromises()

      expect(mocks.unmountSmbShare).not.toHaveBeenCalled()
    })

    it('surfaces removal warning through info toast', async () => {
      mocks.unmountSmbShare.mockResolvedValueOnce({
        status: 'success',
        data: { warning: 'Mount removed but mpd reload pending' },
      })

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.delete-button').trigger('click')
      await flushPromises()

      expect(mocks.toastStore.showInfoToast).toHaveBeenCalledWith(
        'Mount removed but mpd reload pending',
      )
    })

    it('starts library rescan and shows success toast', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.rescan-button').trigger('click')
      await flushPromises()

      expect(mocks.apiFetch).toHaveBeenCalledWith('http://host/api/v1/library/mpd/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      expect(mocks.toastStore.showSuccessToast).toHaveBeenCalledWith(
        'Library rescan started. This may take a few minutes.',
      )
    })

    it('shows rescan failure toast when request fails', async () => {
      mocks.apiFetch.mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Service Unavailable' })

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.rescan-button').trigger('click')
      await flushPromises()

      expect(mocks.toastStore.showErrorToast).toHaveBeenCalledWith('Failed to start library rescan')
    })
  })
})
