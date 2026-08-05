import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAppConfigStore } from '@/stores/appconfig'
import { apiFetch } from '@/api/http'
import {
  isApiError,
  getVersion,
  listEndpoints,
  listObjects,
  getObjectById,
  refreshCache,
  getAllProperties,
  getObjectProperties,
  listVolumes,
  getVolumeById,
  setVolumeById,
  saveAllVolumes,
  saveVolumeById,
  listLinks,
  createLink,
  removeLinkById,
  removeLinkByName,
  linkExists,
  listOutputPorts,
  listInputPorts,
  getGraphDot,
  getGraphPng,
  getSpeakerEQStructure,
  getSpeakerEQIO,
  getSpeakerEQConfig,
  getSpeakerEQStatus,
  getSpeakerEQBand,
  setSpeakerEQBand,
  setSpeakerEQBandEnabled,
  clearSpeakerEQBlock,
  getSpeakerEQMasterGain,
  setSpeakerEQMasterGain,
  getSpeakerEQInputGain,
  setSpeakerEQInputGain,
  getSpeakerEQOutputGain,
  setSpeakerEQOutputGain,
  getSpeakerEQDelays,
  setSpeakerEQDelay,
  getSpeakerEQCrossbar,
  setSpeakerEQCrossbarMatrix,
  setSpeakerEQCrossbar,
  getSpeakerEQEnabled,
  setSpeakerEQEnabled,
  refreshSpeakerEQCache,
  resetSpeakerEQToDefaults,
  getSpeakerEQLicense,
  getRIAAConfig,
  getRIAAGain,
  setRIAAGain,
  getRIAASubsonic,
  setRIAASubsonic,
  getRIAAEnabled,
  setRIAAEnabled,
  getRIAADeclick,
  setRIAADeclick,
  getRIAASpike,
  setRIAASpike,
  getRIAANotch,
  setRIAANotch,
  resetRIAAToDefaults,
} from '@/api/pipewire'

// Mock dependencies
vi.mock('@/stores/appconfig')
vi.mock('@/api/http')

describe('PipeWire API - Type Definitions', () => {
  it('should export isApiError function', () => {
    expect(typeof isApiError).toBe('function')
  })

  it('should identify API errors correctly', () => {
    expect(isApiError({ error: 'test', message: 'test message' })).toBe(true)
    expect(isApiError({ error: 'test' })).toBe(true)
    expect(isApiError({ success: true })).toBe(false)
    expect(isApiError(null)).toBe(false)
    expect(isApiError(undefined)).toBe(false)
    expect(isApiError({})).toBe(false)
  })

  it('should identify non-error responses', () => {
    expect(isApiError({ version: '1.0', endpoints: [] })).toBe(false)
    expect(isApiError({ objects: [] })).toBe(false)
    expect(isApiError({ links: [] })).toBe(false)
  })
})

