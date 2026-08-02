<template>
  <div v-if="availableLetters.length > 0" class="alphabet-index" :class="{ visible: isVisible }" role="navigation" aria-label="Alphabetic index">
    <div class="alphabet-scrollbar">
      <button
        v-for="letter in alphabet"
        :key="letter"
        :class="['letter-btn', {
          available: availableLetters.includes(letter),
          disabled: !availableLetters.includes(letter)
        }]"
        :aria-label="`Jump to ${letter === '#' ? 'numbers' : letter}`"
        :title="`Jump to ${letter === '#' ? 'numbers' : letter}`"
        @click="scrollToLetter(letter)"
        :disabled="!availableLetters.includes(letter)"
      >
        {{ letter }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'

/**
 * Regular expressions for character validation
 */
const REGEX_NUMBER = /[0-9]/
const REGEX_LETTER = /[A-Z]/

/**
 * Configuration constants
 */
const HIDE_TIMEOUT_MS = 2000
const HASH_SYMBOL = '#'

interface AlphabetIndexProps {
  /** Array of items with name property to index */
  items: Array<{ name: string; $id?: string }>
}

const props = withDefaults(defineProps<AlphabetIndexProps>(), {
  items: () => [],
})

const emit = defineEmits<{
  /**
   * Emitted when a letter button is clicked
   * @param letter The selected letter (A-Z only, not for #)
   */
  'letter-click': [letter: string]
}>()

const alphabet = [HASH_SYMBOL, ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')]
const isVisible = ref(true)
let hideTimeout: number | null = null

/**
 * Extracts available letters from items based on first character
 * Returns letters sorted alphabetically, with # prepended if numeric items exist
 */
const availableLetters = computed(() => {
  const letters = new Set<string>()
  let hasNumbers = false

  props.items.forEach(item => {
    const name = item?.name?.trim?.()
    if (!name || name.length === 0) {
      return
    }

    const firstChar = name.charAt(0).toUpperCase()
    if (REGEX_NUMBER.test(firstChar)) {
      hasNumbers = true
    } else if (REGEX_LETTER.test(firstChar)) {
      letters.add(firstChar)
    }
  })

  const result = Array.from(letters).sort()
  if (hasNumbers) {
    result.unshift(HASH_SYMBOL)
  }

  return result
})

/**
 * Resets the hide timer:
 * 1. Clears any existing timeout
 * 2. Makes the scrollbar visible
 * 3. Sets a new timeout to hide after HIDE_TIMEOUT_MS
 */
const resetHideTimer = () => {
  // Clear existing timeout
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }

  // Show the scrollbar
  isVisible.value = true

  // Set new timeout to hide after configured time
  hideTimeout = window.setTimeout(() => {
    isVisible.value = false
  }, HIDE_TIMEOUT_MS)
}

/**
 * Handles scroll events and resets the hide timer
 */
const handleScroll = () => {
  resetHideTimer()
}

/**
 * Scrolls to a specific letter or scrolls to top for # (numbers)
 * @param letter The letter to scroll to or # for numbers
 */
const scrollToLetter = (letter: string) => {
  if (!availableLetters.value.includes(letter)) {
    return
  }

  if (letter === HASH_SYMBOL) {
    // Special case: scroll to top for numbers
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  } else {
    // Emit event for regular letters - parent handles scrolling
    emit('letter-click', letter)
  }

  // Reset timer after user interaction
  resetHideTimer()
}

onMounted(() => {
  // Listen for scroll events on the main content area
  window.addEventListener('scroll', handleScroll, { passive: true })
  // Start the initial timer
  resetHideTimer()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }
})
</script>

<style scoped lang="scss">
// Configuration
$position-right: 20px;
$position-top: 50%;
$transition-duration: 0.4s;
$hide-breakpoint: 768px;
$button-width: 24px;
$button-height: 20px;
$button-margin: 1px;
$button-radius: 4px;
$container-padding: 8px 4px;
$container-radius: 20px;
$blur-amount: 5px;
$hash-font-size: 12px;
$letter-font-size: 11px;

.alphabet-index {
  position: fixed;
  right: $position-right;
  top: $position-top;
  transform: translateY(-50%);
  z-index: 100;
  pointer-events: auto;
  opacity: 0;
  visibility: hidden;
  transition: opacity $transition-duration ease, visibility $transition-duration ease;

  &.visible {
    opacity: 1;
    visibility: visible;
  }
}

.alphabet-scrollbar {
  display: flex;
  flex-direction: column;
  background: rgba(12, 12, 12, 0.01);
  backdrop-filter: blur($blur-amount);
  border-radius: $container-radius;
  padding: $container-padding;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.letter-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: $button-width;
  height: $button-height;
  margin: $button-margin 0;
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: $letter-font-size;
  font-weight: 500;
  cursor: pointer;
  border-radius: $button-radius;
  transition: all 0.2s ease;
  line-height: 1;

  &.available {
    &:hover {
      background: rgba(255, 255, 255, 0.2);
      color: var(--color-primary);
      transform: scale(1.1);
    }

    &:active {
      transform: scale(0.95);
    }
  }

  &.disabled {
    color: rgba(var(--color-text-rgb), 0.3);
    cursor: default;
  }

  // Special styling for the # button
  &:first-child {
    font-weight: 600;
    font-size: $hash-font-size;
  }
}

// Hide on mobile devices
@media (max-width: $hide-breakpoint) {
  .alphabet-index {
    display: none;
  }
}
</style>
