<template>
  <ContentBox>
    <div class="card">
      <div class="service-item">
        <div class="service-main">
          <div class="service-info">
            <Icon :icon="icon" class="service-icon" />
            <div class="service-details">
              <h3>{{ title }}</h3>
              <p class="service-description">
                {{ description }}
              </p>
              <span
                :class="statusBadgeClass"
                role="status"
                :aria-label="`${title} service status: ${statusText}`"
              >
                {{ statusText }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ContentBox>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Icon from '@/components/Icon.vue'
import ContentBox from '@/components/ContentBox.vue'

interface Props {
  title?: string
  description?: string
  icon?: string
  statusText?: string
  statusVariant?: 'green' | 'red' | 'yellow' | 'gray'
}

const props = withDefaults(defineProps<Props>(), {
  title: 'MusicBrainz',
  description: 'MusicBrainz is used to retrieve additional artist, song and album metadata',
  icon: 'tabler/database',
  statusText: 'Active',
  statusVariant: 'green',
})

const title = computed(() => props.title)
const description = computed(() => props.description)
const icon = computed(() => props.icon)
const statusText = computed(() => props.statusText)
const statusBadgeClass = computed(() => `status-badge ${props.statusVariant}`)
</script>

<style scoped lang="scss">
@use '@/assets/scss/service-item' as *;

.service-item {
  @include service-item-base;

  .service-main {
    @include service-main-layout;

    .service-info {
      @include service-info-layout;

      .service-icon {
        @include service-icon-base;
      }

      .service-details {
        @include service-details-base;
      }
    }
  }
}
</style>
