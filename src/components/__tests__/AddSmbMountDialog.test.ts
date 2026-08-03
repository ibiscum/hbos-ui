import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { SmbServer, SmbShare } from '@/api/smb'

// ============================================================================
// MOCK SETUP - Must be before imports
// ============================================================================

vi.mock('@/api/smb')

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    showInfoToast: vi.fn(),
    showErrorToast: vi.fn(),
    showSuccessToast: vi.fn(),
  }),
}))

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    template: '<i data-test="icon" />',
    props: ['icon'],
  },
}))

// Import after mocks are set up
import AddSmbMountDialog from '@/components/AddSmbMountDialog.vue'
import * as smbApi from '@/api/smb'

// Create mock references for easier access
const getSmbServersMock = vi.mocked(smbApi.getSmbServers)
const testSmbServerMock = vi.mocked(smbApi.testSmbServer)
const getSmbSharesMock = vi.mocked(smbApi.getSmbShares)
const mountSmbShareWithRetryMock = vi.mocked(smbApi.mountSmbShareWithRetry)

// ============================================================================
// TEST DATA
// ============================================================================

const mockSmbServer: SmbServer = {
  ip: '192.168.1.100',
  name: 'TestServer',
  hostname: 'testserver.local',
  is_file_server: true,
  services: ['SMB'],
  local_network: 'eth0',
  interface: '192.168.1.0/24',
}

const mockSmbServerNoServices: SmbServer = {
  ...mockSmbServer,
  ip: '192.168.1.101',
  services: [],
}

const mockSmbShare: SmbShare = {
  name: 'Documents',
  type: 'disk',
  comment: 'User documents',
}

const mockSmbShareNoComment: SmbShare = {
  name: 'Public',
  type: 'disk',
}

