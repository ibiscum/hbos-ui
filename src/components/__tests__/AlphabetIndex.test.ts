import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'
import AlphabetIndex from '../../components/AlphabetIndex.vue'

describe('AlphabetIndex.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render when availableLetters is not empty', () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [
            { name: 'Alice', $id: '1' },
            { name: 'Bob', $id: '2' },
          ],
        },
      })
      expect(wrapper.find('.alphabet-index').exists()).toBe(true)
    })

    it('should not render when no items are provided', () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [],
        },
      })
      expect(wrapper.find('.alphabet-index').exists()).toBe(false)
    })

    it('should not render when items have no available letters', () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: '@invalid' }, { name: '!special' }],
        },
      })
      expect(wrapper.find('.alphabet-index').exists()).toBe(false)
    })
  })

  describe('Available Letters Computation', () => {
    it('should extract available letters from items', () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [
            { name: 'Alice' },
            { name: 'Bob' },
            { name: 'Charlie' },
          ],
        },
      })
      const buttons = wrapper.findAll('.letter-btn.available')
      const letters = buttons.map(b => b.text())
      expect(letters).toContain('A')
      expect(letters).toContain('B')
      expect(letters).toContain('C')
    })

    it('should add # when numeric items exist', () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [
            { name: '123 Main Street' },
            { name: 'Alice' },
          ],
        },
      })
      const buttons = wrapper.findAll('.letter-btn.available')
      const letters = buttons.map(b => b.text())
      expect(letters[0]).toBe('#')
    })

    it('should not add # when no numeric items exist', () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: 'Alice' }],
        },
      })
      const buttons = wrapper.findAll('.letter-btn.available')
      const letters = buttons.map(b => b.text())
      expect(letters[0]).toBe('A')
    })

    it('should handle mixed case names correctly', () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [
            { name: 'alice' },
            { name: 'Bob' },
            { name: 'CHARLIE' },
          ],
        },
      })
      const buttons = wrapper.findAll('.letter-btn.available')
      const letters = buttons.map(b => b.text())
      expect(letters).toContain('A')
      expect(letters).toContain('B')
      expect(letters).toContain('C')
    })

    it('should sort available letters alphabetically', () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [
            { name: 'Zoe' },
            { name: 'Alice' },
            { name: 'Bob' },
          ],
        },
      })
      const buttons = wrapper.findAll('.letter-btn.available')
      const letters = buttons.map(b => b.text())
      expect(letters).toEqual(['A', 'B', 'Z'])
    })

    it('should handle duplicate starting letters', () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [
            { name: 'Alice' },
            { name: 'Amy' },
            { name: 'Andrew' },
          ],
        },
      })
      const buttons = wrapper.findAll('.letter-btn.available')
      const letters = buttons.map(b => b.text())
      expect(letters).toEqual(['A'])
    })

    it('should ignore special characters and numbers in middle of names', () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [
            { name: 'Alice-Smith' },
            { name: "Bob's Place" },
            { name: 'Charlie123' },
          ],
        },
      })
      const buttons = wrapper.findAll('.letter-btn.available')
      const letters = buttons.map(b => b.text())
      expect(letters).toEqual(['A', 'B', 'C'])
    })
  })

  describe('Button Availability States', () => {
    it('should mark available letters with available class', () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: 'Alice' }],
        },
      })
      const availableBtn = wrapper.find('.letter-btn.available')
      expect(availableBtn.exists()).toBe(true)
      expect(availableBtn.text()).toBe('A')
    })

    it('should mark unavailable letters with disabled class', () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: 'Alice' }],
        },
      })
      const buttons = wrapper.findAll('.letter-btn.disabled')
      expect(buttons.length).toBeGreaterThan(0)
      const disabledLetters = buttons.map(b => b.text())
      expect(disabledLetters).toContain('B')
      expect(disabledLetters).toContain('C')
    })

    it('should disable unavailable letter buttons', () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: 'Alice' }],
        },
      })
      const buttons = wrapper.findAll('.letter-btn.disabled')
      expect(buttons[0].attributes('disabled')).toBe('')
    })

    it('should not disable available letter buttons', () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: 'Alice' }],
        },
      })
      const button = wrapper.find('.letter-btn.available')
      expect(button.attributes('disabled')).toBeUndefined()
    })
  })

  describe('Letter Click Behavior', () => {
    it('should emit letter-click event when available letter is clicked', async () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: 'Alice' }, { name: 'Bob' }],
        },
      })
      const letterBtn = wrapper.find('.letter-btn.available')
      await letterBtn.trigger('click')
      expect(wrapper.emitted('letter-click')).toBeTruthy()
      expect(wrapper.emitted('letter-click')?.[0]).toEqual(['A'])
    })

    it('should not emit event when disabled letter is clicked', async () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: 'Alice' }],
        },
      })
      const disabledBtn = wrapper.find('.letter-btn.disabled')
      await disabledBtn.trigger('click')
      expect(wrapper.emitted('letter-click')).toBeFalsy()
    })

    it('should handle # button (scroll to top)', async () => {
      const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: '123 Main' }, { name: 'Alice' }],
        },
      })
      const hashBtn = wrapper.find('.letter-btn.available')
      expect(hashBtn.text()).toBe('#')
      await hashBtn.trigger('click')
      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 0,
        behavior: 'smooth',
      })
      expect(wrapper.emitted('letter-click')).toBeFalsy()
      scrollToSpy.mockRestore()
    })

    it('should emit letter-click for regular letters not #', async () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: 'Alice' }, { name: '123' }],
        },
      })
      const letterBtn = wrapper.findAll('.letter-btn.available').find(
        b => b.text() === 'A'
      )
      await letterBtn?.trigger('click')
      expect(wrapper.emitted('letter-click')?.[0]).toEqual(['A'])
    })
  })

  describe('Auto-Hide Behavior', () => {
    it('should start visible on mount', () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: 'Alice' }],
        },
      })
      expect(wrapper.find('.alphabet-index').classes()).toContain('visible')
    })

    it('should hide after 2 seconds of inactivity', async () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: 'Alice' }],
        },
      })
      vi.advanceTimersByTime(2000)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.alphabet-index').classes()).not.toContain('visible')
    })

    it('should show again on scroll', async () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: 'Alice' }],
        },
      })
      vi.advanceTimersByTime(2000)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.alphabet-index').classes()).not.toContain('visible')

      window.dispatchEvent(new Event('scroll'))
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.alphabet-index').classes()).toContain('visible')
    })

    it('should reset hide timer on scroll', async () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: 'Alice' }],
        },
      })
      vi.advanceTimersByTime(1500)
      window.dispatchEvent(new Event('scroll'))
      await wrapper.vm.$nextTick()
      vi.advanceTimersByTime(1500)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.alphabet-index').classes()).toContain('visible')

      vi.advanceTimersByTime(600)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.alphabet-index').classes()).not.toContain('visible')
    })

    it('should reset hide timer when letter is clicked', async () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: 'Alice' }],
        },
      })
      vi.advanceTimersByTime(1500)
      const letterBtn = wrapper.find('.letter-btn.available')
      await letterBtn.trigger('click')
      await wrapper.vm.$nextTick()
      vi.advanceTimersByTime(1500)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.alphabet-index').classes()).toContain('visible')

      vi.advanceTimersByTime(600)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.alphabet-index').classes()).not.toContain('visible')
    })

    it('should clear timeout on unmount', () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: 'Alice' }],
        },
      })
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      wrapper.unmount()
      expect(clearTimeoutSpy).toHaveBeenCalled()
      clearTimeoutSpy.mockRestore()
    })
  })

  describe('Event Listeners', () => {
    it('should add scroll listener on mount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      mount(AlphabetIndex, {
        props: {
          items: [{ name: 'Alice' }],
        },
      })
      expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), {
        passive: true,
      })
      addEventListenerSpy.mockRestore()
    })

    it('should remove scroll listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: 'Alice' }],
        },
      })
      wrapper.unmount()
      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
      removeEventListenerSpy.mockRestore()
    })
  })

  describe('Edge Cases', () => {
    it('should handle items with empty names', () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: '' }, { name: 'Alice' }],
        },
      })
      expect(wrapper.find('.alphabet-index').exists()).toBe(true)
      const buttons = wrapper.findAll('.letter-btn.available')
      expect(buttons.map(b => b.text())).toEqual(['A'])
    })

    it('should handle items with only special characters', () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: '@#$%' }, { name: 'Alice' }],
        },
      })
      const buttons = wrapper.findAll('.letter-btn.available')
      expect(buttons.map(b => b.text())).toEqual(['A'])
    })

    it('should handle unicode characters', () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [
            { name: 'Ångström' },
            { name: 'Élise' },
            { name: 'Öztürk' },
            { name: 'Alice' },
          ],
        },
      })
      const buttons = wrapper.findAll('.letter-btn.available')
      const letters = buttons.map(b => b.text())
      // Unicode characters are handled by JavaScript's toUpperCase()
      // Å, É, Ö should be preserved as they are already uppercase or become uppercase
      expect(letters).toContain('A')
      // Note: Unicode handling depends on JavaScript's toUpperCase() implementation
      // For this test, we just verify that unicode names don't cause errors
      expect(buttons.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle very long item lists', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({
        name: String.fromCharCode(65 + (i % 26)), // A-Z repeating
      }))
      const wrapper = mount(AlphabetIndex, {
        props: { items },
      })
      const buttons = wrapper.findAll('.letter-btn.available')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should handle all 26 letters', () => {
      const items = Array.from({ length: 26 }, (_, i) => ({
        name: String.fromCharCode(65 + i),
      }))
      const wrapper = mount(AlphabetIndex, {
        props: { items },
      })
      const buttons = wrapper.findAll('.letter-btn.available')
      expect(buttons.length).toBe(26)
    })

    it('should handle items with $id property', () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [
            { name: 'Alice', $id: 'id-1' },
            { name: 'Bob', $id: 'id-2' },
          ],
        },
      })
      expect(wrapper.find('.alphabet-index').exists()).toBe(true)
      const buttons = wrapper.findAll('.letter-btn.available')
      expect(buttons.length).toBe(2)
    })
  })

  describe('Regression Tests', () => {
    it('should not leak timers across multiple instances', async () => {
      const wrapper1 = mount(AlphabetIndex, {
        props: {
          items: [{ name: 'Alice' }],
        },
      })
      const wrapper2 = mount(AlphabetIndex, {
        props: {
          items: [{ name: 'Bob' }],
        },
      })

      vi.advanceTimersByTime(2000)
      await wrapper1.vm.$nextTick()
      await wrapper2.vm.$nextTick()
      expect(wrapper1.find('.alphabet-index').classes()).not.toContain('visible')
      expect(wrapper2.find('.alphabet-index').classes()).not.toContain('visible')

      wrapper1.unmount()
      wrapper2.unmount()
    })

    it('should handle rapid scroll events without errors', async () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: 'Alice' }],
        },
      })

      for (let i = 0; i < 100; i++) {
        window.dispatchEvent(new Event('scroll'))
      }

      expect(wrapper.find('.alphabet-index').exists()).toBe(true)
    })

    it('should handle rapid letter clicks without errors', async () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }],
        },
      })
      const buttons = wrapper.findAll('.letter-btn.available')

      for (const btn of buttons) {
        await btn.trigger('click')
      }

      expect(wrapper.emitted('letter-click')).toBeTruthy()
    })

    it('should maintain visible state correctly during timer resets', async () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: 'Alice' }],
        },
      })

      vi.advanceTimersByTime(1000)
      window.dispatchEvent(new Event('scroll'))
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.alphabet-index').classes()).toContain('visible')

      vi.advanceTimersByTime(1000)
      window.dispatchEvent(new Event('scroll'))
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.alphabet-index').classes()).toContain('visible')

      vi.advanceTimersByTime(2000)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.alphabet-index').classes()).not.toContain('visible')
    })

    it('should not throw when scrollToLetter is called with invalid letter', async () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: 'Alice' }],
        },
      })

      const vm = wrapper.vm as unknown as ComponentPublicInstance & { scrollToLetter: (letter: string) => void }
      expect(() => {
        vm.scrollToLetter('Z')
      }).not.toThrow()
      expect(wrapper.emitted('letter-click')).toBeFalsy()
    })
  })

  describe('Visual States', () => {
    it('should have correct styling classes for # button', () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: '123' }, { name: 'Alice' }],
        },
      })
      const hashBtn = wrapper.find('.letter-btn')
      expect(hashBtn.text()).toBe('#')
      expect(hashBtn.classes()).toContain('available')
    })

    it('should have correct classes for disabled buttons', () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: [{ name: 'Alice' }],
        },
      })
      const disabledBtn = wrapper.find('.letter-btn.disabled')
      expect(disabledBtn.classes()).toContain('disabled')
      expect(disabledBtn.classes('available')).toBe(false)
    })

    it('should render all alphabet buttons', () => {
      const wrapper = mount(AlphabetIndex, {
        props: {
          items: Array.from({ length: 26 }, (_, i) => ({
            name: String.fromCharCode(65 + i),
          })),
        },
      })
      const allButtons = wrapper.findAll('.letter-btn')
      expect(allButtons.length).toBe(27) // 26 letters + 1 hash
    })
  })
})
