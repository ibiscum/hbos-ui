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
              <div class="service-status">
                <span
                  :class="statusBadgeClass"
                  role="status"
                  :aria-label="`${title} service status: ${statusText}`"
                >
                  <span class="status-icon" aria-hidden="true">●</span>
                  {{ statusText }}
                </span>
                <span v-if="errorMessage" class="status-error" role="alert">
                  {{ errorMessage }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="loading-section">
          <div class="loading-content">
            <p class="loading-message">Checking service status...</p>
          </div>
        </div>
      </div>
    </div>
  </ContentBox>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Icon from '@/components/Icon.vue'
import ContentBox from "@/components/ContentBox.vue"

interface Props {
  title?: string
  description?: string
  icon?: string
  serviceKey?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'TheAudioDB',
  description: 'TheAudioDB is used to retrieve additional artist images and biographies',
  icon: 'tabler/database',
  serviceKey: 'theaudiodb',
})

const isLoading = ref(false)
const isAvailable = ref(true)
const errorMessage = ref<string | null>(null)

const statusText = computed(() => {
  if (isLoading.value) return 'Checking...'
  return isAvailable.value ? 'Active' : 'Unavailable'
})

const statusBadgeClass = computed(() => {
  if (isLoading.value) return 'status-badge yellow'
  return isAvailable.value ? 'status-badge green' : 'status-badge red'
})

/**
 * Check TheAudioDB service availability by making a test request
 */
const checkServiceStatus = async () => {
  isLoading.value = true
  errorMessage.value = null

  try {
    // Test TheAudioDB API availability with a simple artist lookup
    // Using a well-known artist ID to verify connectivity
    const response = await fetch('https://www.theaudiodb.com/api/v1/artist.php?i=112024', {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    isAvailable.value = data.artists && data.artists.length > 0
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    errorMessage.value = `Failed to check status: ${message}`
    isAvailable.value = false
    console.error(`[${props.serviceKey}] Service health check failed:`, error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  checkServiceStatus()
})
</script>

<style scoped lang="scss">
@import '@/assets/scss/service-item';

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

        .service-status {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 8px;

          .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.875rem;
            font-weight: 500;
            width: fit-content;

            .status-icon {
              font-size: 1rem;
              line-height: 1;
            }

            &.green {
              background-color: rgba(74, 188, 139, 0.1);
              color: #4abc8b;

              .status-icon {
                color: #4abc8b;
              }
            }

            &.red {
              background-color: rgba(239, 68, 68, 0.1);
              color: #ef4444;

              .status-icon {
                color: #ef4444;
              }
            }

            &.yellow {
              background-color: rgba(234, 179, 8, 0.1);
              color: #eab308;

              .status-icon {
                color: #eab308;
              }
            }
          }

          .status-error {
            display: block;
            font-size: 0.75rem;
            color: #ef4444;
            margin-top: 4px;
          }
        }
      }
    }
  }

  .loading-section {
    padding: 12px 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.1);

    .loading-content {
      .loading-message {
        font-size: 0.875rem;
        color: rgba(255, 255, 255, 0.6);
        margin: 0;
      }
    }
  }
}
</style>
