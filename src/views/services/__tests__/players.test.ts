import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import PlayersView from '../players.vue'

const mocks = vi.hoisted(() => {
  const expertModeRef = { value: false }

  const router = {
    push: vi.fn(),
  }

  const settingsStore = {
    getExpertMode: expertModeRef,
  }

  const serviceStatusByName = {
    mpd: {
      active: 'inactive',
      enabled: 'disabled',
      allowed_operations: [],
    },
    raat: {
      active: 'active',
      enabled: 'enabled',
      allowed_operations: ['start', 'stop', 'enable', 'disable'],
    },
    'hifiberry-bluetooth': {
      active: 'inactive',
      enabled: 'disabled',
      allowed_operations: ['start', 'stop', 'enable', 'disable'],
    },
    'zzz-player': {
      active: 'inactive',
      enabled: 'disabled',
      allowed_operations: ['start', 'stop', 'enable', 'disable'],
    },
    'aaa-player': {
      active: 'inactive',
      enabled: 'disabled',
      allowed_operations: ['start', 'stop', 'enable', 'disable'],
    },
  } as Record<string, { active: 'active' | 'inactive' | 'failed'; enabled: 'enabled' | 'disabled'; allowed_operations: string[] }>

  const serviceExistenceByName = {
    mpd: true,
    raat: true,
    'hifiberry-bluetooth': true,
    'zzz-player': true,
    'aaa-player': false,
  } as Record<string, boolean>

  const getMultipleServiceStatus = vi.fn(async (services: string[]) => {
    const map = new Map<string, { active: 'active' | 'inactive' | 'failed'; enabled: 'enabled' | 'disabled'; allowed_operations: string[] }>()
    for (const service of services) {
      if (mocks.serviceStatusByName[service]) {
        map.set(service, mocks.serviceStatusByName[service])
      }
    }
    return map
  })

  const enableNowService = vi.fn(async () => true)
  const disableNowService = vi.fn(async () => true)
  const checkSystemdServiceExists = vi.fn(async (serviceName: string) => ({
    data: { exists: mocks.serviceExistenceByName[serviceName] ?? false },
  }))

  const getExternalPlayers = vi.fn(async () => [
    {
      name: 'Zeta Player',
      provided_by: 'community-z',
      systemd_service: 'zzz-player',
      icon_url: '/icons/zeta.svg',
      allow_change: true,
      maintainer_name: 'Z Team',
      maintainer_url: 'https://example.com/z',
      settings: [
        {
          key: 'quality',
          type: 'select',
          label: 'Quality',
          default: 'standard',
          value: 'standard',
          options: [
            { value: 'standard', label: 'Standard' },
            { value: 'high', label: 'High' },
          ],
        },
      ],
    },
    {
      name: 'Alpha Player',
      provided_by: 'community-a',
      systemd_service: 'aaa-player',
      icon_url: '/icons/alpha.svg',
      allow_change: true,
      maintainer_name: 'A Team',
      maintainer_url: 'https://example.com/a',
      settings: [
        {
          key: 'quality',
          type: 'select',
          label: 'Quality',
          default: 'standard',
          value: 'standard',
          options: [
            { value: 'standard', label: 'Standard' },
            { value: 'high', label: 'High' },
          ],
        },
      ],
    },
  ])

  const saveExternalPlayerSettings = vi.fn(async () => undefined)

  const getTOSLinkStatus = vi.fn(async () => ({
    available: false,
    enabled: false,
    signalDetected: false,
    allowChange: false,
    error: 'DSP sound card with TOSLink input required',
    requiresDSP: true,
    sensitivity: 'medium' as const,
  }))
  const enableTOSLink = vi.fn(async () => undefined)
  const disableTOSLink = vi.fn(async () => undefined)
  const setTOSLinkSensitivity = vi.fn(async () => undefined)

  return {
    expertModeRef,
    router,
    settingsStore,
    serviceStatusByName,
    serviceExistenceByName,
    getMultipleServiceStatus,
    enableNowService,
    disableNowService,
    checkSystemdServiceExists,
    getExternalPlayers,
    saveExternalPlayerSettings,
    getTOSLinkStatus,
    enableTOSLink,
    disableTOSLink,
    setTOSLinkSensitivity,
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('pinia', () => ({
  storeToRefs: () => ({ getExpertMode: mocks.expertModeRef }),
}))

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => mocks.settingsStore,
}))

vi.mock('@/api/config', () => ({
  getMultipleServiceStatus: mocks.getMultipleServiceStatus,
  enableNowService: mocks.enableNowService,
  disableNowService: mocks.disableNowService,
  checkSystemdServiceExists: mocks.checkSystemdServiceExists,
  getExternalPlayers: mocks.getExternalPlayers,
  saveExternalPlayerSettings: mocks.saveExternalPlayerSettings,
}))

