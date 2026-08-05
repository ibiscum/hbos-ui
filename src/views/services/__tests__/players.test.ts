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
        <button type="button" class="update-external-missing-btn" @click="$emit('update-external-setting', 'missing', 'on')">Update Missing External</button>
        <button type="button" class="update-toslink-btn" @click="$emit('update-toslink-sensitivity', 'high')">Update TOSLink</button>
        <button type="button" class="update-airplay-btn" @click="$emit('update-airplay-version', 2)">Update Airplay</button>
      </article>
    `,
  },
}))

const mountView = () => mount(PlayersView)

describe('services/players view consolidated unit and regression tests', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

  beforeEach(() => {
    vi.clearAllMocks()

    mocks.checkSystemdServiceExists.mockImplementation(async (serviceName: string) => ({
      data: { exists: mocks.serviceExistenceByName[serviceName] ?? false },
    }))

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

    it('handles component load failure by logging and keeping builtin shell rendered', async () => {
      mocks.getExternalPlayers.mockRejectedValueOnce(new Error('load failed'))

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.get('.page-content-stub').attributes('data-title')).toBe('Players')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load service status:', expect.any(Error))
    })

    it('marks a service unavailable if existence check throws and prevents toggling it', async () => {
      mocks.expertModeRef.value = true
      mocks.checkSystemdServiceExists.mockImplementation(async (serviceName: string) => {
        if (serviceName === 'raat') {
          throw new Error('systemctl unavailable')
        }
        return { data: { exists: mocks.serviceExistenceByName[serviceName] ?? false } }
      })

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('[data-name="Roon"] .toggle-btn').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-name="Roon"] .player-error-stub').text()).toContain('Service is not installed')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to check existence for raat:', expect.any(Error))
      expect(mocks.enableNowService).not.toHaveBeenCalled()
      expect(mocks.disableNowService).not.toHaveBeenCalled()
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

    it('enables inactive regular service on toggle', async () => {
      mocks.serviceStatusByName.raat = {
        active: 'inactive',
        enabled: 'disabled',
        allowed_operations: ['start', 'stop', 'enable', 'disable'],
      }

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('[data-name="Roon"] .toggle-btn').trigger('click')
      await flushPromises()

      expect(mocks.enableNowService).toHaveBeenCalledWith('raat')
      expect(mocks.disableNowService).not.toHaveBeenCalled()
    })

    it('surfaces generic regular service error when toggle fails without 403', async () => {
      mocks.serviceStatusByName.raat = {
        active: 'inactive',
        enabled: 'disabled',
        allowed_operations: ['start', 'stop', 'enable', 'disable'],
      }
      mocks.enableNowService.mockRejectedValueOnce(new Error('backend timeout'))

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('[data-name="Roon"] .toggle-btn').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-name="Roon"] .player-error-stub').text()).toContain('Failed to change service state')
    })

    it('blocks toggle for allow_change=false regular services', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('[data-name="Local music"] .toggle-btn').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-name="Local music"] .player-error-stub').text()).toContain(
        'This service cannot be changed',
      )
      expect(mocks.enableNowService).not.toHaveBeenCalled()
      expect(mocks.disableNowService).not.toHaveBeenCalled()
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

    it('ignores unknown external setting keys and preserves previous value payload', async () => {
      const wrapper = mountView()
      await flushPromises()

      const externalCard = () => wrapper.get('[data-name="Zeta Player"]')

      await externalCard().get('.toggle-config-btn').trigger('click')
      await flushPromises()
      await externalCard().get('.update-external-missing-btn').trigger('click')
      await externalCard().get('.save-config-btn').trigger('click')
      await flushPromises()

      expect(mocks.saveExternalPlayerSettings).toHaveBeenCalledWith('zzz-player', {
        quality: 'standard',
      })
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

    it('does not toggle TOSLink when status disallows changes', async () => {
      mocks.expertModeRef.value = true

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('[data-name="TOSLink"] .toggle-btn').trigger('click')
      await flushPromises()

      expect(mocks.enableTOSLink).not.toHaveBeenCalled()
      expect(mocks.disableTOSLink).not.toHaveBeenCalled()
    })

    it('enables TOSLink and refreshes status after toggle', async () => {
      mocks.expertModeRef.value = true
      mocks.getTOSLinkStatus
        .mockResolvedValueOnce({
          available: true,
          enabled: false,
          signalDetected: false,
          allowChange: true,
          requiresDSP: true,
          sensitivity: 'medium',
        })
        .mockResolvedValueOnce({
          available: true,
          enabled: true,
          signalDetected: true,
          allowChange: true,
          requiresDSP: true,
          sensitivity: 'high',
        })

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('[data-name="TOSLink"] .toggle-btn').trigger('click')
      await new Promise((resolve) => setTimeout(resolve, 120))
      await flushPromises()

      expect(mocks.enableTOSLink).toHaveBeenCalledTimes(1)
      expect(mocks.disableTOSLink).not.toHaveBeenCalled()
      expect(mocks.getTOSLinkStatus).toHaveBeenCalledTimes(2)
    })

    it('disables TOSLink when currently enabled', async () => {
      mocks.expertModeRef.value = true
      mocks.getTOSLinkStatus
        .mockResolvedValueOnce({
          available: true,
          enabled: true,
          signalDetected: true,
          allowChange: true,
          requiresDSP: true,
          sensitivity: 'medium',
        })
        .mockResolvedValueOnce({
          available: true,
          enabled: false,
          signalDetected: false,
          allowChange: true,
          requiresDSP: true,
          sensitivity: 'medium',
        })

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('[data-name="TOSLink"] .toggle-btn').trigger('click')
      await new Promise((resolve) => setTimeout(resolve, 120))
      await flushPromises()

      expect(mocks.disableTOSLink).toHaveBeenCalledTimes(1)
      expect(mocks.enableTOSLink).not.toHaveBeenCalled()
    })

    it('logs refresh errors after TOSLink toggle when status refresh fails', async () => {
      mocks.expertModeRef.value = true
      mocks.getTOSLinkStatus
        .mockResolvedValueOnce({
          available: true,
          enabled: false,
          signalDetected: false,
          allowChange: true,
          requiresDSP: true,
          sensitivity: 'medium',
        })
        .mockRejectedValueOnce(new Error('refresh failed'))

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('[data-name="TOSLink"] .toggle-btn').trigger('click')
      await new Promise((resolve) => setTimeout(resolve, 120))
      await flushPromises()

      expect(mocks.enableTOSLink).toHaveBeenCalledTimes(1)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to refresh status for alsa-toslink:', expect.any(Error))
    })

    it('logs non-Error TOSLink toggle failures even when refresh clears transient error state', async () => {
      mocks.expertModeRef.value = true
      mocks.getTOSLinkStatus
        .mockResolvedValueOnce({
          available: true,
          enabled: false,
          signalDetected: false,
          allowChange: true,
          requiresDSP: true,
          sensitivity: 'medium',
        })
        .mockResolvedValueOnce({
          available: true,
          enabled: false,
          signalDetected: false,
          allowChange: true,
          requiresDSP: true,
          sensitivity: 'medium',
        })
      mocks.enableTOSLink.mockRejectedValueOnce('raw failure')

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('[data-name="TOSLink"] .toggle-btn').trigger('click')
      await new Promise((resolve) => setTimeout(resolve, 120))
      await flushPromises()

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to toggle TOSLink:', 'raw failure')
      expect(mocks.getTOSLinkStatus).toHaveBeenCalledTimes(2)
    })

    it('saves TOSLink sensitivity successfully and closes config section', async () => {
      mocks.expertModeRef.value = true
      mocks.getTOSLinkStatus.mockResolvedValueOnce({
        available: true,
        enabled: true,
        signalDetected: true,
        allowChange: true,
        requiresDSP: true,
        sensitivity: 'medium',
      })

      const wrapper = mountView()
      await flushPromises()

      const toslinkCard = () => wrapper.get('[data-name="TOSLink"]')

      await toslinkCard().get('.toggle-config-btn').trigger('click')
      await flushPromises()
      expect(toslinkCard().attributes('data-expanded')).toBe('yes')

      await toslinkCard().get('.update-toslink-btn').trigger('click')
      await toslinkCard().get('.save-config-btn').trigger('click')
      await flushPromises()

      expect(mocks.setTOSLinkSensitivity).toHaveBeenCalledWith('high')
      expect(toslinkCard().attributes('data-expanded')).toBe('no')
      expect(consoleLogSpy).toHaveBeenCalledWith('TOSLink sensitivity saved successfully: high')
      expect(consoleLogSpy).toHaveBeenCalledWith('Configuration saved for TOSLink')
    })

    it('treats Airplay update as no-op when the card has non-object config', async () => {
      mocks.expertModeRef.value = true
      mocks.getExternalPlayers.mockResolvedValueOnce([
        {
          name: 'Airplay',
          provided_by: 'community-airplay',
          systemd_service: 'airplay-player',
          icon_url: '/icons/airplay.svg',
          allow_change: true,
          maintainer_name: 'Air Team',
          maintainer_url: 'https://example.com/airplay',
          settings: [],
        },
      ])
      mocks.serviceExistenceByName['airplay-player'] = true
      mocks.serviceStatusByName['airplay-player'] = {
        active: 'inactive',
        enabled: 'disabled',
        allowed_operations: ['start', 'stop', 'enable', 'disable'],
      }

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('[data-name="Airplay"] .update-airplay-btn').trigger('click')
      await flushPromises()

      expect(consoleLogSpy).not.toHaveBeenCalledWith('Airplay version updated to 2')
      expect(wrapper.get('[data-name="Airplay"] .player-name').text()).toBe('Airplay')
    })

    it('accepts update-airplay event from non-Airplay cards as a no-op', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('[data-name="Roon"] .update-airplay-btn').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-name="Roon"] .player-name').text()).toBe('Roon')
    })
  })
})
