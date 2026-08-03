<template>
  <router-link :to="to">
    <ContentBox
      class="content-box-link contentBoxLink"
      :style="heightStyle"
    >
      <slot></slot>
    </ContentBox>
  </router-link>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import { computed } from 'vue'
import ContentBox from '@/components/ContentBox.vue'

const { to, height } = defineProps<{ to: RouteLocationRaw, height?: number }>()

const heightStyle = computed(() => {
  if (typeof height !== 'number') {
    return undefined
  }

  return {
    height: `${height}px`,
  }
})
</script>

<style scoped lang="scss">
.content-box-link,
.contentBoxLink {
  padding: 20px;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }
}
</style>
