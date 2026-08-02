import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ArtistImageSelector from '../../components/ArtistImageSelector.vue'
import { coverArtLoader } from '@/services/coverartloader'

// Mock Icon component to avoid dependencies
vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['icon'],
    template: '<span class="icon" />',
  },
}))

// Mock the coverartloader service
vi.mock('@/services/coverartloader', () => ({
  coverArtLoader: {
    getArtistCoverArt: vi.fn()
  }
}))

describe('ArtistImageSelector.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // ========== Rendering and Visibility Tests ==========
  describe('Component Rendering and Visibility', () => {
    it('should not render overlay when isVisible is false', () => {
      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: false,
          artistName: 'Test Artist'
        }
      })
      expect(wrapper.find('.artist-image-selector-overlay').exists()).toBe(false)
    })

    it('should render overlay when isVisible is true', () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({ results: [] })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      expect(wrapper.find('.artist-image-selector-overlay').exists()).toBe(true)
    })

    it('should display modal header with artist name', () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({ results: [] })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Radiohead'
        }
      })

      expect(wrapper.text()).toContain('Select Artist Image for Radiohead')
    })

    it('should have close button in header', () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({ results: [] })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      expect(wrapper.find('.close-btn').exists()).toBe(true)
    })
  })

  // ========== Loading State Tests ==========
  describe('Loading State', () => {
    it('should show loading state while fetching', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ results: [] }), 100))
      )

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await vi.advanceTimersByTimeAsync(10)
      expect(wrapper.text()).toContain('Loading artist images')
    })

    it('should hide loading state after fetch completes', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({ results: [] })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await flushPromises()
      expect(wrapper.find('.loading-state').exists()).toBe(false)
    })
  })

  // ========== Error State Tests ==========
  describe('Error State', () => {
    it('should show error message when API call fails', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockRejectedValue(
        new Error('API Error')
      )

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await flushPromises()
      expect(wrapper.text()).toContain('Failed to load artist images')
    })

    it('should display retry button on error', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockRejectedValue(
        new Error('API Error')
      )

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await flushPromises()
      expect(wrapper.find('.retry-btn').exists()).toBe(true)
    })

    it('should retry fetch when retry button is clicked', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({ results: [] })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await flushPromises()

      // Click retry button
      await wrapper.find('.retry-btn').trigger('click')
      await flushPromises()

      expect(coverArtLoader.getArtistCoverArt).toHaveBeenCalledTimes(2)
    })

    it('should clear error on successful retry', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({ results: [] })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await flushPromises()
      expect(wrapper.find('.error-state').exists()).toBe(true)

      await wrapper.find('.retry-btn').trigger('click')
      await flushPromises()

      expect(wrapper.find('.error-state').exists()).toBe(false)
    })
  })

  // ========== No Images State Tests ==========
  describe('No Images State', () => {
    it('should show no images message when results array is empty', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({ results: [] })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Unknown Artist'
        }
      })

      await flushPromises()
      expect(wrapper.text()).toContain('No images found')
      expect(wrapper.text()).toContain('No artist images were found for "Unknown Artist"')
    })

    it('should show no images message when response has no results', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({
        results: [
          {
            provider: { name: 'test', display_name: 'Test' },
            images: []
          }
        ]
      })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await flushPromises()
      expect(wrapper.text()).toContain('No images found')
    })
  })

  // ========== Images Grid Tests ==========
  describe('Images Grid Display', () => {
    const mockImages = [
      {
        provider: { name: 'provider1', display_name: 'Provider 1' },
        images: [
          {
            url: 'https://example.com/image1.jpg',
            width: 300,
            height: 300,
            size_bytes: 50000,
            grade: 5
          },
          {
            url: 'https://example.com/image2.jpg',
            width: 500,
            height: 500,
            size_bytes: 100000,
            grade: 3
          }
        ]
      },
      {
        provider: { name: 'provider2', display_name: 'Provider 2' },
        images: [
          {
            url: 'https://example.com/image3.jpg',
            width: 400,
            height: 400,
            size_bytes: 75000,
            grade: 4
          }
        ]
      }
    ]

    it('should display images in grid when images are available', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({
        results: mockImages
      })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await flushPromises()
      expect(wrapper.find('.images-grid').exists()).toBe(true)
    })

    it('should render correct number of image items', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({
        results: mockImages
      })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await flushPromises()
      const imageItems = wrapper.findAll('.image-item')
      expect(imageItems).toHaveLength(3)
    })

    it('should display provider name in badge', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({
        results: mockImages
      })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await flushPromises()
      const badges = wrapper.findAll('.provider-badge')
      expect(badges.length).toBeGreaterThan(0)
      expect(badges[0].text()).toBe('Provider 1')
    })

    it('should display resolution information when available', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({
        results: mockImages
      })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await flushPromises()
      const resolutionBadges = wrapper.findAll('.resolution-badge')
      expect(resolutionBadges.length).toBeGreaterThan(0)
      expect(resolutionBadges[0].text()).toContain('×')
    })

    it('should display file size when available', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({
        results: mockImages
      })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await flushPromises()
      const sizeInfo = wrapper.find('.size-info')
      expect(sizeInfo.exists()).toBe(true)
    })
  })

  // ========== Image Sorting Tests ==========
  describe('Image Sorting', () => {
    it('should sort images by grade in descending order', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({
        results: [
          {
            provider: { name: 'p1', display_name: 'Provider 1' },
            images: [
              { url: 'url1', grade: 1 },
              { url: 'url2', grade: 5 },
              { url: 'url3', grade: 3 }
            ]
          }
        ]
      })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await flushPromises()
      const imageItems = wrapper.findAll('.image-item img')
      expect(imageItems[0].attributes('src')).toBe('url2')
      expect(imageItems[1].attributes('src')).toBe('url3')
      expect(imageItems[2].attributes('src')).toBe('url1')
    })

    it('should sort by provider name when grades are equal', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({
        results: [
          {
            provider: { name: 'zebra', display_name: 'Zebra Provider' },
            images: [
              { url: 'url1', grade: 5 }
            ]
          },
          {
            provider: { name: 'apple', display_name: 'Apple Provider' },
            images: [
              { url: 'url2', grade: 5 }
            ]
          }
        ]
      })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await flushPromises()
      const imageItems = wrapper.findAll('.image-item img')
      expect(imageItems[0].attributes('src')).toBe('url2') // Apple comes before Zebra
    })

    it('should prioritize images with grade over those without', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({
        results: [
          {
            provider: { name: 'provider', display_name: 'Provider' },
            images: [
              { url: 'url1' }, // No grade
              { url: 'url2', grade: 5 },
              { url: 'url3' } // No grade
            ]
          }
        ]
      })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await flushPromises()
      const imageItems = wrapper.findAll('.image-item img')
      expect(imageItems[0].attributes('src')).toBe('url2')
    })

    it('should filter out images with grade < -10', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({
        results: [
          {
            provider: { name: 'provider', display_name: 'Provider' },
            images: [
              { url: 'url1', grade: -5 },
              { url: 'url2', grade: -15 },
              { url: 'url3', grade: 0 }
            ]
          }
        ]
      })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await flushPromises()
      const imageItems = wrapper.findAll('.image-item img')
      expect(imageItems).toHaveLength(2)
      expect(imageItems[0].attributes('src')).toBe('url3')
      expect(imageItems[1].attributes('src')).toBe('url1')
    })
  })

  // ========== Emission Tests ==========
  describe('Emit Behavior', () => {
    it('should emit close event when close button is clicked', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({ results: [] })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await wrapper.find('.close-btn').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close event when overlay is clicked', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({ results: [] })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await wrapper.find('.artist-image-selector-overlay').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not close when clicking inside modal', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({ results: [] })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await wrapper.find('.modal-content').trigger('click')
      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should emit select event with image URL when image is clicked', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({
        results: [
          {
            provider: { name: 'provider', display_name: 'Provider' },
            images: [
              { url: 'https://example.com/image.jpg' }
            ]
          }
        ]
      })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await flushPromises()
      await wrapper.find('.image-item').trigger('click')

      const selectEmit = wrapper.emitted('select')
      expect(selectEmit).toBeTruthy()
      expect(selectEmit![0]).toEqual(['https://example.com/image.jpg'])
    })

    it('should close modal when image is selected', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({
        results: [
          {
            provider: { name: 'provider', display_name: 'Provider' },
            images: [
              { url: 'https://example.com/image.jpg' }
            ]
          }
        ]
      })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await flushPromises()
      await wrapper.find('.image-item').trigger('click')

      const closeEmit = wrapper.emitted('close')
      expect(closeEmit).toBeTruthy()
    })
  })

  // ========== Keyboard Interaction Tests ==========
  describe('Keyboard Interaction', () => {
    it('should close modal when Escape key is pressed', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({ results: [] })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await flushPromises()

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(event)

      await flushPromises()
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not close modal on Escape when modal is not visible', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({ results: [] })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: false,
          artistName: 'Test Artist'
        }
      })

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(event)

      await flushPromises()
      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should not close on other key presses', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({ results: [] })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      document.dispatchEvent(event)

      await flushPromises()
      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })

  // ========== Image Error Handling Tests ==========
  describe('Image Error Handling', () => {
    it('should handle image load errors', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({
        results: [
          {
            provider: { name: 'provider', display_name: 'Provider' },
            images: [
              { url: 'https://example.com/image.jpg' }
            ]
          }
        ]
      })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await flushPromises()
      const img = wrapper.find('img')

      const errorEvent = new Event('error')
      Object.defineProperty(errorEvent, 'target', { value: img.element, enumerable: true })

      img.element.dispatchEvent(errorEvent)

      expect((img.element as HTMLImageElement).style.display).toBe('none')
    })
  })

  // ========== File Size Formatting Tests ==========
  describe('File Size Formatting', () => {
    it('should format bytes correctly', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({
        results: [
          {
            provider: { name: 'provider', display_name: 'Provider' },
            images: [
              { url: 'url1', width: 100, height: 100, size_bytes: 512 },
              { url: 'url2', width: 200, height: 200, size_bytes: 2048 },
              { url: 'url3', width: 300, height: 300, size_bytes: 2097152 }
            ]
          }
        ]
      })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await flushPromises()
      const sizeTexts = wrapper.findAll('.size-info')
      expect(sizeTexts.length).toBeGreaterThanOrEqual(1)
      // Check that formatting works correctly (size-info contains parens: (512 B))
      expect(sizeTexts.map(el => el.text())).toEqual(
        expect.arrayContaining(['(512 B)', '(2.0 KB)', '(2.0 MB)'])
      )
    })
  })

  // ========== Props Change Tests ==========
  describe('Props Change Handling', () => {
    it('should fetch images when artistName prop changes and isVisible is true', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({ results: [] })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Artist 1'
        }
      })

      await flushPromises()
      expect(coverArtLoader.getArtistCoverArt).toHaveBeenCalledWith('Artist 1')

      await wrapper.setProps({ artistName: 'Artist 2' })
      await flushPromises()

      // Should call twice - once for Artist 1, once for Artist 2
      expect(coverArtLoader.getArtistCoverArt).toHaveBeenCalledWith('Artist 2')
      expect(coverArtLoader.getArtistCoverArt).toHaveBeenCalledTimes(2)
    })

    it('should fetch images when isVisible changes from false to true', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({ results: [] })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: false,
          artistName: 'Test Artist'
        }
      })

      expect(coverArtLoader.getArtistCoverArt).not.toHaveBeenCalled()

      await wrapper.setProps({ isVisible: true })
      await flushPromises()

      expect(coverArtLoader.getArtistCoverArt).toHaveBeenCalledWith('Test Artist')
    })
  })

  // ========== Edge Cases ==========
  describe('Edge Cases', () => {
    it('should not fetch when artistName is empty', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({ results: [] })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: ''
        }
      })

      await flushPromises()
      expect(coverArtLoader.getArtistCoverArt).not.toHaveBeenCalled()
    })

    it('should not fetch when artistName is whitespace only', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({ results: [] })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: '   '
        }
      })

      await flushPromises()
      expect(coverArtLoader.getArtistCoverArt).not.toHaveBeenCalled()
    })

    it('should handle images without provider display name', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({
        results: [
          {
            provider: { name: 'provider_name', display_name: '' },
            images: [
              { url: 'https://example.com/image.jpg' }
            ]
          }
        ]
      })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await flushPromises()
      const badge = wrapper.find('.provider-badge')
      expect(badge.text()).toBe('provider_name')
    })

    it('should handle images without dimensions gracefully', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({
        results: [
          {
            provider: { name: 'provider', display_name: 'Provider' },
            images: [
              { url: 'https://example.com/image.jpg' }
            ]
          }
        ]
      })

      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: 'Test Artist'
        }
      })

      await flushPromises()
      expect(wrapper.find('.resolution-badge').exists()).toBe(false)
    })

    it('should handle special characters in artist name', async () => {
      vi.mocked(coverArtLoader.getArtistCoverArt).mockResolvedValue({ results: [] })

      const specialName = "Guns N' Roses & Co."
      const wrapper = mount(ArtistImageSelector, {
        props: {
          isVisible: true,
          artistName: specialName
        }
      })

      await flushPromises()
      expect(wrapper.text()).toContain(specialName)
      expect(coverArtLoader.getArtistCoverArt).toHaveBeenCalledWith(specialName)
    })
  })
})
