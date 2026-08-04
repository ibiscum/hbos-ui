import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

import ExtensionsView from '../extensions.vue'

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const makeExtension = (overrides: Record<string, unknown> = {}) => ({
  package: 'pkg.player',
  name: 'Player Extension',
  category: 'player',
  summary: 'Play better music',
  description: 'Detailed docs',
  version: '1.2.3',
  installed_version: null,
  state: 'available',
  needs_reboot: 'no',
  icon_url: null,
  source: 'apt',
  ...overrides,
})

const mocks = vi.hoisted(() => {
  const routeQuery: Record<string, unknown> = {}

  const toastStore = {
    showErrorToast: vi.fn(),
  }

  const listExtensions = vi.fn()
  const refreshExtensions = vi.fn()
  const installExtension = vi.fn()
  const uninstallExtension = vi.fn()

  const track = vi.fn()
  const stop = vi.fn()

  const jobState = {} as {
    job: ReturnType<typeof ref<{ package: string | null } | null>>
    phase: ReturnType<typeof ref<string | null>>
    percent: ReturnType<typeof ref<number>>
    log: ReturnType<typeof ref<string[]>>
    isRunning: ReturnType<typeof ref<boolean>>
    isDone: ReturnType<typeof ref<boolean>>
    isFailed: ReturnType<typeof ref<boolean>>
    rebootRequired: ReturnType<typeof ref<boolean>>
    error: ReturnType<typeof ref<string | null>>
    track: typeof track
    stop: typeof stop
  }

  return {
    routeQuery,
    toastStore,
    listExtensions,
    refreshExtensions,
    installExtension,
    uninstallExtension,
    track,
    stop,
    jobState,
  }
})

const resetJobState = () => {
  mocks.jobState.job = ref<{ package: string | null } | null>(null)
  mocks.jobState.phase = ref<string | null>(null)
  mocks.jobState.percent = ref(0)
  mocks.jobState.log = ref<string[]>([])
  mocks.jobState.isRunning = ref(false)
  mocks.jobState.isDone = ref(false)
  mocks.jobState.isFailed = ref(false)
  mocks.jobState.rebootRequired = ref(false)
  mocks.jobState.error = ref<string | null>(null)
  mocks.jobState.track = mocks.track
  mocks.jobState.stop = mocks.stop
}

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: mocks.routeQuery }),
}))

vi.mock('@/components/PageContent.vue', () => ({
  default: {
    name: 'PageContent',
    props: ['title', 'backrouterLink'],
    template:
      '<section class="page-content-stub" :data-title="title" :data-back-link="backrouterLink?.name"><slot /></section>',
  },
}))

vi.mock('@/components/ExtensionCard.vue', () => ({
  default: {
    name: 'ExtensionCard',
    props: ['extension', 'busy'],
    emits: ['install', 'uninstall'],
    template: `
      <article class="extension-card-stub" :data-package="extension.package" :data-category="extension.category" :data-busy="busy ? 'yes' : 'no'">
        <h4 class="stub-name">{{ extension.name }}</h4>
        <p class="stub-summary">{{ extension.summary }}</p>
        <button class="stub-install" type="button" @click="$emit('install', extension.package)">Install</button>
        <button class="stub-uninstall" type="button" @click="$emit('uninstall', extension.package)">Uninstall</button>
      </article>
    `,
  },
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => mocks.toastStore,
}))

vi.mock('@/api/extensions', () => ({
  listExtensions: mocks.listExtensions,
  refreshExtensions: mocks.refreshExtensions,
  installExtension: mocks.installExtension,
  uninstallExtension: mocks.uninstallExtension,
}))

vi.mock('@/composables/useInstallJob', () => ({
  useInstallJob: () => mocks.jobState,
}))

const mountView = () => mount(ExtensionsView)