describe('PipeWire API - Core API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAppConfigStore).mockReturnValue({
      config: {
        audiocontrol_api: {
          deviceIP: 'localhost',
          devicePort: 2716,
          useProxy: false,
        },
      },
    } as any)
  })

  describe('getVersion', () => {
    it('should fetch version info successfully', async () => {
      const mockVersion = { version: '2.0.9', api_version: '1.0' }
      vi.mocked(apiFetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockVersion), { status: 200 })
      )

      const result = await getVersion()
      expect(result).toEqual(mockVersion)
    })

    it('should handle version API errors', async () => {
      const mockError = { error: 'SERVICE_ERROR', message: 'Service unavailable' }
      vi.mocked(apiFetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockError), { status: 503 })
      )

      const result = await getVersion()
      expect(isApiError(result)).toBe(true)
      expect(result).toEqual(mockError)
    })

    it('should call apiFetch with correct URL', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ version: '1.0', api_version: '1.0' }), { status: 200 })
      )

      await getVersion()
      expect(apiFetch).toHaveBeenCalledWith(
        'http://localhost:2716/api/pipewire/v1/version',
        expect.any(Object)
      )
    })

    it('should use proxy base URL when useProxy is enabled', async () => {
      vi.mocked(useAppConfigStore).mockReturnValue({
        config: {
          audiocontrol_api: {
            deviceIP: '192.168.1.10',
            devicePort: 8080,
            useProxy: true,
          },
        },
      } as any)
      vi.mocked(apiFetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ version: '1.0', api_version: '1.0' }), { status: 200 })
      )

      await getVersion()

      expect(apiFetch).toHaveBeenCalledWith(
        `${window.location.origin}/api/pipewire/v1/version`,
        expect.any(Object)
      )
    })

    it('should omit port suffix when direct device port is 80', async () => {
      vi.mocked(useAppConfigStore).mockReturnValue({
        config: {
          audiocontrol_api: {
            deviceIP: '192.168.1.20',
            devicePort: 80,
            useProxy: false,
          },
        },
      } as any)
      vi.mocked(apiFetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ version: '1.0', api_version: '1.0' }), { status: 200 })
      )

      await getVersion()

      expect(apiFetch).toHaveBeenCalledWith(
        'http://192.168.1.20/api/pipewire/v1/version',
        expect.any(Object)
      )
    })
  })

  describe('listEndpoints', () => {
    it('should list all endpoints', async () => {
      const mockEndpoints = {
        version: '1.0',
        endpoints: [
          { path: '/version', methods: ['GET'], description: 'Get version' },
        ],
      }
      vi.mocked(apiFetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockEndpoints), { status: 200 })
      )

      const result = await listEndpoints()
      expect(result).toEqual(mockEndpoints)
      expect((result as any).endpoints).toBeDefined()
    })

    it('should handle empty endpoints list', async () => {
      const mockEndpoints = { version: '1.0', endpoints: [] }
      vi.mocked(apiFetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockEndpoints), { status: 200 })
      )

      const result = await listEndpoints()
      expect((result as any).endpoints).toEqual([])
    })
  })

  describe('listObjects', () => {
    it('should list all PipeWire objects', async () => {
      const mockObjects = {
        objects: [
          { id: 1, name: 'node1', type: 'device' },
          { id: 2, name: 'sink1', type: 'node' },
        ],
      }
      vi.mocked(apiFetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockObjects), { status: 200 })
      )

      const result = await listObjects()
      expect((result as any).objects).toHaveLength(2)
    })

    it('should call correct endpoint', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ objects: [] }), { status: 200 })
      )

      await listObjects()
      expect(apiFetch).toHaveBeenCalledWith(
        'http://localhost:2716/api/pipewire/v1/ls',
        expect.any(Object)
      )
    })
  })

  describe('getObjectById', () => {
    it('should get object by ID', async () => {
      const mockObject = { id: 42, name: 'test_node', type: 'node' }
      vi.mocked(apiFetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockObject), { status: 200 })
      )

      const result = await getObjectById(42)
      expect((result as any).id).toBe(42)
      expect((result as any).name).toBe('test_node')
    })

    it('should handle object not found', async () => {
      const mockError = { error: 'NOT_FOUND', message: 'Object not found' }
      vi.mocked(apiFetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockError), { status: 404 })
      )

      const result = await getObjectById(999)
      expect(isApiError(result)).toBe(true)
    })
  })

  describe('refreshCache', () => {
    it('should refresh cache with POST', async () => {
      const mockResponse = { status: 'success', message: 'Cache refreshed', object_count: 100 }
      vi.mocked(apiFetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      )

      const result = await refreshCache()
      expect((result as any).status).toBe('success')
    })

    it('should use POST method for refresh', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'success', message: '', object_count: 0 }), {
          status: 200,
        })
      )

      await refreshCache()
      const call = vi.mocked(apiFetch).mock.calls[0]
      expect(call[1]?.method).toBe('POST')
    })
  })

  describe('properties endpoints', () => {
    it('should list all object properties', async () => {
      const mockProperties = {
        objects: [
          {
            id: 5,
            name: 'sink-main',
            type: 'node',
            properties: { 'device.description': 'Main sink' },
          },
        ],
      }
      vi.mocked(apiFetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockProperties), { status: 200 })
      )

      const result = await getAllProperties()

      expect((result as any).objects).toHaveLength(1)
      expect(apiFetch).toHaveBeenCalledWith(
        'http://localhost:2716/api/pipewire/v1/properties',
        expect.any(Object)
      )
    })

    it('should fetch properties for a single object', async () => {
      const mockObjectProperties = {
        id: 7,
        name: 'capture-node',
        type: 'node',
        properties: { 'node.description': 'Capture node' },
      }
      vi.mocked(apiFetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockObjectProperties), { status: 200 })
      )

      const result = await getObjectProperties(7)

      expect((result as any).id).toBe(7)
      expect(apiFetch).toHaveBeenCalledWith(
        'http://localhost:2716/api/pipewire/v1/properties/7',
        expect.any(Object)
      )
    })
  })
})

