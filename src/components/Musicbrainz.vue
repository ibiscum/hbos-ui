<template>
  <ContentBox>
    <div class="card">
      <div class="service-item">
        <div class="service-main">
          <div class="service-info">
            <Icon :icon="props.icon" class="service-icon" />
            <div class="service-details">
              <h3>{{ props.title }}</h3>
              <p class="service-description">
                {{ props.description }}
              </p>
              <div class="service-status">
                <span
                  :class="statusBadgeClass"
                  role="status"
                  :aria-label="statusAriaLabel"
                >
                  {{ props.statusText }}
                </span>
              </div>
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

const statusBadgeClass = computed(() => ['status-badge', props.statusVariant])
const statusAriaLabel = computed(() => `${props.title} service status: ${props.statusText}`)
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