vi.mock('@/services/toslink', () => ({
  getTOSLinkStatus: mocks.getTOSLinkStatus,
  enableTOSLink: mocks.enableTOSLink,
  disableTOSLink: mocks.disableTOSLink,
  setTOSLinkSensitivity: mocks.setTOSLinkSensitivity,
}))

vi.mock('@/components/PageContent.vue', () => ({
  default: {
    name: 'PageContent',
    props: ['title', 'backrouterLink'],
    template:
      '<section class="page-content-stub" :data-title="title" :data-back-link="backrouterLink?.name"><slot /></section>',
  },
}))

vi.mock('@/components/PlayerCard.vue', () => ({
  default: {
    name: 'PlayerCard',
    props: ['player', 'isExpanded'],
    emits: [
      'toggle',
      'toggle-config',
      'navigate-bluetooth',
      'update-airplay-version',
      'update-toslink-sensitivity',
      'cancel-config',
      'save-config',
      'update-external-setting',
    ],
    template: `
      <article class="player-card-stub" :data-name="player.name" :data-external="player.isExternal ? 'yes' : 'no'" :data-expanded="isExpanded ? 'yes' : 'no'">
        <h4 class="player-name">{{ player.name }}</h4>
        <p class="player-error-stub">{{ player.error }}</p>
        <button type="button" class="toggle-btn" @click="$emit('toggle')">Toggle</button>
        <button type="button" class="toggle-config-btn" @click="$emit('toggle-config')">Toggle Config</button>
        <button type="button" class="navigate-bluetooth-btn" @click="$emit('navigate-bluetooth')">Bluetooth</button>
        <button type="button" class="save-config-btn" @click="$emit('save-config')">Save</button>
        <button type="button" class="cancel-config-btn" @click="$emit('cancel-config')">Cancel</button>
        <button type="button" class="update-external-setting-btn" @click="$emit('update-external-setting', 'quality', 'high')">Update External</button>
        <button type="button" class="update-toslink-btn" @click="$emit('update-toslink-sensitivity', 'high')">Update TOSLink</button>
      </article>
    `,
  },
}))

const mountView = () => mount(PlayersView)