describe('PipeWire API - Volume API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAppConfigStore).mockReturnValue({
      config: {
        audiocontrol_api: {
          deviceIP: 'localhost',
          devicePort: 2716,
          useProxy: false,
        },
      },
    } as any)
  })

  it('should list all volumes', async () => {
    const mockVolumes = [
      { id: 1, name: 'device1', object_type: 'device', volume: 80 },
      { id: 2, name: 'sink1', object_type: 'sink', volume: 75 },
    ]
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockVolumes), { status: 200 })
    )

    const result = await listVolumes()
    expect((result as any)).toHaveLength(2)
  })

  it('should get volume by ID', async () => {
    const mockVolume = { id: 5, name: 'speaker', object_type: 'sink', volume: 50 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockVolume), { status: 200 })
    )

    const result = await getVolumeById(5)
    expect((result as any).id).toBe(5)
    expect((result as any).volume).toBe(50)
  })

  it('should set volume by ID', async () => {
    const mockResponse = { volume: 65 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await setVolumeById(5, 65)
    expect((result as any).volume).toBe(65)
  })

  it('should use PUT method for setVolume', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ volume: 70 }), { status: 200 })
    )

    await setVolumeById(3, 70)
    const call = vi.mocked(apiFetch).mock.calls[0]
    expect(call[1]?.method).toBe('PUT')
    expect(call[1]?.body).toBe(JSON.stringify({ volume: 70 }))
  })

  it('should save all volumes', async () => {
    const mockResponse = { success: true, message: 'Volumes saved' }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await saveAllVolumes()
    expect((result as any).success).toBe(true)
  })

  it('should save volume by ID', async () => {
    const mockResponse = { success: true, message: 'Volume saved', id: 2, name: 'device2', volume: 80 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await saveVolumeById(2)
    expect((result as any).success).toBe(true)
    expect((result as any).id).toBe(2)
  })
})

describe('PipeWire API - Links API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAppConfigStore).mockReturnValue({
      config: {
        audiocontrol_api: {
          deviceIP: 'localhost',
          devicePort: 2716,
          useProxy: false,
        },
      },
    } as any)
  })

  it('should list links', async () => {
    const mockLinks = {
      links: [
        {
          id: 1,
          output_port_id: 10,
          output_port_name: 'output1',
          input_port_id: 20,
          input_port_name: 'input1',
        },
      ],
    }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockLinks), { status: 200 })
    )

    const result = await listLinks()
    expect((result as any).links).toHaveLength(1)
  })

  it('should create link', async () => {
    const mockResponse = { status: 'success', message: 'Link created', link_id: 5 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await createLink('output:port', 'input:port')
    expect((result as any).link_id).toBe(5)
  })

  it('should use POST method for createLink', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success', message: '', link_id: 1 }), {
        status: 200,
      })
    )

    await createLink('out', 'in')
    const call = vi.mocked(apiFetch).mock.calls[0]
    expect(call[1]?.method).toBe('POST')
    expect(call[1]?.body).toBe(JSON.stringify({ output: 'out', input: 'in' }))
  })

  it('should remove link by ID', async () => {
    const mockResponse = { status: 'success', message: 'Link removed', link_id: 5 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await removeLinkById(5)
    expect((result as any).status).toBe('success')
  })

  it('should use DELETE method for removeLinkById', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success', message: '' }), { status: 200 })
    )

    await removeLinkById(3)
    const call = vi.mocked(apiFetch).mock.calls[0]
    expect(call[1]?.method).toBe('DELETE')
  })

  it('should remove link by name', async () => {
    const mockResponse = { status: 'success', message: 'Link removed' }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await removeLinkByName('output:1', 'input:1')
    expect((result as any).status).toBe('success')
  })

  it('should check if link exists', async () => {
    const mockResponse = { exists: true, link_id: 42 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await linkExists('output:port', 'input:port')
    expect((result as any).exists).toBe(true)
    expect((result as any).link_id).toBe(42)
  })

  it('should include query parameters in linkExists', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ exists: false }), { status: 200 })
    )

    await linkExists('output:port', 'input:port')
    const url = vi.mocked(apiFetch).mock.calls[0][0]
    expect(url).toContain('/links/exists?')
    expect(url).toContain('output=output')
    expect(url).toContain('input=input')
  })

  it('should list output ports', async () => {
    const mockPorts = { ports: [{ id: 1, name: 'port1', node_name: 'node1', port_name: 'output' }] }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockPorts), { status: 200 })
    )

    const result = await listOutputPorts()
    expect((result as any).ports).toHaveLength(1)
  })

  it('should list input ports', async () => {
    const mockPorts = { ports: [{ id: 2, name: 'port2', node_name: 'node2', port_name: 'input' }] }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockPorts), { status: 200 })
    )

    const result = await listInputPorts()
    expect((result as any).ports).toHaveLength(1)
  })
})

