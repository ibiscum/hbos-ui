import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import ExtensionSourcesView from '../extension-sources.vue'

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const mocks = vi.hoisted(() => {
  const toastStore = {
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  }

  const listExtensionSources = vi.fn()
  const addExtensionSource = vi.fn()
  const removeExtensionSource = vi.fn()
  const listGithubSources = vi.fn()
  const addGithubSource = vi.fn()
  const removeGithubSource = vi.fn()

  return {
    toastStore,
    listExtensionSources,
    addExtensionSource,
    removeExtensionSource,
    listGithubSources,
    addGithubSource,
    removeGithubSource,
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

vi.mock('@/stores/toast', () => ({
  useToastStore: () => mocks.toastStore,
}))

vi.mock('@/api/extensions', () => ({
  listExtensionSources: mocks.listExtensionSources,
  addExtensionSource: mocks.addExtensionSource,
  removeExtensionSource: mocks.removeExtensionSource,
  listGithubSources: mocks.listGithubSources,
  addGithubSource: mocks.addGithubSource,
  removeGithubSource: mocks.removeGithubSource,
}))

const mountView = () => mount(ExtensionSourcesView)

describe('services/extension-sources view consolidated unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.stubGlobal('confirm', vi.fn(() => true))

    mocks.listExtensionSources.mockResolvedValue({
      data: {
        sources: [
          {
            id: 'main-repo',
            uri: 'https://repo.example.com/debian',
            suite: 'trixie',
            components: 'main',
            keyring: '/usr/share/keyrings/main-repo.gpg',
          },
        ],
      },
    })

    mocks.listGithubSources.mockResolvedValue({
      data: {
        sources: [
          {
            id: 'gh-main',
            repo: 'pulpier/tidal-connect-hifiberry',
          },
        ],
      },
    })

    mocks.addExtensionSource.mockResolvedValue({ status: 'success' })
    mocks.removeExtensionSource.mockResolvedValue({ status: 'success' })
    mocks.addGithubSource.mockResolvedValue({ status: 'success' })
    mocks.removeGithubSource.mockResolvedValue({ status: 'success' })
  })

  describe('unit coverage', () => {
    it('renders page shell and fetched apt + github sources', async () => {
      const wrapper = mountView()
      await flushPromises()

      const pageContent = wrapper.get('.page-content-stub')
      expect(pageContent.attributes('data-title')).toBe('Extension sources')
      expect(pageContent.attributes('data-back-link')).toBe('extensions')

      expect(wrapper.text()).toContain('main-repo')
      expect(wrapper.text()).toContain('https://repo.example.com/debian trixie main')
      expect(wrapper.text()).toContain('GitHub sources')
      expect(wrapper.text()).toContain('pulpier/tidal-connect-hifiberry')
    })

    it('shows empty-state copy for both source lists', async () => {
      mocks.listExtensionSources.mockResolvedValueOnce({ data: { sources: [] } })
      mocks.listGithubSources.mockResolvedValueOnce({ data: { sources: [] } })

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('No extension sources configured.')
      expect(wrapper.text()).toContain('No GitHub sources configured.')
    })

    it('adds an apt source and refreshes list', async () => {
      mocks.listExtensionSources
        .mockResolvedValueOnce({ data: { sources: [] } })
        .mockResolvedValueOnce({
          data: {
            sources: [
              {
                id: 'trusted-repo',
                uri: 'https://trusted.example.com/debian',
                suite: 'bookworm',
                components: 'main contrib',
                keyring: '/usr/share/keyrings/trusted-repo.gpg',
              },
            ],
          },
        })

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('button').trigger('click')
      await wrapper.get('input[pattern="[a-z0-9][a-z0-9-]*"]').setValue('trusted-repo')
      await wrapper.get('input[type="url"]').setValue('https://trusted.example.com/debian')

      const suiteInput = wrapper.findAll('input').find((entry) => entry.element.getAttribute('required') !== null && !entry.attributes('type') && !entry.attributes('pattern'))
      expect(suiteInput).toBeDefined()
      await suiteInput!.setValue('bookworm')

      const componentsInput = wrapper.findAll('input').find((entry) => entry.attributes('placeholder') === undefined && entry.attributes('type') === undefined && entry.attributes('pattern') === undefined && entry.element !== suiteInput!.element)
      expect(componentsInput).toBeDefined()
      await componentsInput!.setValue('main contrib')

      await wrapper.get('textarea').setValue('-----BEGIN PGP PUBLIC KEY BLOCK-----\nabc\n-----END PGP PUBLIC KEY BLOCK-----')
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(mocks.addExtensionSource).toHaveBeenCalledWith({
        id: 'trusted-repo',
        uri: 'https://trusted.example.com/debian',
        suite: 'bookworm',
        components: 'main contrib',
        key: '-----BEGIN PGP PUBLIC KEY BLOCK-----\nabc\n-----END PGP PUBLIC KEY BLOCK-----',
      })
      expect(mocks.toastStore.showSuccessToast).toHaveBeenCalledWith('Added source trusted-repo')
      expect(mocks.listExtensionSources).toHaveBeenCalledTimes(2)
      expect(wrapper.text()).toContain('trusted-repo')
      expect(wrapper.find('form').exists()).toBe(false)
    })

    it('shows github loading copy while github list request is in flight', async () => {
      const pendingGithub = deferred<{ data: { sources: Array<{ id: string; repo: string }> } }>()
      mocks.listGithubSources.mockReturnValueOnce(pendingGithub.promise)

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('Loading GitHub sources…')

      pendingGithub.resolve({ data: { sources: [] } })
      await flushPromises()

      expect(wrapper.text()).toContain('No GitHub sources configured.')
    })
  })

  describe('regression coverage', () => {
    it('blocks apt removal when confirmation is declined', async () => {
      vi.stubGlobal('confirm', vi.fn(() => false))

      const wrapper = mountView()
      await flushPromises()

      await wrapper.find('button[type="button"]').trigger('click')

      expect(mocks.removeExtensionSource).not.toHaveBeenCalled()
    })

    it('removes apt source when confirmation is accepted', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.find('button[type="button"]').trigger('click')
      await flushPromises()

      expect(mocks.removeExtensionSource).toHaveBeenCalledWith('main-repo')
      expect(mocks.toastStore.showSuccessToast).toHaveBeenCalledWith('Removed source main-repo')
      expect(mocks.listExtensionSources).toHaveBeenCalledTimes(2)
    })

    it('trims github repo before add and refreshes github list', async () => {
      mocks.listGithubSources
        .mockResolvedValueOnce({ data: { sources: [] } })
        .mockResolvedValueOnce({
          data: {
            sources: [{ id: 'gh-new', repo: 'owner/new-repo' }],
          },
        })

      const wrapper = mountView()
      await flushPromises()

      const addGithubButton = wrapper.findAll('button').find((button) => button.text() === 'Add GitHub source')
      expect(addGithubButton).toBeDefined()
      await addGithubButton!.trigger('click')

      await wrapper.get('input[placeholder="pulpier/tidal-connect-hifiberry"]').setValue('  owner/new-repo  ')

      const githubForm = wrapper.findAll('form')[0]
      await githubForm.trigger('submit')
      await flushPromises()

      expect(mocks.addGithubSource).toHaveBeenCalledWith('owner/new-repo')
      expect(mocks.toastStore.showSuccessToast).toHaveBeenCalledWith('Added GitHub source owner/new-repo')
      expect(mocks.listGithubSources).toHaveBeenCalledTimes(2)
    })

    it('rejects invalid github repo format without API call', async () => {
      const wrapper = mountView()
      await flushPromises()

      const addGithubButton = wrapper.findAll('button').find((button) => button.text() === 'Add GitHub source')
      expect(addGithubButton).toBeDefined()
      await addGithubButton!.trigger('click')

      await wrapper.get('input[placeholder="pulpier/tidal-connect-hifiberry"]').setValue('owner')

      const githubForm = wrapper.findAll('form')[0]
      await githubForm.trigger('submit')
      await flushPromises()

      expect(mocks.addGithubSource).not.toHaveBeenCalled()
      expect(mocks.toastStore.showErrorToast).toHaveBeenCalledWith(
        'Repository must be in owner/name format.',
      )
    })

    it('surfaces load errors for apt and github source requests', async () => {
      mocks.listExtensionSources.mockRejectedValueOnce(new Error('apt list failed'))
      mocks.listGithubSources.mockRejectedValueOnce(new Error('github list failed'))

      mountView()
      await flushPromises()

      expect(mocks.toastStore.showErrorToast).toHaveBeenCalledWith('apt list failed')
      expect(mocks.toastStore.showErrorToast).toHaveBeenCalledWith('github list failed')
    })

    it('blocks github removal when confirmation is declined', async () => {
      vi.stubGlobal('confirm', vi.fn(() => false))

      const wrapper = mountView()
      await flushPromises()

      const removeButtons = wrapper.findAll('button[type="button"]')
      const githubRemove = removeButtons.find((button) => button.text() === 'Remove' && button.element.closest('.sources__list')?.textContent?.includes('pulpier/tidal-connect-hifiberry'))
      expect(githubRemove).toBeDefined()
      await githubRemove!.trigger('click')

      expect(mocks.removeGithubSource).not.toHaveBeenCalled()
    })
  })
})
