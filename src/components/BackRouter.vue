<template>
  <router-link :to="to" v-bind="$attrs" class="back-router">
    <Icon icon="caret-down" />
    <span class="h1">
      <slot />
    </span>
  </router-link>
</template>

<script setup lang="ts">
/**
 * BackRouter Component - A stylized back navigation button
 *
 * A navigation component that provides a stylized back button with animated
 * hover effects. Renders a rotated caret icon with underline text decoration
 * that appears on hover. Built on top of Vue Router's router-link.
 *
 * @see docs/back-router.md for complete documentation and usage examples
 */

import Icon from '@/components/Icon.vue'

/**
 * Props for the BackRouter component
 */
interface BackRouterProps {
  /**
   * Target route for navigation
   * - String: simple path like "/albums"
   * - Object: route object like { name: 'AlbumDetail', params: { id: 123 } }
   * @default ''
   */
  to?: string | object
}

withDefaults(defineProps<BackRouterProps>(), {
  to: '',
})
</script>

<style scoped lang="scss">
.back-router {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 28px;
  @include media-down(lg) {
    min-height: 24px;
  }
  .h1 {
    margin-bottom: 0;
    text-decoration: underline;
    text-decoration-color: transparent;
    transition: all 0.2s linear;
  }
  svg {
    transform: rotate(90deg);
    color: var(--color-icon-primary);
    transition: all 0.2s linear;
  }
  &:hover {
    .h1 {
      text-decoration-color: var(--color-head);
    }
    svg {
      transform: rotate(90deg) translateY(2px);
    }
  }
}
</style>