describe('PipeWire API - Graph API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAppConfigStore).mockReturnValue({
      config: {
        audiocontrol_api: {
          deviceIP: 'localhost',
          devicePort: 2716,
          useProxy: false,
        },
      },
    } as any)
  })

  it('should get graph as DOT format', async () => {
    const dotContent = 'digraph { node1 -> node2; }'
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(dotContent, { status: 200 })
    )

    const result = await getGraphDot()
    expect(result).toBe(dotContent)
  })

  it('should call text() on response for DOT', async () => {
    const dotContent = 'digraph { }'
    const mockResponse = new Response(dotContent, { status: 200 })
    const textSpy = vi.spyOn(mockResponse, 'text')
    textSpy.mockResolvedValueOnce(dotContent)
    vi.mocked(apiFetch).mockResolvedValueOnce(mockResponse)

    await getGraphDot()
    expect(textSpy).toHaveBeenCalled()
  })

  it('should get graph as PNG', async () => {
    const pngData = new Blob(['fake png data'], { type: 'image/png' })
    const mockResponse = new Response(pngData, { status: 200 })
    const blobSpy = vi.spyOn(mockResponse, 'blob')
    blobSpy.mockResolvedValueOnce(pngData)
    vi.mocked(apiFetch).mockResolvedValueOnce(mockResponse)

    const result = await getGraphPng()
    expect(result).toEqual(pngData)
  })
})

