import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import RoomAcousticsView from '../room-acoustics.vue'

const mocks = vi.hoisted(() => ({
  getRoomMeasurements: vi.fn(),
  deleteRoomMeasurement: vi.fn(),
  getConfigKeys: vi.fn(),
  getConfigValue: vi.fn(),
  deleteConfigValue: vi.fn(),
  push: vi.fn(),
  generateCombinedGraphData: vi.fn(),
}))

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({
    getRoomMeasurements: mocks.getRoomMeasurements,
    deleteRoomMeasurement: mocks.deleteRoomMeasurement,
  }),
}))

vi.mock('@/api/config', () => ({
  getConfigKeys: mocks.getConfigKeys,
  getConfigValue: mocks.getConfigValue,
  deleteConfigValue: mocks.deleteConfigValue,
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mocks.push,
  }),
}))

vi.mock('@/utils/filtergraph', () => ({
  generateCombinedGraphData: mocks.generateCombinedGraphData,
  DEFAULT_FREQ_RANGE: { min: 20, max: 20000 },
}))

vi.mock('@/components/PageContent.vue', () => ({
  default: {
    name: 'PageContent',
    template: '<section class="page-content-stub"><slot /></section>',
  },
}))

vi.mock('@/components/BackRouter.vue', () => ({
  default: {
    name: 'BackRouter',
    props: ['to'],
    template: '<a class="back-router-stub" :data-target="to?.name"><slot /></a>',
  },
}))

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['icon'],
    template: '<i class="icon-stub" :data-icon="icon" />',
  },
}))

vi.mock('@/components/RoomMeasurementWizard.vue', () => ({
  default: {
    name: 'RoomMeasurementWizard',
    props: ['isOpen'],
    emits: ['close', 'measurement-completed'],
    template:
      '<div class="measurement-wizard-stub" :data-open="isOpen ? \'yes\' : \'no\'"><button class="wizard-close" @click="$emit(\'close\')" /><button class="wizard-complete" @click="$emit(\'measurement-completed\')" /></div>',
  },
}))

vi.mock('@/components/RoomEqualisationWizard.vue', () => ({
  default: {
    name: 'RoomEqualisationWizard',
    props: ['isOpen', 'measurement'],
    emits: ['close', 'equalisation-setup'],
    template:
      '<div class="equalisation-wizard-stub" :data-open="isOpen ? \'yes\' : \'no\'" :data-measurement-name="measurement && measurement.name ? measurement.name : \'none\'"><button class="equalisation-setup" @click="$emit(\'equalisation-setup\', \'selected\')" /><button class="equalisation-close" @click="$emit(\'close\')" /></div>',
  },
}))

const buildMeasurement = (overrides: Partial<any> = {}) => ({
  id: 1,
  name: 'Living Room A',
  timestamp: '2026-08-01T10:00:00.000Z',
  frequencies: [20, 200, 2000, 10000],
  magnitudes: [-3, -1, 2, -2],
  sample_rate: 48000,
  ...overrides,
})

const buildConfigData = (name: string, createdAt: string, filters: any[] = []) => ({
  name,
  filters,
  created_at: createdAt,
  optimization_results: { improvement_db: 3.2 },
  settings: { min_frequency: 40, max_frequency: 16000 },
})

const mountView = () => mount(RoomAcousticsView)