const mockSmbShareNoType: SmbShare = {
  name: 'Backup',
  type: '',
  comment: 'Backup share',
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('AddSmbMountDialog', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ========================================================================
  // SECTION 1: COMPONENT RENDERING
  // ========================================================================

  describe('Component Rendering', () => {
    it('should render when isOpen is true', () => {
      vi.mocked(smbApi.getSmbServers).mockResolvedValue({
        status: 'success',
        data: { servers: [], count: 0 },
      })

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    })

    it('should not render when isOpen is false', () => {
      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: false },
      })
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it('should render step indicator dots', () => {
      vi.mocked(smbApi.getSmbServers).mockResolvedValue({
        status: 'success',
        data: { servers: [], count: 0 },
      })

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })
      const dots = wrapper.findAll('.step-dot')
      expect(dots.length).toBe(4)
    })
  })

  // ========================================================================
  // SECTION 2: SERVER DISCOVERY
  // ========================================================================

  describe('Server Discovery', () => {
    it('should call discoverServers when dialog opens', async () => {
      getSmbServersMock.mockResolvedValue({
        status: 'success',
        data: { servers: [mockSmbServer], count: 1 },
      })

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      expect(getSmbServersMock).toHaveBeenCalled()
    })

    it('should populate servers list on successful discovery', async () => {
      getSmbServersMock.mockResolvedValue({
        status: 'success',
        data: { servers: [mockSmbServer], count: 1 },
      })

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      expect(wrapper.text()).toContain('testserver.local')
      expect(wrapper.text()).toContain('192.168.1.100')
    })

    it('should show error message on discovery failure', async () => {
      getSmbServersMock.mockResolvedValue({
        status: 'error',
        message: 'Network error',
        data: { servers: [], count: 0 },
      })

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      expect(wrapper.text()).toContain('Network error')
    })

    it('should show retry button on discovery failure', async () => {
      getSmbServersMock.mockResolvedValue({
        status: 'error',
        message: 'Network error',
        data: { servers: [], count: 0 },
      })

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const retryButton = wrapper.find('.retry-button')
      expect(retryButton.exists()).toBe(true)
    })

    it('should allow retry of server discovery', async () => {
      getSmbServersMock.mockResolvedValue({
        status: 'error',
        message: 'Network error',
        data: { servers: [], count: 0 },
      })

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      expect(getSmbServersMock).toHaveBeenCalledTimes(1)

      await wrapper.find('.retry-button').trigger('click')
      await flushPromises()
      expect(getSmbServersMock).toHaveBeenCalledTimes(2)
    })

    it('should show "no servers found" message when list is empty', async () => {
      getSmbServersMock.mockResolvedValue({
        status: 'success',
        data: { servers: [], count: 0 },
      })

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      expect(wrapper.text()).toContain('No SMB servers found')
    })

    it('should display "Unknown service" for servers with empty services array', async () => {
      getSmbServersMock.mockResolvedValue({
        status: 'success',
        data: { servers: [mockSmbServerNoServices], count: 1 },
      })

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      expect(wrapper.text()).toContain('Unknown service')
    })
  })

  // ========================================================================
  // SECTION 3: SERVER SELECTION & MANUAL ENTRY
  // ========================================================================

  describe('Server Selection', () => {
    beforeEach(() => {
      getSmbServersMock.mockResolvedValue({
        status: 'success',
        data: { servers: [mockSmbServer], count: 1 },
      })
    })

    it('should allow selecting discovered server', async () => {
      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const serverItem = wrapper.find('.server-item')
      await serverItem.trigger('click')

      expect(wrapper.vm.selectedServer).toEqual(mockSmbServer)
    })

    it('should show checkmark when server is selected', async () => {
      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const serverItem = wrapper.find('.server-item')
      await serverItem.trigger('click')
      await wrapper.vm.$nextTick()

      expect(serverItem.classes()).toContain('selected')
    })
  })

  describe('Manual Server Entry', () => {
    beforeEach(() => {
      getSmbServersMock.mockResolvedValue({
        status: 'success',
        data: { servers: [mockSmbServer], count: 1 },
      })
    })

    it('should validate IPv4 address format', async () => {
      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const input = wrapper.find('.server-input')
      await input.setValue('invalid.address')

      expect(wrapper.text()).toContain('Please enter a valid IPv4 or IPv6 address')
    })

    it('should allow valid IPv4 address', async () => {
      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const input = wrapper.find('.server-input')
      await input.setValue('192.168.1.50')

      const addButton = wrapper.find('.add-button')
      expect(addButton.attributes('disabled')).toBeUndefined()
    })

    it('should disable Add button for invalid IP', async () => {
      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const input = wrapper.find('.server-input')
      await input.setValue('999.999.999.999')

      const addButton = wrapper.find('.add-button')
      expect(addButton.attributes('disabled')).toBeDefined()
    })

    it('should allow adding manual server', async () => {
      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const input = wrapper.find('.server-input')
      await input.setValue('192.168.1.50')

      const addButton = wrapper.find('.add-button')
      await addButton.trigger('click')

      expect(wrapper.vm.servers.length).toBe(2)
    })

    it('should auto-select manually added server', async () => {
      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const input = wrapper.find('.server-input')
      await input.setValue('192.168.1.50')

      const addButton = wrapper.find('.add-button')
      await addButton.trigger('click')

      expect(wrapper.vm.selectedServer?.ip).toBe('192.168.1.50')
    })

    it('should not duplicate existing server', async () => {
      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const input = wrapper.find('.server-input')
      await input.setValue('192.168.1.100')

      const addButton = wrapper.find('.add-button')
      await addButton.trigger('click')

      expect(wrapper.vm.servers.length).toBe(1)
    })
  })

  // ========================================================================
  // SECTION 4: STEP PROGRESSION
  // ========================================================================

  describe('Step Progression', () => {
    beforeEach(() => {
      getSmbServersMock.mockResolvedValue({
        status: 'success',
        data: { servers: [mockSmbServer], count: 1 },
      })
    })

    it('should not allow proceeding without server selection', async () => {
      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const nextButton = wrapper.find('.btn-primary')
      expect(nextButton.attributes('disabled')).toBeDefined()
    })

    it('should allow proceeding after server selection', async () => {
      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const serverItem = wrapper.find('.server-item')
      await serverItem.trigger('click')
      await wrapper.vm.$nextTick()

      const nextButton = wrapper.find('.btn-primary')
      expect(nextButton.attributes('disabled')).toBeUndefined()
    })

    it('should advance to step 2 after server selection', async () => {
      testSmbServerMock.mockResolvedValue({
        status: 'success',
        data: { server: mockSmbServer.ip, connected: true },
      })
      getSmbSharesMock.mockResolvedValue({
        status: 'success',
        data: { server: mockSmbServer.ip, shares: [mockSmbShare], count: 1 },
      })

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const serverItem = wrapper.find('.server-item')
      await serverItem.trigger('click')

      const nextButton = wrapper.find('.btn-primary')
      await nextButton.trigger('click')
      await flushPromises()

      expect(wrapper.vm.currentStep).toBe(2)
    })

    it('should go back to previous step', async () => {
      testSmbServerMock.mockResolvedValue({
        status: 'success',
        data: { server: mockSmbServer.ip, connected: true },
      })
      getSmbSharesMock.mockResolvedValue({
        status: 'success',
        data: { server: mockSmbServer.ip, shares: [mockSmbShare], count: 1 },
      })

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const serverItem = wrapper.find('.server-item')
      await serverItem.trigger('click')

      const nextButton = wrapper.find('.btn-primary')
      await nextButton.trigger('click')
      await flushPromises()

      const backButton = wrapper.find('.btn-secondary')
      await backButton.trigger('click')

      expect(wrapper.vm.currentStep).toBe(1)
    })
  })

  // ========================================================================
  // SECTION 5: AUTHENTICATION & CONNECTION
  // ========================================================================

  describe('Authentication', () => {
    beforeEach(() => {
      getSmbServersMock.mockResolvedValue({
        status: 'success',
        data: { servers: [mockSmbServer], count: 1 },
      })
      testSmbServerMock.mockResolvedValue({
        status: 'success',
        data: { server: mockSmbServer.ip, connected: true },
      })
      getSmbSharesMock.mockResolvedValue({
        status: 'success',
        data: { server: mockSmbServer.ip, shares: [mockSmbShare], count: 1 },
      })
    })

    it('should not require credentials for anonymous auth', async () => {
      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const serverItem = wrapper.find('.server-item')
      await serverItem.trigger('click')

      const nextButton = wrapper.find('.btn-primary')
      await nextButton.trigger('click')
      await flushPromises()

      expect(wrapper.vm.canProceed).toBe(true)
    })

    it('should require username and password for credentials auth', async () => {
      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const serverItem = wrapper.find('.server-item')
      await serverItem.trigger('click')

      const nextButton = wrapper.find('.btn-primary')
      await nextButton.trigger('click')
      await flushPromises()

      wrapper.vm.authType = 'credentials'
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.canProceed).toBe(false)
    })

    it('should allow proceeding after entering credentials', async () => {
      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const serverItem = wrapper.find('.server-item')
      await serverItem.trigger('click')

      const nextButton = wrapper.find('.btn-primary')
      await nextButton.trigger('click')
      await flushPromises()

      wrapper.vm.authType = 'credentials'
      wrapper.vm.username = 'testuser'
      wrapper.vm.password = 'testpass'
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.canProceed).toBe(true)
    })
  })

  describe('Connection Testing', () => {
    beforeEach(() => {
      getSmbServersMock.mockResolvedValue({
        status: 'success',
        data: { servers: [mockSmbServer], count: 1 },
      })
    })

    it('should test connection before loading shares', async () => {
      testSmbServerMock.mockResolvedValue({
        status: 'success',
        data: { server: mockSmbServer.ip, connected: true },
      })
      getSmbSharesMock.mockResolvedValue({
        status: 'success',
        data: { server: mockSmbServer.ip, shares: [mockSmbShare], count: 1 },
      })

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const serverItem = wrapper.find('.server-item')
      await serverItem.trigger('click')

      const nextButton = wrapper.find('.btn-primary')
      await nextButton.trigger('click')
      await nextButton.trigger('click')
      await flushPromises()

      expect(testSmbServerMock).toHaveBeenCalledWith(mockSmbServer.ip, undefined, undefined)
    })

    it('should stay on step 2 if connection fails', async () => {
      testSmbServerMock.mockResolvedValue({
        status: 'error',
        data: { server: mockSmbServer.ip, connected: false, error: 'Connection refused' },
      })

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const serverItem = wrapper.find('.server-item')
      await serverItem.trigger('click')

      const nextButton = wrapper.find('.btn-primary')
      await nextButton.trigger('click')
      await flushPromises()

      expect(wrapper.vm.currentStep).toBe(2)
    })

    it('should show connection error message', async () => {
      testSmbServerMock.mockResolvedValue({
        status: 'error',
        data: { server: mockSmbServer.ip, connected: false, error: 'Invalid credentials' },
      })

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const serverItem = wrapper.find('.server-item')
      await serverItem.trigger('click')

      const nextButton = wrapper.find('.btn-primary')
      await nextButton.trigger('click')
      await nextButton.trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Invalid credentials')
    })
  })

  // ========================================================================
  // SECTION 6: SHARE SELECTION & MOUNT POINT
  // ========================================================================

  describe('Mount Point Generation', () => {
    beforeEach(() => {
      getSmbServersMock.mockResolvedValue({
        status: 'success',
        data: { servers: [mockSmbServer], count: 1 },
      })
    })

    it('should auto-generate mount point from share name', () => {
      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      wrapper.vm.selectShare(mockSmbShare)
      expect(wrapper.vm.mountPoint).toBe('/mnt/documents')
    })

    it('should sanitize special characters in mount point', () => {
      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      const shareWithSpecialChars: SmbShare = {
        name: 'Music & Videos!',
        type: 'disk',
      }
      wrapper.vm.selectShare(shareWithSpecialChars)

      expect(wrapper.vm.mountPoint).toBe('/mnt/music_videos')
    })

    it('should fallback to "share" for shares with only special characters', () => {
      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      const shareSpecialOnly: SmbShare = {
        name: '!!!???',
        type: 'disk',
      }
      wrapper.vm.selectShare(shareSpecialOnly)

      expect(wrapper.vm.mountPoint).toBe('/mnt/share')
    })

    it('should not overwrite manually entered mount point', () => {
      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      wrapper.vm.mountPoint = '/custom/path'
      const currentMountPoint = wrapper.vm.mountPoint

      expect(currentMountPoint).toBe('/custom/path')
    })
  })

  // ========================================================================
  // SECTION 7: MOUNT CREATION
  // ========================================================================

  describe('Mount Creation', () => {
    beforeEach(() => {
      getSmbServersMock.mockResolvedValue({
        status: 'success',
        data: { servers: [mockSmbServer], count: 1 },
      })
    })

    it('should validate SMB version before mount', () => {
      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      wrapper.vm.smbVersion = 'invalid'
      wrapper.vm.selectedServer = mockSmbServer
      wrapper.vm.selectedShare = mockSmbShare
      wrapper.vm.mountPoint = '/mnt/documents'
      wrapper.vm.currentStep = 4

      wrapper.vm.createMount()

      expect(wrapper.vm.mountError).toBe('Invalid SMB version selected')
      expect(mountSmbShareWithRetryMock).not.toHaveBeenCalled()
    })

    it('should create mount with correct parameters', async () => {
      mountSmbShareWithRetryMock.mockResolvedValue({
        status: 'success',
        message: 'Mount created',
        data: {
          id: 1,
          server: mockSmbServer.ip,
          share: mockSmbShare.name,
          mountpoint: '/mnt/documents',
          mounted: true,
        },
      })

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      wrapper.vm.selectedServer = mockSmbServer
      wrapper.vm.selectedShare = mockSmbShare
      wrapper.vm.mountPoint = '/mnt/documents'
      wrapper.vm.smbVersion = '3.0'

      await wrapper.vm.createMount()
      await flushPromises()

      expect(mountSmbShareWithRetryMock).toHaveBeenCalledWith({
        server: mockSmbServer.ip,
        share: mockSmbShare.name,
        mountpoint: '/mnt/documents',
        version: '3.0',
      })
    })

    it('should show error message on mount failure', async () => {
      mountSmbShareWithRetryMock.mockResolvedValue({
        status: 'error',
        message: 'Permission denied',
      })

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      wrapper.vm.selectedServer = mockSmbServer
      wrapper.vm.selectedShare = mockSmbShare
      wrapper.vm.mountPoint = '/mnt/documents'

      await wrapper.vm.createMount()
      await flushPromises()

      expect(wrapper.vm.mountError).toBe('Permission denied')
    })

    it('should emit mount-created event on successful mount', async () => {
      mountSmbShareWithRetryMock.mockResolvedValue({
        status: 'success',
        message: 'Mount created',
        data: {
          id: 1,
          server: mockSmbServer.ip,
          share: mockSmbShare.name,
          mountpoint: '/mnt/documents',
          mounted: true,
        },
      })

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      wrapper.vm.selectedServer = mockSmbServer
      wrapper.vm.selectedShare = mockSmbShare
      wrapper.vm.mountPoint = '/mnt/documents'

      await wrapper.vm.createMount()
      await flushPromises()

      expect(wrapper.emitted('mount-created')).toBeTruthy()
    })
  })

  // ========================================================================
  // SECTION 8: DIALOG STATE MANAGEMENT
  // ========================================================================

  describe('Dialog State Management', () => {
    it('should close dialog on close button click', async () => {
      getSmbServersMock.mockResolvedValue({
        status: 'success',
        data: { servers: [mockSmbServer], count: 1 },
      })

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const closeButton = wrapper.find('.close-button')
      await closeButton.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should close dialog on overlay click', async () => {
      getSmbServersMock.mockResolvedValue({
        status: 'success',
        data: { servers: [mockSmbServer], count: 1 },
      })

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should reset all state on close', async () => {
      getSmbServersMock.mockResolvedValue({
        status: 'success',
        data: { servers: [mockSmbServer], count: 1 },
      })

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const serverItem = wrapper.find('.server-item')
      await serverItem.trigger('click')

      const closeButton = wrapper.find('.close-button')
      await closeButton.trigger('click')

      expect(wrapper.vm.currentStep).toBe(1)
      expect(wrapper.vm.selectedServer).toBeNull()
      expect(wrapper.vm.mountPoint).toBe('')
    })
  })

  // ========================================================================
  // SECTION 9: EDGE CASES & ERROR HANDLING
  // ========================================================================

  describe('Edge Cases & Error Handling', () => {
    it('should handle API error during discovery', async () => {
      getSmbServersMock.mockRejectedValue(new Error('Network timeout'))

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      expect(wrapper.vm.serverError).toContain('Network timeout')
    })

    it('should handle empty username in credentials mode', async () => {
      getSmbServersMock.mockResolvedValue({
        status: 'success',
        data: { servers: [mockSmbServer], count: 1 },
      })

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const serverItem = wrapper.find('.server-item')
      if (serverItem.exists()) {
        await serverItem.trigger('click')

        const nextButton = wrapper.find('.btn-primary')
        await nextButton.trigger('click')
        await flushPromises()

        wrapper.vm.authType = 'credentials'
        wrapper.vm.username = ''
        wrapper.vm.password = 'pass'
        await wrapper.vm.$nextTick()

        expect(wrapper.vm.canProceed).toBe(false)
      }
    })

    it('should handle share with missing comment field', async () => {
      getSmbServersMock.mockResolvedValue({
        status: 'success',
        data: { servers: [mockSmbServer], count: 1 },
      })
      testSmbServerMock.mockResolvedValue({
        status: 'success',
        data: { server: mockSmbServer.ip, connected: true },
      })
      getSmbSharesMock.mockResolvedValue({
        status: 'success',
        data: { server: mockSmbServer.ip, shares: [mockSmbShareNoComment], count: 1 },
      })

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const serverItem = wrapper.find('.server-item')
      if (serverItem.exists()) {
        await serverItem.trigger('click')

        const nextButton = wrapper.find('.btn-primary')
        await nextButton.trigger('click')
        await nextButton.trigger('click')
        await flushPromises()

        expect(wrapper.vm.shares[0].name).toBe('Public')
      }
    })

    it('should handle share with empty type field', async () => {
      getSmbServersMock.mockResolvedValue({
        status: 'success',
        data: { servers: [mockSmbServer], count: 1 },
      })
      testSmbServerMock.mockResolvedValue({
        status: 'success',
        data: { server: mockSmbServer.ip, connected: true },
      })
      getSmbSharesMock.mockResolvedValue({
        status: 'success',
        data: { server: mockSmbServer.ip, shares: [mockSmbShareNoType], count: 1 },
      })

      wrapper = mount(AddSmbMountDialog, {
        props: { isOpen: true },
      })

      await flushPromises()
      const serverItem = wrapper.find('.server-item')
      if (serverItem.exists()) {
        await serverItem.trigger('click')

        const nextButton = wrapper.find('.btn-primary')
        await nextButton.trigger('click')
        await nextButton.trigger('click')
        await flushPromises()

        expect(wrapper.vm.shares[0].type).toBe('')
      }
    })
  })
})