describe('PipeWire API - SpeakerEQ API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAppConfigStore).mockReturnValue({
      config: {
        audiocontrol_api: {
          deviceIP: 'localhost',
          devicePort: 2716,
          useProxy: false,
        },
      },
    } as any)
  })

  it('should get SpeakerEQ structure', async () => {
    const mockStructure = { name: 'SpeakerEQ', version: '1.0', blocks: [], inputs: 2, outputs: 2, enabled: true, licensed: true }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockStructure), { status: 200 })
    )

    const result = await getSpeakerEQStructure()
    expect((result as any).name).toBe('SpeakerEQ')
  })

  it('should get SpeakerEQ IO', async () => {
    const mockIO = { inputs: 2, outputs: 2 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockIO), { status: 200 })
    )

    const result = await getSpeakerEQIO()
    expect((result as any).inputs).toBe(2)
    expect((result as any).outputs).toBe(2)
  })

  it('should get SpeakerEQ config', async () => {
    const mockConfig = { inputs: 2, outputs: 2, eq_slots: { slot1: 10 }, plugin_name: 'test', method: 'DSP' }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockConfig), { status: 200 })
    )

    const result = await getSpeakerEQConfig()
    expect((result as any).plugin_name).toBe('test')
  })

  it('should get SpeakerEQ status', async () => {
    const mockStatus = {
      enabled: true,
      master_gain_db: 0,
      crossbar: {},
      inputs: [],
      outputs: [],
    }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockStatus), { status: 200 })
    )

    const result = await getSpeakerEQStatus()
    expect((result as any).enabled).toBe(true)
  })

  it('should get EQ band', async () => {
    const mockBand = { band: 0, type: 'peaking', frequency: 1000, q: 1, gain: 0, block: 'eq1' }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockBand), { status: 200 })
    )

    const result = await getSpeakerEQBand('eq1', 0)
    expect((result as any).frequency).toBe(1000)
  })

  it('should set EQ band', async () => {
    const mockResponse = { success: true, block: 'eq1', band: 0, updated: { band: 0, type: 'peaking', frequency: 2000, q: 1, gain: 3 } }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await setSpeakerEQBand('eq1', 0, { frequency: 2000, gain: 3 })
    expect((result as any).success).toBe(true)
  })

  it('should use PUT for setSpeakerEQBand', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, block: '', band: 0, updated: {} }), {
        status: 200,
      })
    )

    await setSpeakerEQBand('eq1', 0, { gain: 5 })
    const call = vi.mocked(apiFetch).mock.calls[0]
    expect(call[1]?.method).toBe('PUT')
  })

  it('should set EQ band enabled', async () => {
    const mockResponse = { enabled: true }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await setSpeakerEQBandEnabled('eq1', 0, true)
    expect((result as any).enabled).toBe(true)
  })

  it('should clear EQ block', async () => {
    const mockResponse = { block: 'eq1', message: 'Block cleared' }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await clearSpeakerEQBlock('eq1')
    expect((result as any).block).toBe('eq1')
  })

  it('should use PUT for clearSpeakerEQBlock', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ block: '', message: '' }), { status: 200 })
    )

    await clearSpeakerEQBlock('eq1')
    const call = vi.mocked(apiFetch).mock.calls[0]
    expect(call[1]?.method).toBe('PUT')
    expect(call[1]?.body).toBe(JSON.stringify({}))
  })

  it('should get master gain', async () => {
    const mockGain = { gain: 0 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockGain), { status: 200 })
    )

    const result = await getSpeakerEQMasterGain()
    expect((result as any).gain).toBe(0)
  })

  it('should set master gain', async () => {
    const mockResponse = { success: true, gain: 3 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await setSpeakerEQMasterGain(3)
    expect((result as any).gain).toBe(3)
  })

  it('should get input gain', async () => {
    const mockGain = { gain: 0 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockGain), { status: 200 })
    )

    const result = await getSpeakerEQInputGain(0)
    expect((result as any).gain).toBe(0)
  })

  it('should set input gain', async () => {
    const mockResponse = { success: true, gain: 2 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await setSpeakerEQInputGain(0, 2)
    expect((result as any).gain).toBe(2)
  })

  it('should get output gain', async () => {
    const mockGain = { gain: 1 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockGain), { status: 200 })
    )

    const result = await getSpeakerEQOutputGain(0)
    expect((result as any).gain).toBe(1)
  })

  it('should set output gain', async () => {
    const mockResponse = { success: true, gain: -1 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await setSpeakerEQOutputGain(1, -1)
    expect((result as any).gain).toBe(-1)
  })

  it('should get delays', async () => {
    const mockDelays = { delays: [{ channel: 0, ms: 0 }, { channel: 1, ms: 0 }] }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockDelays), { status: 200 })
    )

    const result = await getSpeakerEQDelays()
    expect((result as any).delays).toHaveLength(2)
  })

  it('should set delay', async () => {
    const mockResponse = { success: true, channel: 0, ms: 5 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await setSpeakerEQDelay(0, 5)
    expect((result as any).ms).toBe(5)
  })

  it('should get crossbar matrix', async () => {
    const mockMatrix = { matrix: [[1, 0], [0, 1]] }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockMatrix), { status: 200 })
    )

    const result = await getSpeakerEQCrossbar()
    expect((result as any).matrix).toHaveLength(2)
  })

  it('should set crossbar matrix', async () => {
    const mockResponse = { matrix: [[1, 0], [0, 1]] }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await setSpeakerEQCrossbarMatrix([[1, 0], [0, 1]])
    expect((result as any).matrix).toBeDefined()
  })

  it('should set single crossbar value', async () => {
    const mockResponse = { success: true, input: 0, output: 1, value: 1 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await setSpeakerEQCrossbar(0, 1, 1)
    expect((result as any).value).toBe(1)
  })

  it('should get enable status', async () => {
    const mockStatus = { enabled: true, licensed: true }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockStatus), { status: 200 })
    )

    const result = await getSpeakerEQEnabled()
    expect((result as any).enabled).toBe(true)
  })

  it('should set enable status', async () => {
    const mockResponse = { success: true, enabled: false }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await setSpeakerEQEnabled(false)
    expect((result as any).enabled).toBe(false)
  })

  it('should refresh SpeakerEQ cache', async () => {
    const mockResponse = { message: 'Cache refreshed' }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await refreshSpeakerEQCache()
    expect((result as any).message).toBeDefined()
  })

  it('should use POST for refreshSpeakerEQCache', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: '' }), { status: 200 })
    )

    await refreshSpeakerEQCache()
    const call = vi.mocked(apiFetch).mock.calls[0]
    expect(call[1]?.method).toBe('POST')
  })

  it('should reset SpeakerEQ to defaults', async () => {
    const mockResponse = { status: 'success', message: 'Reset to defaults' }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await resetSpeakerEQToDefaults()
    expect((result as any).status).toBe('success')
  })

  it('should use POST for resetSpeakerEQToDefaults', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: '', message: '' }), { status: 200 })
    )

    await resetSpeakerEQToDefaults()
    const call = vi.mocked(apiFetch).mock.calls[0]
    expect(call[1]?.method).toBe('POST')
    expect(call[1]?.body).toBe(JSON.stringify({}))
  })

  it('should get license status', async () => {
    const mockResponse = { licensed: true }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await getSpeakerEQLicense()
    expect((result as any).licensed).toBe(true)
  })
})