describe('sound/room-acoustics view consolidated unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getRoomMeasurements.mockResolvedValue([])
    mocks.deleteRoomMeasurement.mockResolvedValue(undefined)

    mocks.getConfigKeys.mockResolvedValue({
      status: 'success',
      data: [],
    })

    mocks.getConfigValue.mockResolvedValue({
      status: 'success',
      data: { value: JSON.stringify(buildConfigData('Default EQ', '2026-08-01T12:00:00.000Z')) },
    })

    mocks.deleteConfigValue.mockResolvedValue({ status: 'success' })
    mocks.push.mockResolvedValue(undefined)

    mocks.generateCombinedGraphData.mockReturnValue({ linePath: 'M 0 50 L 300 50' })
  })

  describe('unit coverage', () => {
    it('renders room acoustics page shell and empty state when no data is available', async () => {
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.get('.back-router-stub').attributes('data-target')).toBe('sound')
      expect(wrapper.text()).toContain('Room Acoustics Correction')
      expect(wrapper.text()).toContain('Measure Room')
      expect(wrapper.find('.empty-state').exists()).toBe(true)

      wrapper.unmount()
    })

    it('renders measurements and saved configurations from store/config APIs', async () => {
      mocks.getRoomMeasurements.mockResolvedValueOnce([
        buildMeasurement(),
      ])

      mocks.getConfigKeys.mockResolvedValueOnce({
        status: 'success',
        data: ['correction-filters.old', 'correction-filters.new'],
      })
      mocks.getConfigValue
        .mockResolvedValueOnce({
          status: 'success',
          data: { value: JSON.stringify(buildConfigData('Old EQ', '2026-08-01T09:00:00.000Z')) },
        })
        .mockResolvedValueOnce({
          status: 'success',
          data: { value: JSON.stringify(buildConfigData('New EQ', '2026-08-03T09:00:00.000Z')) },
        })

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.findAll('.measurement-card')).toHaveLength(1)
      expect(wrapper.findAll('.equalisation-card')).toHaveLength(2)
      expect(wrapper.findAll('.equalisation-card .equalisation-info h3')[0].text()).toBe('New EQ')
      expect(wrapper.findAll('.equalisation-card .equalisation-info h3')[1].text()).toBe('Old EQ')

      wrapper.unmount()
    })

    it('opens measurement wizard from the measure button and closes after completion', async () => {
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.get('.measurement-wizard-stub').attributes('data-open')).toBe('no')

      await wrapper.get('.measure-button').trigger('click')
      expect(wrapper.get('.measurement-wizard-stub').attributes('data-open')).toBe('yes')

      await wrapper.get('.wizard-complete').trigger('click')
      await flushPromises()

      expect(wrapper.get('.measurement-wizard-stub').attributes('data-open')).toBe('no')
      expect(mocks.getRoomMeasurements).toHaveBeenCalledTimes(2)

      wrapper.unmount()
    })

    it('opens equalisation wizard when selecting a measurement card', async () => {
      mocks.getRoomMeasurements.mockResolvedValueOnce([
        buildMeasurement({ id: 7, name: 'Office Position' }),
      ])

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.measurement-card').trigger('click')
      expect(wrapper.get('.equalisation-wizard-stub').attributes('data-open')).toBe('yes')
      expect(wrapper.get('.equalisation-wizard-stub').attributes('data-measurement-name')).toBe('Office Position')

      wrapper.unmount()
    })
  })

  describe('regression coverage', () => {
    it('delete measurement button does not trigger equalisation wizard open', async () => {
      mocks.getRoomMeasurements.mockResolvedValueOnce([
        buildMeasurement({ id: 99 }),
      ])

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.measurement-card .delete-button').trigger('click')
      await flushPromises()

      expect(mocks.deleteRoomMeasurement).toHaveBeenCalledWith(99)
      expect(wrapper.get('.equalisation-wizard-stub').attributes('data-open')).toBe('no')

      wrapper.unmount()
    })

    it('opens channel selection from configuration card and routes with selected channel', async () => {
      const filters = [
        { filter_type: 'hp', frequency: 120, gain_db: 0, q: 0.71 },
      ]
      mocks.getConfigKeys.mockResolvedValueOnce({
        status: 'success',
        data: ['correction-filters.eq-lr'],
      })
      mocks.getConfigValue.mockResolvedValueOnce({
        status: 'success',
        data: { value: JSON.stringify(buildConfigData('Stereo Room EQ', '2026-08-03T10:00:00.000Z', filters)) },
      })

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.equalisation-card').trigger('click')
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)

      await wrapper.get('input[value="right"]').setValue(true)
      await wrapper.get('.modal-footer .nav-button.primary').trigger('click')
      await flushPromises()

      expect(mocks.push).toHaveBeenCalledWith({
        path: '/sound/speaker-equalizer',
        query: {
          applyRoomEQ: 'correction-filters.eq-lr',
          channel: 'right',
        },
      })

      wrapper.unmount()
    })

    it('delete configuration button does not open channel selection dialog', async () => {
      mocks.getConfigKeys.mockResolvedValueOnce({
        status: 'success',
        data: ['correction-filters.eq-delete'],
      })
      mocks.getConfigValue.mockResolvedValueOnce({
        status: 'success',
        data: { value: JSON.stringify(buildConfigData('Delete Me', '2026-08-02T10:00:00.000Z')) },
      })

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.equalisation-card .delete-button').trigger('click')
      await flushPromises()

      expect(mocks.deleteConfigValue).toHaveBeenCalledWith('correction-filters.eq-delete')
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)

      wrapper.unmount()
    })

    it('maps Room EQ filter types to speaker-eq filter icons for preview generation', async () => {
      const filters = [
        { filter_type: 'hp', frequency: 120, gain_db: 0, q: 0.71 },
        { filter_type: 'eq', frequency: 1200, gain_db: -2.5, q: 1.4 },
      ]

      mocks.getConfigKeys.mockResolvedValueOnce({
        status: 'success',
        data: ['correction-filters.mapped'],
      })
      mocks.getConfigValue.mockResolvedValueOnce({
        status: 'success',
        data: { value: JSON.stringify(buildConfigData('Mapped Filters', '2026-08-03T12:00:00.000Z', filters)) },
      })

      const wrapper = mountView()
      await flushPromises()

      expect(mocks.generateCombinedGraphData).toHaveBeenCalledTimes(1)
      const converted = mocks.generateCombinedGraphData.mock.calls[0][0]
      expect(converted[0].icon).toBe('highpass')
      expect(converted[1].icon).toBe('peaking')

      wrapper.unmount()
    })

    it('keeps measurement preview path finite for flat magnitude measurements', async () => {
      mocks.getRoomMeasurements.mockResolvedValueOnce([
        buildMeasurement({
          magnitudes: [5, 5, 5, 5],
        }),
      ])

      const wrapper = mountView()
      await flushPromises()

      const previewPath = wrapper.get('.measurement-preview path').attributes('d')
      expect(previewPath).toContain('M')
      expect(previewPath.includes('NaN')).toBe(false)
      expect(previewPath.includes('Infinity')).toBe(false)

      wrapper.unmount()
    })
  })
})
