import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

import PosterGrid from '@/components/PosterGrid.vue'
import type { PosterItem } from '@/types/library'

const mockState = vi.hoisted(() => ({
  isLibraryUpdatingRef: null as { value: boolean } | null,
}))

vi.mock('pinia', () => ({
  storeToRefs: <T extends Record<string, unknown>>(store: T) => store,
}))

vi.mock('@/stores/library', async () => {
  const { ref } = await import('vue')

  if (!mockState.isLibraryUpdatingRef) {
    mockState.isLibraryUpdatingRef = ref(false)
  }

  return {
    useLibraryStore: () => ({
      isLibraryUpdating: mockState.isLibraryUpdatingRef,
    }),
  }
})

vi.mock('@/components/Poster.vue', () => ({
  default: {
    name: 'Poster',
    props: ['posterForm', 'title', 'subtitle', 'note', 'src'],
    emits: ['click'],
    template: `
      <button
        class="poster-stub"
        :data-poster-form="posterForm"
        :data-title="title"
        :data-subtitle="subtitle"
        :data-note="note"
        :data-src="src"
        type="button"
        @click="$emit('click')"
      />
    `,
  },
}))

vi.mock('@/components/skeletons/PosterSkeleton.vue', () => ({
  default: {
    name: 'PosterSkeleton',
    props: ['posterForm', 'isNote'],
    template: '<div class="poster-skeleton-stub" :data-poster-form="posterForm" :data-is-note="String(isNote)" />',
  },
}))

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['icon'],
    template: '<svg class="icon-stub" :data-icon="icon" aria-hidden="true" />',
  },
}))

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: height, configurable: true, writable: true })
}

function setScrollPosition(scrollY: number) {
  Object.defineProperty(window, 'scrollY', { value: scrollY, configurable: true, writable: true })
}

function setScrollHeight(height: number) {
  Object.defineProperty(document.body, 'scrollHeight', { value: height, configurable: true })
}

type TestPosterItem = PosterItem & { id: string }

function createItems(count: number, withNote = false): TestPosterItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `id-${index + 1}`,
    $id: `poster-${index + 1}`,
    $title: `Title ${index + 1}`,
    $subtitle: `Subtitle ${index + 1}`,
    $cover_src: `/cover-${index + 1}.jpg`,
    $note: withNote && index === 0 ? 'Has note' : '',
  }))
}

describe('PosterGrid.vue', () => {
  beforeEach(() => {
    mockState.isLibraryUpdatingRef!.value = false
    setViewport(1366, 768)
    setScrollPosition(0)
    setScrollHeight(9999)
  })

  it('renders loading skeleton and forwards note-awareness to it', () => {
    const wrapper = mount(PosterGrid<TestPosterItem>, {
      props: {
        loading: true,
        items: createItems(3, true),
        posterForm: 'circle',
      },
    })

    const skeleton = wrapper.get('.poster-skeleton-stub')
    expect(skeleton.attributes('data-poster-form')).toBe('circle')
    expect(skeleton.attributes('data-is-note')).toBe('true')
    expect(wrapper.findAll('.poster-item')).toHaveLength(0)
  })

  it('loads items in chunks for grid mode and appends on bottom scroll', async () => {
    const wrapper = mount(PosterGrid<TestPosterItem>, {
      props: {
        items: createItems(120),
      },
    })

    expect(wrapper.findAll('.poster-item')).toHaveLength(50)

    setScrollHeight(1500)
    setScrollPosition(100)
    window.dispatchEvent(new Event('scroll'))
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.poster-item')).toHaveLength(100)

    setScrollPosition(300)
    window.dispatchEvent(new Event('scroll'))
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.poster-item')).toHaveLength(120)
  })

  it('renders all items at once when showAll is true', () => {
    const wrapper = mount(PosterGrid<TestPosterItem>, {
      props: {
        items: createItems(120),
        showAll: true,
      },
    })

    expect(wrapper.findAll('.poster-item')).toHaveLength(120)
  })

  it('limits in-row desktop layout to calculated max items', () => {
    setViewport(1200, 900)

    const wrapper = mount(PosterGrid<TestPosterItem>, {
      props: {
        items: createItems(20),
        inRow: true,
      },
    })

    expect(wrapper.findAll('.poster-item')).toHaveLength(6)
  })

  it('recalculates in-row visible items on resize', async () => {
    setViewport(1200, 900)

    const wrapper = mount(PosterGrid<TestPosterItem>, {
      props: {
        items: createItems(20),
        inRow: true,
      },
    })

    expect(wrapper.findAll('.poster-item')).toHaveLength(6)

    setViewport(400, 900)
    window.dispatchEvent(new Event('resize'))
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.poster-item')).toHaveLength(4)
  })

  it('emits click and contextmenu with the selected item payload', async () => {
    const items = createItems(2)
    const wrapper = mount(PosterGrid<TestPosterItem>, {
      props: {
        items,
      },
    })

    await wrapper.find('.poster-stub').trigger('click')

    const menuEvent = new MouseEvent('contextmenu', { bubbles: true })
    await wrapper.find('.poster-item').trigger('contextmenu', menuEvent)

    expect(wrapper.emitted('click')).toHaveLength(1)
    expect(wrapper.emitted('click')![0][0]).toEqual(items[0])

    expect(wrapper.emitted('contextmenu')).toHaveLength(1)
    expect(wrapper.emitted('contextmenu')![0][0]).toEqual(items[0])
    expect(wrapper.emitted('contextmenu')![0][1]).toBeInstanceOf(MouseEvent)
  })

  it('shows updating state and loading icon when library update is in progress', () => {
    mockState.isLibraryUpdatingRef!.value = true

    const wrapper = mount(PosterGrid<TestPosterItem>, {
      props: {
        loaded: true,
        items: [],
      },
    })

    expect(wrapper.text()).toContain('Library update still running')
    expect(wrapper.find('.icon-stub').attributes('data-icon')).toBe('loading')
    expect(wrapper.text()).not.toContain('No available items found')
  })

  it('shows generic empty-state message when loaded without items and not updating', () => {
    const wrapper = mount(PosterGrid<TestPosterItem>, {
      props: {
        loaded: true,
        items: [],
      },
    })

    expect(wrapper.text()).toContain('No available items found')
  })

  it('regression: does not render empty-state while still loading', () => {
    mockState.isLibraryUpdatingRef!.value = true

    const wrapper = mount(PosterGrid<TestPosterItem>, {
      props: {
        loading: true,
        loaded: true,
        items: [],
      },
    })

    expect(wrapper.find('.no-items').exists()).toBe(false)
    expect(wrapper.find('.poster-skeleton-stub').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Library update still running')
    expect(wrapper.text()).not.toContain('No available items found')
  })
})