describe('PipeWire API - RIAA API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAppConfigStore).mockReturnValue({
      config: {
        audiocontrol_api: {
          deviceIP: 'localhost',
          devicePort: 2716,
          useProxy: false,
        },
      },
    } as any)
  })

  it('should get RIAA config', async () => {
    const mockConfig = {
      gain_db: 0,
      subsonic_filter: 0,
      riaa_enable: true,
      declick_enable: true,
      spike_threshold_db: -30,
      spike_width_ms: 10,
      notch_filter_enable: false,
      notch_frequency_hz: 50,
      notch_q_factor: 1,
    }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockConfig), { status: 200 })
    )

    const result = await getRIAAConfig()
    expect((result as any).riaa_enable).toBe(true)
  })

  it('should get RIAA gain', async () => {
    const mockGain = { gain_db: 0 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockGain), { status: 200 })
    )

    const result = await getRIAAGain()
    expect((result as any).gain_db).toBe(0)
  })

  it('should set RIAA gain', async () => {
    const mockResponse = { success: true, gain_db: 3 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await setRIAAGain(3)
    expect((result as any).gain_db).toBe(3)
  })

  it('should use PUT for setRIAAGain', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, gain_db: 0 }), { status: 200 })
    )

    await setRIAAGain(2)
    const call = vi.mocked(apiFetch).mock.calls[0]
    expect(call[1]?.method).toBe('PUT')
    expect(call[1]?.body).toBe(JSON.stringify({ gain_db: 2 }))
  })

  it('should get RIAA subsonic', async () => {
    const mockSubsonic = { filter: 1 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockSubsonic), { status: 200 })
    )

    const result = await getRIAASubsonic()
    expect((result as any).filter).toBe(1)
  })

  it('should set RIAA subsonic', async () => {
    const mockResponse = { success: true, filter: 2 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await setRIAASubsonic(2)
    expect((result as any).filter).toBe(2)
  })

  it('should get RIAA enabled', async () => {
    const mockEnabled = { enabled: true }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockEnabled), { status: 200 })
    )

    const result = await getRIAAEnabled()
    expect((result as any).enabled).toBe(true)
  })

  it('should set RIAA enabled', async () => {
    const mockResponse = { success: true, enabled: false }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await setRIAAEnabled(false)
    expect((result as any).enabled).toBe(false)
  })

  it('should get RIAA declick', async () => {
    const mockDeclick = { enabled: true }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockDeclick), { status: 200 })
    )

    const result = await getRIAADeclick()
    expect((result as any).enabled).toBe(true)
  })

  it('should set RIAA declick', async () => {
    const mockResponse = { success: true, enabled: false }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await setRIAADeclick(false)
    expect((result as any).enabled).toBe(false)
  })

  it('should get RIAA spike configuration', async () => {
    const mockSpike = { threshold_db: -30, width_ms: 10 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockSpike), { status: 200 })
    )

    const result = await getRIAASpike()
    expect((result as any).threshold_db).toBe(-30)
  })

  it('should set RIAA spike configuration', async () => {
    const mockResponse = { success: true, threshold_db: -28, width_ms: 12 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await setRIAASpike(-28, 12)
    expect((result as any).threshold_db).toBe(-28)
  })

  it('should get RIAA notch filter', async () => {
    const mockNotch = { enabled: true, frequency_hz: 50, q_factor: 1 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockNotch), { status: 200 })
    )

    const result = await getRIAANotch()
    expect((result as any).enabled).toBe(true)
  })

  it('should set RIAA notch filter', async () => {
    const mockResponse = { success: true, enabled: false, frequency_hz: 60, q_factor: 2 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await setRIAANotch(false, 60, 2)
    expect((result as any).enabled).toBe(false)
  })

  it('should reset RIAA to defaults', async () => {
    const mockResponse = { status: 'success', message: 'Reset to defaults' }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await resetRIAAToDefaults()
    expect((result as any).status).toBe('success')
  })

  it('should use PUT for resetRIAAToDefaults', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: '', message: '' }), { status: 200 })
    )

    await resetRIAAToDefaults()
    const call = vi.mocked(apiFetch).mock.calls[0]
    expect(call[1]?.method).toBe('PUT')
    expect(call[1]?.body).toBe(JSON.stringify({}))
  })
})

