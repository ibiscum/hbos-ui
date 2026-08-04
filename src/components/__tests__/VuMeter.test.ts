import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, proxyRefs, ref, type Ref } from 'vue'

import VuMeter from '@/components/VuMeter.vue'

const storeRefs = vi.hoisted(() => ({
  leftRms: null as Ref<number> | null,
  rightRms: null as Ref<number> | null,
  leftPeak: null as Ref<number> | null,
  rightPeak: null as Ref<number> | null,
  leftClipping: null as Ref<boolean> | null,
  rightClipping: null as Ref<boolean> | null,
  connect: vi.fn(),
  disconnect: vi.fn(),
}))

vi.mock('@/stores/vu-meter', () => {
  storeRefs.leftRms = ref(0)
  storeRefs.rightRms = ref(0)
  storeRefs.leftPeak = ref(0)
  storeRefs.rightPeak = ref(0)
  storeRefs.leftClipping = ref(false)
  storeRefs.rightClipping = ref(false)

  return {
    useVuMeterStore: () => proxyRefs({
      leftRmsPercent: computed(() => ((storeRefs.leftRms?.value ?? 0) / 255) * 100),
      rightRmsPercent: computed(() => ((storeRefs.rightRms?.value ?? 0) / 255) * 100),
      leftPeakPercent: computed(() => ((storeRefs.leftPeak?.value ?? 0) / 255) * 100),
      rightPeakPercent: computed(() => ((storeRefs.rightPeak?.value ?? 0) / 255) * 100),
      hasSignal: computed(() => (storeRefs.leftRms?.value ?? 0) > 0 || (storeRefs.rightRms?.value ?? 0) > 0),
      leftClipping: storeRefs.leftClipping,
      rightClipping: storeRefs.rightClipping,
      connect: storeRefs.connect,
      disconnect: storeRefs.disconnect,
    }),
  }
})

type RafCallback = (timestamp: number) => void

let rafQueue: Array<{ id: number; cb: RafCallback }> = []
let rafId = 0
let canceledIds = new Set<number>()

function runNextFrame() {
  const next = rafQueue.shift()
  if (!next) {
    throw new Error('No queued animation frame callback to run')
  }

  if (!canceledIds.has(next.id)) {
    next.cb(0)
  }
}

function runFrames(count: number) {
  for (let i = 0; i < count; i += 1) {
    runNextFrame()
  }
}

function getFillWidths(wrapper: ReturnType<typeof mount>) {
  return wrapper
    .findAll('.vu-meter__fill')
    .map((el) => Number.parseFloat((el.attributes('style') ?? '').match(/width:\s*([\d.]+)%/)?.[1] ?? '0'))
}

function getPeakPositions(wrapper: ReturnType<typeof mount>) {
  return wrapper
    .findAll('.vu-meter__peak')
    .map((el) => Number.parseFloat((el.attributes('style') ?? '').match(/left:\s*([\d.]+)%/)?.[1] ?? '0'))
}

describe('VuMeter.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rafQueue = []
    rafId = 0
    canceledIds = new Set<number>()

    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: RafCallback) => {
      rafId += 1
      rafQueue.push({ id: rafId, cb })
      return rafId
    }))

    vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => {
      canceledIds.add(id)
    }))

    if (storeRefs.leftRms) storeRefs.leftRms.value = 0
    if (storeRefs.rightRms) storeRefs.rightRms.value = 0
    if (storeRefs.leftPeak) storeRefs.leftPeak.value = 0
    if (storeRefs.rightPeak) storeRefs.rightPeak.value = 0
    if (storeRefs.leftClipping) storeRefs.leftClipping.value = false
    if (storeRefs.rightClipping) storeRefs.rightClipping.value = false
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('connects on mount and disconnects on unmount', () => {
    const wrapper = mount(VuMeter)

    expect(storeRefs.connect).toHaveBeenCalledTimes(1)
    expect(vi.mocked(requestAnimationFrame)).toHaveBeenCalledTimes(1)

    wrapper.unmount()

    expect(storeRefs.disconnect).toHaveBeenCalledTimes(1)
    expect(vi.mocked(cancelAnimationFrame)).toHaveBeenCalledTimes(1)
  })

  it('applies silent class when there is no signal and removes it when signal appears', async () => {
    const wrapper = mount(VuMeter)

    expect(wrapper.find('.vu-meter').classes()).toContain('vu-meter--silent')

    storeRefs.leftRms!.value = 64
    runNextFrame()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.vu-meter').classes()).not.toContain('vu-meter--silent')
  })

  it('regression: smooths RMS widths over animation frames', async () => {
    const wrapper = mount(VuMeter)

    storeRefs.leftRms!.value = 255
    storeRefs.rightRms!.value = 128

    runNextFrame()
    await wrapper.vm.$nextTick()

    const [leftWidth, rightWidth] = getFillWidths(wrapper)
    expect(leftWidth).toBeCloseTo(30, 4)
    expect(rightWidth).toBeCloseTo(15.0588, 3)

    runNextFrame()
    await wrapper.vm.$nextTick()

    const [leftWidthSecond] = getFillWidths(wrapper)
    expect(leftWidthSecond).toBeGreaterThan(leftWidth)
    expect(leftWidthSecond).toBeCloseTo(51, 3)
  })

  it('regression: holds peaks at new highs, then decays by 0.4% per frame', async () => {
    const wrapper = mount(VuMeter)

    storeRefs.leftPeak!.value = 255
    storeRefs.rightPeak!.value = 200

    runNextFrame()
    await wrapper.vm.$nextTick()

    let [leftPeak, rightPeak] = getPeakPositions(wrapper)
    expect(leftPeak).toBeCloseTo(100, 4)
    expect(rightPeak).toBeCloseTo((200 / 255) * 100, 4)

    storeRefs.leftPeak!.value = 0
    storeRefs.rightPeak!.value = 0

    runNextFrame()
    await wrapper.vm.$nextTick()

    ;[leftPeak, rightPeak] = getPeakPositions(wrapper)
    expect(leftPeak).toBeCloseTo(99.6, 4)
    expect(rightPeak).toBeCloseTo((200 / 255) * 100 - 0.4, 4)
  })

  it('toggles clipping class per channel', async () => {
    const wrapper = mount(VuMeter)

    expect(wrapper.findAll('.vu-meter__fill')[0].classes()).not.toContain('vu-meter__fill--clip')
    expect(wrapper.findAll('.vu-meter__fill')[1].classes()).not.toContain('vu-meter__fill--clip')

    storeRefs.leftClipping!.value = true
    storeRefs.rightClipping!.value = true
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.vu-meter__fill')[0].classes()).toContain('vu-meter__fill--clip')
    expect(wrapper.findAll('.vu-meter__fill')[1].classes()).toContain('vu-meter__fill--clip')
  })

  it('regression: peak hold never decays below zero', async () => {
    const wrapper = mount(VuMeter)

    storeRefs.leftPeak!.value = 1
    runNextFrame()
    await wrapper.vm.$nextTick()

    storeRefs.leftPeak!.value = 0
    runFrames(20)
    await wrapper.vm.$nextTick()

    const [leftPeak] = getPeakPositions(wrapper)
    expect(leftPeak).toBeGreaterThanOrEqual(0)
  })
})
