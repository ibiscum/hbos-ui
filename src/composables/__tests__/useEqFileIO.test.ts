import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { computed, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'

vi.mock('@/stores/filter-connector', () => ({
  useFilterStore: vi.fn(),
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: vi.fn(),
}))

vi.mock('@/utils/filter-conversions', () => ({
  convertUIFilterToStore: vi.fn((filter: any) => ({ convertedId: filter.id })),
}))

import { useFilterStore } from '@/stores/filter-connector'
import { useToastStore } from '@/stores/toast'
import { convertUIFilterToStore } from '@/utils/filter-conversions'
import { useEqFileIO } from '../useEqFileIO'

function makeFilter(id: number, frequency: number) {
  return {
    id,
    icon: 'peaking',
    text: `${frequency}`,
    frequency,
    gain: 0,
    Q: 0.71,
    enabled: true,
  }
}

describe('useEqFileIO', () => {
  let mockFilterStore: {
    clearFiltersFromBank: ReturnType<typeof vi.fn>
    addFilter: ReturnType<typeof vi.fn>
  }
  let mockToastStore: {
    showErrorToast: ReturnType<typeof vi.fn>
  }
  let nextFileReaderResult = ''
  let readAsTextMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()

    mockFilterStore = {
      clearFiltersFromBank: vi.fn().mockResolvedValue(undefined),
      addFilter: vi.fn().mockResolvedValue(undefined),
    }
    mockToastStore = {
      showErrorToast: vi.fn(),
    }

    vi.mocked(useFilterStore).mockReturnValue(mockFilterStore as any)
    vi.mocked(useToastStore).mockReturnValue(mockToastStore as any)
    vi.mocked(convertUIFilterToStore).mockImplementation((filter: any) => ({
      convertedId: filter.id,
      convertedFrequency: filter.frequency,
    }))

    readAsTextMock = vi.fn()
    class MockFileReader {
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null

      readAsText() {
        readAsTextMock()
        this.onload?.({
          target: { result: nextFileReaderResult },
        } as unknown as ProgressEvent<FileReader>)
      }
    }

    vi.stubGlobal('FileReader', MockFileReader as unknown as typeof FileReader)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('saves all channel filters to a downloadable JSON file', async () => {
    const createObjectURLMock = vi.fn(() => 'blob:mock-eq')
    const revokeObjectURLMock = vi.fn()
    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    } as unknown as typeof URL)

    const originalCreateElement = document.createElement.bind(document)
    const link = originalCreateElement('a')
    const linkClickSpy = vi.spyOn(link, 'click').mockImplementation(() => undefined)

    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'a') {
        return link
      }
      return originalCreateElement(tagName)
    }) as typeof document.createElement)

    const channelNames = ref(['left', 'right', 'center'])
    const channelFilters = ref<Record<string, any[]>>({
      left: [makeFilter(1, 100.3)],
      right: [makeFilter(2, 200.7)],
    })
    const activeChannel = ref('right')
    const mode = computed(() => 'both')
    const filters = ref([makeFilter(9, 900)])
    const activeFilterId = ref<number | null>(null)

    const { saveEQSettings } = useEqFileIO(
      channelNames,
      channelFilters as any,
      activeChannel,
      mode,
      filters,
      activeFilterId,
    )

    saveEQSettings()

    expect(createObjectURLMock).toHaveBeenCalledTimes(1)
    const savedBlob = createObjectURLMock.mock.calls[0][0] as Blob
    const payload = JSON.parse(await savedBlob.text())

    expect(payload.channelNames).toEqual(['left', 'right', 'center'])
    expect(payload.channelMode).toBe('both')
    expect(payload.activeChannel).toBe('right')
    expect(payload.channelFilters.left).toHaveLength(1)
    expect(payload.channelFilters.right).toHaveLength(1)
    expect(payload.channelFilters.center).toEqual([])
    expect(payload.timestamp).toEqual(expect.any(String))

    expect(linkClickSpy).toHaveBeenCalledTimes(1)
    expect(link.download).toMatch(/^speaker-eq-\d{4}-\d{2}-\d{2}\.json$/)
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-eq')
  })

  it('loads the new channelFilters format and pushes converted filters to the store', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000)

    const originalCreateElement = document.createElement.bind(document)
    const input = originalCreateElement('input')
    const file = new File(['{}'], 'eq.json', { type: 'application/json' })
    nextFileReaderResult = JSON.stringify({
      channelFilters: {
        left: [makeFilter(11, 99.6)],
        right: [makeFilter(12, 200.4)],
      },
      activeChannel: 'right',
    })

    vi.spyOn(input, 'click').mockImplementation(() => {
      input.onchange?.({
        target: { files: [file] },
      } as unknown as Event)
    })

    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'input') {
        return input
      }
      return originalCreateElement(tagName)
    }) as typeof document.createElement)

    const channelNames = ref(['left', 'right', 'center'])
    const channelFilters = ref<Record<string, any[]>>({ left: [], right: [], center: [] })
    const activeChannel = ref('left')
    const mode = computed(() => 'individual')
    const filters = ref([makeFilter(77, 500)])
    const activeFilterId = ref<number | null>(null)

    const { loadEQSettings } = useEqFileIO(
      channelNames,
      channelFilters as any,
      activeChannel,
      mode,
      filters,
      activeFilterId,
    )

    loadEQSettings()
    await flushPromises()

    expect(channelFilters.value.left[0].frequency).toBe(100)
    expect(channelFilters.value.right[0].frequency).toBe(200)
    expect(channelFilters.value.left[0].id).toBe(1000)
    expect(channelFilters.value.right[0].id).toBe(2000)

    expect(mockFilterStore.clearFiltersFromBank).toHaveBeenCalledTimes(2)
    expect(mockFilterStore.clearFiltersFromBank).toHaveBeenNthCalledWith(1, 'left')
    expect(mockFilterStore.clearFiltersFromBank).toHaveBeenNthCalledWith(2, 'right')
    expect(mockFilterStore.addFilter).toHaveBeenCalledTimes(2)
    expect(mockFilterStore.addFilter).toHaveBeenCalledWith(
      'left',
      0,
      expect.objectContaining({ convertedId: 1000, convertedFrequency: 100 }),
    )
    expect(mockFilterStore.addFilter).toHaveBeenCalledWith(
      'right',
      0,
      expect.objectContaining({ convertedId: 2000, convertedFrequency: 200 }),
    )

    expect(activeFilterId.value).toBe(77)
    expect(activeChannel.value).toBe('right')
  })

  it('loads the legacy left/right format and ignores unsupported active channels', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(2000)

    const originalCreateElement = document.createElement.bind(document)
    const input = originalCreateElement('input')
    const file = new File(['{}'], 'legacy.json', { type: 'application/json' })
    nextFileReaderResult = JSON.stringify({
      leftFilters: [makeFilter(21, 15.2)],
      rightFilters: [makeFilter(22, 40.8)],
      activeChannel: 'sub',
    })

    vi.spyOn(input, 'click').mockImplementation(() => {
      input.onchange?.({
        target: { files: [file] },
      } as unknown as Event)
    })

    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'input') {
        return input
      }
      return originalCreateElement(tagName)
    }) as typeof document.createElement)

    const channelNames = ref(['left', 'right', 'center'])
    const channelFilters = ref<Record<string, any[]>>({ left: [], right: [], center: [] })
    const activeChannel = ref('left')
    const mode = computed(() => 'individual')
    const filters = ref<any[]>([])
    const activeFilterId = ref<number | null>(999)

    const { loadEQSettings } = useEqFileIO(
      channelNames,
      channelFilters as any,
      activeChannel,
      mode,
      filters,
      activeFilterId,
    )

    loadEQSettings()
    await flushPromises()

    expect(channelFilters.value.left[0].frequency).toBe(15)
    expect(channelFilters.value.right[0].frequency).toBe(41)
    expect(channelFilters.value.left[0].id).toBe(2000)
    expect(channelFilters.value.right[0].id).toBe(3000)
    expect(mockFilterStore.clearFiltersFromBank).toHaveBeenCalledTimes(2)
    expect(mockFilterStore.addFilter).toHaveBeenCalledTimes(2)

    expect(activeFilterId.value).toBe(999)
    expect(activeChannel.value).toBe('left')
  })

  it('shows an error toast when JSON parsing fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const originalCreateElement = document.createElement.bind(document)
    const input = originalCreateElement('input')
    const file = new File(['bad'], 'bad.json', { type: 'application/json' })
    nextFileReaderResult = '{not-valid-json'

    vi.spyOn(input, 'click').mockImplementation(() => {
      input.onchange?.({
        target: { files: [file] },
      } as unknown as Event)
    })

    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'input') {
        return input
      }
      return originalCreateElement(tagName)
    }) as typeof document.createElement)

    const channelNames = ref(['left', 'right'])
    const channelFilters = ref<Record<string, any[]>>({ left: [], right: [] })
    const activeChannel = ref('left')
    const mode = computed(() => 'individual')
    const filters = ref<any[]>([])
    const activeFilterId = ref<number | null>(null)

    const { loadEQSettings } = useEqFileIO(
      channelNames,
      channelFilters as any,
      activeChannel,
      mode,
      filters,
      activeFilterId,
    )

    loadEQSettings()
    await flushPromises()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'speaker-equalizer: Error loading Speaker EQ settings:',
      expect.any(Error),
    )
    expect(mockToastStore.showErrorToast).toHaveBeenCalledWith(
      'Error loading Speaker EQ settings. Please check the file format.',
    )
  })

  it('does nothing when no file is selected', () => {
    const originalCreateElement = document.createElement.bind(document)
    const input = originalCreateElement('input')

    vi.spyOn(input, 'click').mockImplementation(() => {
      input.onchange?.({
        target: { files: [] },
      } as unknown as Event)
    })

    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'input') {
        return input
      }
      return originalCreateElement(tagName)
    }) as typeof document.createElement)

    const channelNames = ref(['left', 'right'])
    const channelFilters = ref<Record<string, any[]>>({ left: [], right: [] })
    const activeChannel = ref('left')
    const mode = computed(() => 'individual')
    const filters = ref<any[]>([])
    const activeFilterId = ref<number | null>(null)

    const { loadEQSettings } = useEqFileIO(
      channelNames,
      channelFilters as any,
      activeChannel,
      mode,
      filters,
      activeFilterId,
    )

    loadEQSettings()

    expect(readAsTextMock).not.toHaveBeenCalled()
    expect(mockFilterStore.clearFiltersFromBank).not.toHaveBeenCalled()
    expect(mockFilterStore.addFilter).not.toHaveBeenCalled()
    expect(mockToastStore.showErrorToast).not.toHaveBeenCalled()
  })

  it('skips filter import when payload has no supported format', async () => {
    const originalCreateElement = document.createElement.bind(document)
    const input = originalCreateElement('input')
    const file = new File(['{}'], 'unsupported.json', { type: 'application/json' })
    nextFileReaderResult = JSON.stringify({
      someOtherShape: true,
      channelMode: 'both',
    })

    vi.spyOn(input, 'click').mockImplementation(() => {
      input.onchange?.({
        target: { files: [file] },
      } as unknown as Event)
    })

    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'input') {
        return input
      }
      return originalCreateElement(tagName)
    }) as typeof document.createElement)

    const channelNames = ref(['left', 'right', 'center'])
    const channelFilters = ref<Record<string, any[]>>({ left: [], right: [], center: [] })
    const activeChannel = ref('left')
    const mode = computed(() => 'both')
    const filters = ref<any[]>([])
    const activeFilterId = ref<number | null>(null)

    const { loadEQSettings } = useEqFileIO(
      channelNames,
      channelFilters as any,
      activeChannel,
      mode,
      filters,
      activeFilterId,
    )

    loadEQSettings()
    await flushPromises()

    expect(mockFilterStore.clearFiltersFromBank).not.toHaveBeenCalled()
    expect(mockFilterStore.addFilter).not.toHaveBeenCalled()
    expect(activeFilterId.value).toBeNull()
    expect(activeChannel.value).toBe('left')
  })
})