describe('services/extensions view consolidated unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetJobState()

    for (const key of Object.keys(mocks.routeQuery)) {
      delete mocks.routeQuery[key]
    }

    mocks.listExtensions.mockResolvedValue({
      data: {
        extensions: [
          makeExtension(),
          makeExtension({
            package: 'pkg.dsp',
            name: 'DSP Helper',
            category: 'dsp',
            summary: 'Tune your chain',
            state: 'upgradable',
            installed_version: '1.0.0',
            version: '1.3.0',
          }),
        ],
      },
    })

    mocks.refreshExtensions.mockResolvedValue({ data: { job: { id: 'job-refresh' } } })
    mocks.installExtension.mockResolvedValue({ data: { job: { id: 'job-install' } } })
    mocks.uninstallExtension.mockResolvedValue({ data: { job: { id: 'job-uninstall' } } })
  })

  describe('unit coverage', () => {
    it('renders page shell, toolbar, and fetched extension cards', async () => {
      const wrapper = mountView()
      await flushPromises()

      const page = wrapper.get('.page-content-stub')
      expect(page.attributes('data-title')).toBe('Extensions')
      expect(page.attributes('data-back-link')).toBe('services')
      expect(wrapper.text()).toContain('Browse and install optional software packages')
      expect(wrapper.findAll('.extension-card-stub')).toHaveLength(2)
      expect(mocks.listExtensions).toHaveBeenCalledTimes(1)
    })

    it('shows loading copy while list request is in flight', async () => {
      const pending = deferred<{ data: { extensions: Array<Record<string, unknown>> } }>()
      mocks.listExtensions.mockReturnValueOnce(pending.promise)

      const wrapper = mountView()
      await nextTick()

      expect(wrapper.text()).toContain('Loading extensions…')

      pending.resolve({ data: { extensions: [] } })
      await flushPromises()

      expect(wrapper.text()).toContain('No extensions found. Add a source to see extensions here.')
    })

    it('shows load error copy when extension list fetch fails', async () => {
      mocks.listExtensions.mockRejectedValueOnce(new Error('catalog unavailable'))

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('.extensions-error').text()).toContain('catalog unavailable')
      expect(wrapper.findAll('.extension-card-stub')).toHaveLength(0)
    })

    it('filters extensions by search term and selected category', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.extensions-search').setValue('dsp')
      await flushPromises()

      expect(wrapper.findAll('.extension-card-stub')).toHaveLength(1)
      expect(wrapper.text()).toContain('DSP Helper')

      await wrapper.get('.extensions-search').setValue('')
      await wrapper.get('.extensions-category').setValue('player')
      await flushPromises()

      expect(wrapper.findAll('.extension-card-stub')).toHaveLength(1)
      expect(wrapper.text()).toContain('Player Extension')

      await wrapper.get('.extensions-search').setValue('missing')
      await flushPromises()

      expect(wrapper.text()).toContain('No extensions match this filter.')
    })

    it('starts refresh job and disables refresh button while running', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.extensions-refresh-btn').trigger('click')

      expect(mocks.refreshExtensions).toHaveBeenCalledTimes(1)
      expect(mocks.track).toHaveBeenCalledWith('job-refresh')

      mocks.jobState.isRunning.value = true
      await nextTick()

      expect(wrapper.get('.extensions-refresh-btn').attributes('disabled')).toBeDefined()
    })
  })

  describe('regression coverage', () => {
    it('opens install dialog, tracks job, and allows log toggle', async () => {
      mocks.jobState.phase.value = 'installing'
      mocks.jobState.percent.value = 33
      mocks.jobState.log.value = ['step one', 'step two']

      const wrapper = mountView()
      await flushPromises()

      await wrapper.findAll('.stub-install')[0].trigger('click')
      await flushPromises()

      expect(mocks.installExtension).toHaveBeenCalledWith('pkg.player')
      expect(mocks.track).toHaveBeenCalledWith('job-install')
      expect(wrapper.find('.extensions-dialog-overlay').exists()).toBe(true)
      expect(wrapper.text()).toContain('Player Extension')

      await wrapper.get('.extensions-log-toggle').trigger('click')
      expect(wrapper.text()).toContain('step one')
      expect(wrapper.text()).toContain('step two')
    })

    it('resets dialog state after install failure and shows toast', async () => {
      mocks.installExtension.mockRejectedValueOnce(new Error('install failed'))

      const wrapper = mountView()
      await flushPromises()

      await wrapper.findAll('.stub-install')[0].trigger('click')
      await flushPromises()

      expect(wrapper.find('.extensions-dialog-overlay').exists()).toBe(false)
      expect(mocks.toastStore.showErrorToast).toHaveBeenCalledWith('install failed')
    })

    it('opens uninstall dialog and tracks uninstall job', async () => {
      mocks.jobState.phase.value = 'queued'

      const wrapper = mountView()
      await flushPromises()

      await wrapper.findAll('.stub-uninstall')[1].trigger('click')
      await flushPromises()

      expect(mocks.uninstallExtension).toHaveBeenCalledWith('pkg.dsp')
      expect(mocks.track).toHaveBeenCalledWith('job-uninstall')
      expect(wrapper.find('.extensions-dialog-overlay').exists()).toBe(true)
      expect(wrapper.text()).toContain('DSP Helper')
    })

    it('reloads catalog when tracked job transitions to done', async () => {
      const wrapper = mountView()
      await flushPromises()

      expect(mocks.listExtensions).toHaveBeenCalledTimes(1)

      mocks.jobState.isDone.value = true
      await flushPromises()

      expect(mocks.listExtensions).toHaveBeenCalledTimes(2)
      wrapper.unmount()
    })

    it('auto-installs route requested package when available and not installed', async () => {
      mocks.routeQuery.install = 'pkg.dsp'

      mountView()
      await flushPromises()

      expect(mocks.installExtension).toHaveBeenCalledWith('pkg.dsp')
      expect(mocks.track).toHaveBeenCalledWith('job-install')
    })

    it('does not auto-install route requested package when already installed', async () => {
      mocks.routeQuery.install = 'pkg.player'
      mocks.listExtensions.mockResolvedValueOnce({
        data: {
          extensions: [
            makeExtension({ package: 'pkg.player', state: 'installed', installed_version: '1.2.3' }),
          ],
        },
      })

      mountView()
      await flushPromises()

      expect(mocks.installExtension).not.toHaveBeenCalled()
    })

    it('shows reboot-required and failure copy in dialog from job state', async () => {
      mocks.jobState.phase.value = 'failed'
      mocks.jobState.percent.value = 100
      mocks.jobState.isFailed.value = true
      mocks.jobState.error.value = 'postinst failed'
      mocks.jobState.rebootRequired.value = true
      mocks.jobState.isDone.value = true

      const wrapper = mountView()
      await flushPromises()

      await wrapper.findAll('.stub-install')[0].trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Failed: postinst failed')
      expect(wrapper.text()).toContain('This change needs a reboot to take effect.')

      await wrapper.get('.extensions-log-toggle').trigger('click')
      await wrapper.get('.extensions-dialog-close').trigger('click')
      await flushPromises()

      expect(wrapper.find('.extensions-dialog-overlay').exists()).toBe(false)
    })
  })
})