describe('services/players view consolidated unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.expertModeRef.value = false

    mocks.serviceExistenceByName.mpd = true
    mocks.serviceExistenceByName.raat = true
    mocks.serviceExistenceByName['hifiberry-bluetooth'] = true
    mocks.serviceExistenceByName['zzz-player'] = true
    mocks.serviceExistenceByName['aaa-player'] = false

    mocks.serviceStatusByName.mpd = {
      active: 'inactive',
      enabled: 'disabled',
      allowed_operations: [],
    }
    mocks.serviceStatusByName.raat = {
      active: 'active',
      enabled: 'enabled',
      allowed_operations: ['start', 'stop', 'enable', 'disable'],
    }
    mocks.serviceStatusByName['hifiberry-bluetooth'] = {
      active: 'inactive',
      enabled: 'disabled',
      allowed_operations: ['start', 'stop', 'enable', 'disable'],
    }
    mocks.serviceStatusByName['zzz-player'] = {
      active: 'inactive',
      enabled: 'disabled',
      allowed_operations: ['start', 'stop', 'enable', 'disable'],
    }

    mocks.getTOSLinkStatus.mockResolvedValue({
      available: false,
      enabled: false,
      signalDetected: false,
      allowChange: false,
      error: 'DSP sound card with TOSLink input required',
      requiresDSP: true,
      sensitivity: 'medium',
    })

    mocks.enableNowService.mockResolvedValue(true)
    mocks.disableNowService.mockResolvedValue(true)
    mocks.saveExternalPlayerSettings.mockResolvedValue(undefined)
    mocks.setTOSLinkSensitivity.mockResolvedValue(undefined)
  })

  describe('unit coverage', () => {
    it('renders page shell and semantic players header copy', async () => {
      const wrapper = mountView()
      await flushPromises()

      const page = wrapper.get('.page-content-stub')
      expect(page.attributes('data-title')).toBe('Players')
      expect(page.attributes('data-back-link')).toBe('services')
      expect(wrapper.text()).toContain('Manage and configure your audio players')
    })

    it('hides non-installed players when expert mode is disabled', async () => {
      const wrapper = mountView()
      await flushPromises()

      const names = wrapper.findAll('.player-card-stub .player-name').map((n) => n.text())
      expect(names).toContain('Local music')
      expect(names).toContain('Roon')
      expect(names).toContain('Bluetooth')
      expect(names).toContain('Zeta Player')
      expect(names).not.toContain('TOSLink')
      expect(names).not.toContain('Alpha Player')
    })

    it('shows hidden built-in and external players in expert mode and keeps external alphabetical order', async () => {
      mocks.expertModeRef.value = true

      const wrapper = mountView()
      await flushPromises()

      const externalNames = wrapper
        .findAll('.player-card-stub[data-external="yes"] .player-name')
        .map((n) => n.text())

      expect(externalNames).toEqual(['Alpha Player', 'Zeta Player'])
      expect(wrapper.text()).toContain('TOSLink')
      expect(wrapper.text()).toContain('3rd Party Players')
    })

    it('navigates to bluetooth settings via named route action', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('[data-name="Bluetooth"] .navigate-bluetooth-btn').trigger('click')

      expect(mocks.router.push).toHaveBeenCalledWith({ name: 'bluetooth-settings' })
    })

    it('toggles and cancels config expansion state for a player card', async () => {
      mocks.expertModeRef.value = true
      const wrapper = mountView()
      await flushPromises()

      const roonCard = () => wrapper.get('[data-name="Roon"]')

      expect(roonCard().attributes('data-expanded')).toBe('no')
      await roonCard().get('.toggle-config-btn').trigger('click')
      await flushPromises()
      expect(roonCard().attributes('data-expanded')).toBe('yes')

      await roonCard().get('.cancel-config-btn').trigger('click')
      await flushPromises()
      expect(roonCard().attributes('data-expanded')).toBe('no')
    })
  })

  describe('regression coverage', () => {
    it('disables active regular service on toggle and refreshes service status', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('[data-name="Roon"] .toggle-btn').trigger('click')
      await flushPromises()

      expect(mocks.disableNowService).toHaveBeenCalledWith('raat')
      expect(mocks.checkSystemdServiceExists).toHaveBeenCalledWith('raat')
      expect(mocks.getMultipleServiceStatus).toHaveBeenCalledWith(['raat'])
    })

    it('surfaces not-allowed error when regular service toggle gets a 403', async () => {
      mocks.disableNowService.mockRejectedValueOnce(new Error('403 Forbidden'))

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('[data-name="Roon"] .toggle-btn').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-name="Roon"] .player-error-stub').text()).toContain(
        'Not allowed to change the service state',
      )
    })

    it('keeps external config expanded and exposes error when settings save fails', async () => {
      mocks.saveExternalPlayerSettings.mockRejectedValueOnce(new Error('save failed'))

      const wrapper = mountView()
      await flushPromises()

      const externalCard = () => wrapper.get('[data-name="Zeta Player"]')

      await externalCard().get('.toggle-config-btn').trigger('click')
      await flushPromises()
      expect(externalCard().attributes('data-expanded')).toBe('yes')

      await externalCard().get('.update-external-setting-btn').trigger('click')
      await externalCard().get('.save-config-btn').trigger('click')
      await flushPromises()

      expect(externalCard().attributes('data-expanded')).toBe('yes')
      expect(externalCard().get('.player-error-stub').text()).toContain('save failed')
    })

    it('saves external settings and closes config on success', async () => {
      const wrapper = mountView()
      await flushPromises()

      const externalCard = () => wrapper.get('[data-name="Zeta Player"]')

      await externalCard().get('.toggle-config-btn').trigger('click')
      await flushPromises()
      await externalCard().get('.update-external-setting-btn').trigger('click')
      await externalCard().get('.save-config-btn').trigger('click')
      await flushPromises()

      expect(mocks.saveExternalPlayerSettings).toHaveBeenCalledWith('zzz-player', {
        quality: 'high',
      })
      expect(externalCard().attributes('data-expanded')).toBe('no')
    })

    it('keeps TOSLink config expanded and sets player error when sensitivity save fails', async () => {
      mocks.expertModeRef.value = true
      mocks.getTOSLinkStatus.mockResolvedValueOnce({
        available: true,
        enabled: true,
        signalDetected: true,
        allowChange: true,
        requiresDSP: true,
        sensitivity: 'medium',
      })
      mocks.setTOSLinkSensitivity.mockRejectedValueOnce(new Error('write failed'))

      const wrapper = mountView()
      await flushPromises()

      const toslinkCard = () => wrapper.get('[data-name="TOSLink"]')

      await toslinkCard().get('.toggle-config-btn').trigger('click')
      await flushPromises()

      await toslinkCard().get('.update-toslink-btn').trigger('click')
      await toslinkCard().get('.save-config-btn').trigger('click')
      await flushPromises()

      expect(mocks.setTOSLinkSensitivity).toHaveBeenCalledWith('high')
      expect(toslinkCard().attributes('data-expanded')).toBe('yes')
      expect(toslinkCard().get('.player-error-stub').text()).toContain('write failed')
    })
  })
})
