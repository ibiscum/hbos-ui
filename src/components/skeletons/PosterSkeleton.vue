<template>
  <div
    v-for="(_, index) in SKELETON_ITEMS_COUNT"
    :key="`skeleton-item-${index}`"
    class="poster-skeleton"
  >
    <div class="poster-skeleton__img">
      <AppSkeleton :shape="skeletonShape" />
    </div>
    <AppSkeleton width="100%" height="12px" class="poster-skeleton__row" />
    <AppSkeleton width="100%" height="12px" class="poster-skeleton__row" />
    <AppSkeleton v-if="isNote" width="100%" height="10px" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import AppSkeleton from '@/components/skeletons/AppSkeleton.vue'

type PosterForm = 'square' | 'circle'

interface PosterProps {
  posterForm?: PosterForm
  isNote?: boolean
}

const { posterForm = 'square', isNote = false } = defineProps<PosterProps>()

const SKELETON_ITEMS_COUNT = 8
const skeletonShape = computed<PosterForm>(() => (posterForm === 'circle' ? 'circle' : 'square'))
</script>

<style scoped lang="scss">
.poster-skeleton {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  &__img {
    margin-bottom: 10px;
    .skeleton {
      width: 140px;
      height: 140px;
      @include media-down(lg) {
        width: 100px;
        height: 100px;
      }
    }
  }
  &__row {
    margin-bottom: 8px;
  }
}
</style>