describe('PipeWire API - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAppConfigStore).mockReturnValue({
      config: {
        audiocontrol_api: {
          deviceIP: 'localhost',
          devicePort: 2716,
          useProxy: false,
        },
      },
    } as any)
  })

  it('should handle network errors', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error('Network timeout'))

    const result = await getVersion()
    expect(isApiError(result)).toBe(true)
    expect((result as any).error).toBe('Network Error')
  })

  it('should use unknown error message for non-Error rejections', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce('timeout')

    const result = await getVersion()

    expect(isApiError(result)).toBe(true)
    expect((result as any).message).toBe('Unknown error')
  })

  it('should return error response for failed requests', async () => {
    const errorResponse = { error: 'INVALID_REQUEST', message: 'Invalid parameters' }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(errorResponse), { status: 400 })
    )

    const result = await getVersion()
    expect(isApiError(result)).toBe(true)
  })
})

describe('PipeWire API - Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAppConfigStore).mockReturnValue({
      config: {
        audiocontrol_api: {
          deviceIP: 'localhost',
          devicePort: 2716,
          useProxy: false,
        },
      },
    } as any)
  })

  it('should not modify response data', async () => {
    const mockData = { id: 1, name: 'device', volume: 80 }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockData), { status: 200 })
    )

    const result = await getVolumeById(1)
    expect(result).toEqual(mockData)
  })

  it('should call apiFetch exactly once per function', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ version: '1.0', api_version: '1.0' }), { status: 200 })
    )

    await getVersion()
    expect(vi.mocked(apiFetch)).toHaveBeenCalledTimes(1)
  })

  it('should handle consecutive calls with different results', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ volume: 80 }), { status: 200 })
    )
    const result1 = await getVolumeById(1)
    expect((result1 as any).volume).toBe(80)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ volume: 60 }), { status: 200 })
    )
    const result2 = await getVolumeById(2)
    expect((result2 as any).volume).toBe(60)
  })

  it('should properly include headers in requests', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ version: '1.0', api_version: '1.0' }), { status: 200 })
    )

    await getVersion()
    const call = vi.mocked(apiFetch).mock.calls[0]
    expect(call[1]?.headers).toEqual({ 'Content-Type': 'application/json' })
  })

  it('should merge custom headers with default headers', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    )

    await setVolumeById(1, 50)
    const call = vi.mocked(apiFetch).mock.calls[0]
    expect(call[1]?.headers).toEqual({ 'Content-Type': 'application/json' })
  })
})
