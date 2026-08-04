<template>
  <div>
    <BackRouter
      v-if="backrouterLink"
      :to="backrouterLink"
      class="back-router-header backrouter"
      :class="{ 'no-padding': headerHasContentBelow, noPadding: headerHasContentBelow }"
    >
      {{ title }}
    </BackRouter>

    <router-link
      v-else-if="hintLink && title"
      :to="hintLink"
      class="title-hint-link titleHintLink"
      :class="{ 'no-padding': headerHasContentBelow, noPadding: headerHasContentBelow }"
    >
      <h1>
        {{ title }}
      </h1>
      <span v-if="hintString" class="minimal-hint minimalHint">
        {{ hintString }}
      </span>
    </router-link>

    <h1
      v-else-if="title"
      :class="{ 'no-padding': headerHasContentBelow, noPadding: headerHasContentBelow }"
    >
      {{ title }}
    </h1>
    <div class="content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import BackRouter from '@/components/BackRouter.vue'
import type { RouteLocationRaw } from 'vue-router'

defineProps<{
  title?: string
  backrouterLink?: RouteLocationRaw
  hintLink?: RouteLocationRaw
  hintString?: string
  headerHasContentBelow?: boolean
}>()
</script>

<style scoped lang="scss">
h1,
.back-router-header,
.backrouter {
  padding-bottom: 25px;
  &.no-padding,
  &.noPadding {
    padding-bottom: 0;
  }
}

.title-hint-link,
.titleHintLink {
  color: var(--color-text);
  text-decoration: none;
  position: relative;
  display: inline-block;
  transition: color 0.3s ease;

  &:hover {
    color: var(--color-accent);
    cursor: pointer;

    .minimal-hint,
    .minimalHint {
      opacity: 1;
      visibility: visible;
    }
  }
}

.minimal-hint,
.minimalHint {
  position: absolute;
  top: 50%;
  color: var(--color-body);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 400;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  margin-top: 8px;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

  /* Create a CSS triangle */
  &::before {
    content: '';
    position: absolute;
    top: -4px;
    left: 50%;
    border: 4px solid transparent;
    border-bottom-color: var(--color-body);
  }
}
</style>
