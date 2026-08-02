import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  listExtensions,
  getExtension,
  installExtension,
  uninstallExtension,
  refreshExtensions,
  getExtensionJob,
  listExtensionSources,
  addExtensionSource,
  removeExtensionSource,
  listGithubSources,
  addGithubSource,
  removeGithubSource,
  TERMINAL_PHASES,
  type Extension,
  type ExtensionJob,
  type ExtensionSource,
  type ExtensionSourceInput,
  type GithubSource,
  type ExtensionsApiResponse,
  type ExtensionsApiAck,
} from '@/api/extensions'
import * as httpApi from '@/api/http'
import { useAppConfigStore } from '@/stores/appconfig'

// Mock dependencies
vi.mock('@/api/http', () => ({
  apiFetch: vi.fn(),
}))

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: vi.fn(() => ({
    getConfigApiBaseUrl: vi.fn(() => 'http://localhost:8080/api'),
  })),
}))

describe('Extensions API', () => {
  let mockApiFetch: typeof httpApi.apiFetch
  let mockConfigStore: ReturnType<typeof useAppConfigStore>

  beforeEach(() => {
    mockApiFetch = httpApi.apiFetch as typeof httpApi.apiFetch
    mockConfigStore = useAppConfigStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Type exports and constants', () => {
    it('should export TERMINAL_PHASES correctly', () => {
      expect(TERMINAL_PHASES).toEqual(['done', 'failed'])
      expect(TERMINAL_PHASES).toHaveLength(2)
    })

    it('should have correct terminal phases', () => {
      TERMINAL_PHASES.forEach(phase => {
        expect(['done', 'failed']).toContain(phase)
      })
    })
  })

  describe('listExtensions', () => {
    it('should fetch and return list of extensions', async () => {
      const mockExtension: Extension = {
        package: 'test-extension',
        name: 'Test Extension',
        category: 'player',
        summary: 'A test extension',
        description: 'A test extension for unit tests',
        version: '1.0.0',
        installed_version: null,
        state: 'available',
        needs_reboot: 'no',
        icon_url: 'http://example.com/icon.png',
        source: 'apt',
      }

      const mockResponse: ExtensionsApiResponse<{ extensions: Extension[] }> = {
        status: 'success',
        count: 1,
        data: { extensions: [mockExtension] },
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await listExtensions()

      expect(result.status).toBe('success')
      expect(result.data.extensions).toHaveLength(1)
      expect(result.data.extensions[0].package).toBe('test-extension')
      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/extensions',
        undefined
      )
    })

    it('should return empty extensions list', async () => {
      const mockResponse: ExtensionsApiResponse<{ extensions: Extension[] }> = {
        status: 'success',
        count: 0,
        data: { extensions: [] },
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await listExtensions()

      expect(result.data.extensions).toHaveLength(0)
    })

    it('should throw error on HTTP failure with server message', async () => {
      const mockFetchResponse = new Response(
        JSON.stringify({
          status: 'error',
          message: 'Database connection failed',
        }),
        {
          status: 500,
          statusText: 'Internal Server Error',
          headers: { 'Content-Type': 'application/json' },
        }
      )
      mockFetchResponse.ok = false

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await expect(listExtensions()).rejects.toThrow(
        'Extensions API request failed: Database connection failed'
      )
    })

    it('should throw error with status code when server message unavailable', async () => {
      const mockFetchResponse = new Response('Internal Server Error', {
        status: 500,
        statusText: 'Internal Server Error',
      })
      mockFetchResponse.ok = false

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await expect(listExtensions()).rejects.toThrow(
        'Extensions API request failed: 500'
      )
    })

    it('should throw error with malformed JSON response', async () => {
      const mockFetchResponse = new Response('Not JSON content', {
        status: 400,
        statusText: 'Bad Request',
      })
      mockFetchResponse.ok = false

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await expect(listExtensions()).rejects.toThrow(
        'Extensions API request failed: 400'
      )
    })
  })

  describe('getExtension', () => {
    it('should fetch a single extension by package name', async () => {
      const mockExtension: Extension = {
        package: 'test-extension',
        name: 'Test Extension',
        category: 'dsp',
        summary: 'A DSP extension',
        description: 'Detailed DSP extension',
        version: '2.0.0',
        installed_version: '1.5.0',
        state: 'upgradable',
        needs_reboot: 'maybe',
        icon_url: null,
        source: 'github:owner/repo',
      }

      const mockResponse: ExtensionsApiResponse<Extension> = {
        status: 'success',
        data: mockExtension,
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await getExtension('test-extension')

      expect(result.data.package).toBe('test-extension')
      expect(result.data.state).toBe('upgradable')
      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/extensions/test-extension',
        undefined
      )
    })

    it('should handle package names with special characters via encodeURIComponent', async () => {
      const mockExtension: Extension = {
        package: 'test/extension:special',
        name: 'Special Extension',
        category: 'tool',
        summary: 'Special extension',
        description: 'Extension with special chars',
        version: '1.0.0',
        installed_version: null,
        state: 'available',
        needs_reboot: 'no',
        icon_url: null,
        source: 'apt',
      }

      const mockResponse: ExtensionsApiResponse<Extension> = {
        status: 'success',
        data: mockExtension,
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await getExtension('test/extension:special')

      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/extensions/test%2Fextension%3Aspecial',
        undefined
      )
    })

    it('should throw error when extension not found', async () => {
      const mockFetchResponse = new Response(
        JSON.stringify({
          status: 'error',
          message: 'Extension not found',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
      mockFetchResponse.ok = false

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await expect(getExtension('nonexistent')).rejects.toThrow(
        'Extensions API request failed: Extension not found'
      )
    })
  })

  describe('installExtension', () => {
    it('should install an extension and return job info', async () => {
      const mockJob: ExtensionJob = {
        id: 'job-123',
        package: 'test-extension',
        action: 'install',
        phase: 'queued',
        percent: 0,
        exit_code: null,
        error: null,
        started_at: Date.now(),
        finished_at: null,
        log: [],
      }

      const mockResponse: ExtensionsApiResponse<{ job: ExtensionJob }> = {
        status: 'success',
        data: { job: mockJob },
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await installExtension('test-extension')

      expect(result.data.job.action).toBe('install')
      expect(result.data.job.phase).toBe('queued')
      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/extensions/test-extension/install',
        { method: 'POST' }
      )
    })

    it('should throw error when installation fails', async () => {
      const mockFetchResponse = new Response(
        JSON.stringify({
          status: 'error',
          message: 'Installation already in progress',
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      )
      mockFetchResponse.ok = false

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await expect(installExtension('test-extension')).rejects.toThrow(
        'Extensions API request failed: Installation already in progress'
      )
    })
  })

  describe('uninstallExtension', () => {
    it('should uninstall an extension and return job info', async () => {
      const mockJob: ExtensionJob = {
        id: 'job-456',
        package: 'test-extension',
        action: 'uninstall',
        phase: 'queued',
        percent: 0,
        exit_code: null,
        error: null,
        started_at: Date.now(),
        finished_at: null,
        log: [],
      }

      const mockResponse: ExtensionsApiResponse<{ job: ExtensionJob }> = {
        status: 'success',
        data: { job: mockJob },
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await uninstallExtension('test-extension')

      expect(result.data.job.action).toBe('uninstall')
      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/extensions/test-extension/uninstall',
        { method: 'POST' }
      )
    })
  })

  describe('refreshExtensions', () => {
    it('should refresh extensions and return job info', async () => {
      const mockJob: ExtensionJob = {
        id: 'job-789',
        package: null,
        action: 'refresh',
        phase: 'downloading',
        percent: 25,
        exit_code: null,
        error: null,
        started_at: Date.now(),
        finished_at: null,
        log: ['Downloading extension list...'],
      }

      const mockResponse: ExtensionsApiResponse<{ job: ExtensionJob }> = {
        status: 'success',
        data: { job: mockJob },
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await refreshExtensions()

      expect(result.data.job.action).toBe('refresh')
      expect(result.data.job.package).toBeNull()
      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/extensions/refresh',
        { method: 'POST' }
      )
    })
  })

  describe('getExtensionJob', () => {
    it('should fetch job status with reboot requirement', async () => {
      const mockJob: ExtensionJob = {
        id: 'job-999',
        package: 'test-extension',
        action: 'install',
        phase: 'done',
        percent: 100,
        exit_code: 0,
        error: null,
        started_at: Date.now() - 5000,
        finished_at: Date.now(),
        log: ['Installation complete'],
      }

      const mockResponse: ExtensionsApiResponse<{
        job: ExtensionJob
        reboot_required: boolean
      }> = {
        status: 'success',
        data: {
          job: mockJob,
          reboot_required: true,
        },
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await getExtensionJob('job-999')

      expect(result.data.job.phase).toBe('done')
      expect(result.data.reboot_required).toBe(true)
      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/extensions/jobs/job-999',
        undefined
      )
    })

    it('should handle failed jobs', async () => {
      const mockJob: ExtensionJob = {
        id: 'job-fail',
        package: 'broken-extension',
        action: 'install',
        phase: 'failed',
        percent: 50,
        exit_code: 1,
        error: 'Installation script failed',
        started_at: Date.now() - 3000,
        finished_at: Date.now(),
        log: ['Starting installation', 'Error: dependency not found'],
      }

      const mockResponse: ExtensionsApiResponse<{
        job: ExtensionJob
        reboot_required: boolean
      }> = {
        status: 'success',
        data: {
          job: mockJob,
          reboot_required: false,
        },
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await getExtensionJob('job-fail')

      expect(result.data.job.phase).toBe('failed')
      expect(result.data.job.exit_code).toBe(1)
      expect(result.data.job.error).toBe('Installation script failed')
    })

    it('should encode job ID with special characters', async () => {
      const mockJob: ExtensionJob = {
        id: 'job/with:special',
        package: 'test',
        action: 'install',
        phase: 'done',
        percent: 100,
        exit_code: 0,
        error: null,
        started_at: Date.now(),
        finished_at: Date.now(),
        log: [],
      }

      const mockResponse: ExtensionsApiResponse<{
        job: ExtensionJob
        reboot_required: boolean
      }> = {
        status: 'success',
        data: {
          job: mockJob,
          reboot_required: false,
        },
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await getExtensionJob('job/with:special')

      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/extensions/jobs/job%2Fwith%3Aspecial',
        undefined
      )
    })
  })

  describe('Extension Source Management', () => {
    describe('listExtensionSources', () => {
      it('should fetch list of extension sources', async () => {
        const mockSource: ExtensionSource = {
          id: 'source-1',
          uri: 'deb http://example.com/deb',
          suite: 'focal',
          components: 'main',
          keyring: '/usr/share/keyrings/example.gpg',
        }

        const mockResponse: ExtensionsApiResponse<{ sources: ExtensionSource[] }> = {
          status: 'success',
          count: 1,
          data: { sources: [mockSource] },
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await listExtensionSources()

        expect(result.data.sources).toHaveLength(1)
        expect(result.data.sources[0].id).toBe('source-1')
      })

      it('should return empty sources list', async () => {
        const mockResponse: ExtensionsApiResponse<{ sources: ExtensionSource[] }> = {
          status: 'success',
          count: 0,
          data: { sources: [] },
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await listExtensionSources()

        expect(result.data.sources).toHaveLength(0)
      })
    })

    describe('addExtensionSource', () => {
      it('should add a new extension source', async () => {
        const input: ExtensionSourceInput = {
          id: 'new-source',
          uri: 'deb http://newrepo.com/deb',
          suite: 'jammy',
          components: 'main contrib',
          key: 'https://newrepo.com/key.gpg',
        }

        const mockSource: ExtensionSource = {
          id: 'new-source',
          uri: 'deb http://newrepo.com/deb',
          suite: 'jammy',
          components: 'main contrib',
          keyring: '/usr/share/keyrings/new-source.gpg',
        }

        const mockResponse: ExtensionsApiResponse<{ source: ExtensionSource }> = {
          status: 'success',
          data: { source: mockSource },
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await addExtensionSource(input)

        expect(result.data.source.id).toBe('new-source')
        expect(mockApiFetch).toHaveBeenCalledWith(
          'http://localhost:8080/api/extensions/sources',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          }
        )
      })

      it('should throw error when adding duplicate source', async () => {
        const input: ExtensionSourceInput = {
          id: 'duplicate',
          uri: 'deb http://example.com/deb',
          suite: 'focal',
          components: 'main',
          key: 'https://example.com/key.gpg',
        }

        const mockFetchResponse = new Response(
          JSON.stringify({
            status: 'error',
            message: 'Source with this ID already exists',
          }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          }
        )
        mockFetchResponse.ok = false

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await expect(addExtensionSource(input)).rejects.toThrow(
          'Extensions API request failed: Source with this ID already exists'
        )
      })
    })

    describe('removeExtensionSource', () => {
      it('should remove an extension source', async () => {
        const mockResponse: ExtensionsApiAck = {
          status: 'success',
          message: 'Source removed successfully',
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await removeExtensionSource('source-1')

        expect(result.status).toBe('success')
        expect(mockApiFetch).toHaveBeenCalledWith(
          'http://localhost:8080/api/extensions/sources/source-1',
          { method: 'DELETE' }
        )
      })

      it('should encode source ID with special characters', async () => {
        const mockResponse: ExtensionsApiAck = {
          status: 'success',
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await removeExtensionSource('source/with:special')

        expect(mockApiFetch).toHaveBeenCalledWith(
          'http://localhost:8080/api/extensions/sources/source%2Fwith%3Aspecial',
          { method: 'DELETE' }
        )
      })

      it('should throw error when source not found', async () => {
        const mockFetchResponse = new Response(
          JSON.stringify({
            status: 'error',
            message: 'Source not found',
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        )
        mockFetchResponse.ok = false

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await expect(removeExtensionSource('nonexistent')).rejects.toThrow(
          'Extensions API request failed: Source not found'
        )
      })
    })
  })

  describe('GitHub Source Management', () => {
    describe('listGithubSources', () => {
      it('should fetch list of GitHub sources', async () => {
        const mockSource: GithubSource = {
          id: 'gh-1',
          repo: 'owner/repo',
        }

        const mockResponse: ExtensionsApiResponse<{ sources: GithubSource[] }> = {
          status: 'success',
          count: 1,
          data: { sources: [mockSource] },
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await listGithubSources()

        expect(result.data.sources).toHaveLength(1)
        expect(result.data.sources[0].repo).toBe('owner/repo')
      })
    })

    describe('addGithubSource', () => {
      it('should add a new GitHub source', async () => {
        const mockSource: GithubSource = {
          id: 'gh-new',
          repo: 'neworga/newrepo',
        }

        const mockResponse: ExtensionsApiResponse<{ source: GithubSource }> = {
          status: 'success',
          data: { source: mockSource },
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await addGithubSource('neworga/newrepo')

        expect(result.data.source.repo).toBe('neworga/newrepo')
        expect(mockApiFetch).toHaveBeenCalledWith(
          'http://localhost:8080/api/extensions/github-sources',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repo: 'neworga/newrepo' }),
          }
        )
      })
    })

    describe('removeGithubSource', () => {
      it('should remove a GitHub source', async () => {
        const mockResponse: ExtensionsApiAck = {
          status: 'success',
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await removeGithubSource('gh-1')

        expect(result.status).toBe('success')
        expect(mockApiFetch).toHaveBeenCalledWith(
          'http://localhost:8080/api/extensions/github-sources/gh-1',
          { method: 'DELETE' }
        )
      })

      it('should encode GitHub source ID with special characters', async () => {
        const mockResponse: ExtensionsApiAck = {
          status: 'success',
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await removeGithubSource('gh/with:special')

        expect(mockApiFetch).toHaveBeenCalledWith(
          'http://localhost:8080/api/extensions/github-sources/gh%2Fwith%3Aspecial',
          { method: 'DELETE' }
        )
      })
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle network errors', async () => {
      vi.mocked(mockApiFetch).mockRejectedValueOnce(new Error('Network error'))

      await expect(listExtensions()).rejects.toThrow('Network error')
    })

    it('should handle response.json() parsing errors gracefully', async () => {
      const mockFetchResponse = new Response('Invalid JSON {{{', {
        status: 400,
      })
      mockFetchResponse.ok = false
      mockFetchResponse.json = vi.fn().mockRejectedValue(new SyntaxError('JSON parse error'))

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await expect(listExtensions()).rejects.toThrow(
        'Extensions API request failed: 400'
      )
    })

    it('should handle null message in error response', async () => {
      const mockFetchResponse = new Response(
        JSON.stringify({
          status: 'error',
          message: null,
        }),
        {
          status: 500,
        }
      )
      mockFetchResponse.ok = false

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await expect(listExtensions()).rejects.toThrow(
        'Extensions API request failed: 500'
      )
    })

    it('should handle empty message in error response', async () => {
      const mockFetchResponse = new Response(
        JSON.stringify({
          status: 'error',
          message: '',
        }),
        {
          status: 400,
        }
      )
      mockFetchResponse.ok = false

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      // Empty message should not override the status code
      await expect(listExtensions()).rejects.toThrow(
        'Extensions API request failed: 400'
      )
    })
  })

  describe('Request composition', () => {
    it('should properly construct POST requests with JSON body', async () => {
      const input: ExtensionSourceInput = {
        id: 'test-id',
        uri: 'deb http://test.com',
        suite: 'focal',
        components: 'main',
        key: 'http://test.com/key.gpg',
      }

      const mockResponse: ExtensionsApiResponse<{ source: ExtensionSource }> = {
        status: 'success',
        data: {
          source: {
            id: 'test-id',
            uri: 'deb http://test.com',
            suite: 'focal',
            components: 'main',
            keyring: '/path/to/keyring',
          },
        },
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await addExtensionSource(input)

      const callArgs = vi.mocked(mockApiFetch).mock.calls[0]
      expect(callArgs[0]).toContain('/extensions/sources')
      expect(callArgs[1]).toEqual({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    })

    it('should properly construct DELETE requests without body', async () => {
      const mockResponse: ExtensionsApiAck = { status: 'success' }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await removeExtensionSource('source-1')

      const callArgs = vi.mocked(mockApiFetch).mock.calls[0]
      expect(callArgs[1]).toEqual({ method: 'DELETE' })
    })
  })
})
