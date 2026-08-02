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
import ContentBox from '@/components/ContentBox.vue'

/**
 * TheAudioDB API configuration
 */
const API_ENDPOINT = 'https://www.theaudiodb.com/api/v1/artist.php'
const TEST_ARTIST_ID = '112024' // Well-known artist ID for connectivity testing
const REQUEST_TIMEOUT_MS = 5000 // 5 second timeout for API requests

interface Props {
  /** Display title for the service */
  title?: string
  /** Description of the service */
  description?: string
  /** Icon identifier */
  icon?: string
  /** Service key for logging purposes */
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
 * Uses AbortController to enforce request timeout
 */
const checkServiceStatus = async () => {
  isLoading.value = true
  errorMessage.value = null

  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS)

  try {
    // Test TheAudioDB API availability with a simple artist lookup
    const url = `${API_ENDPOINT}?i=${TEST_ARTIST_ID}`
    const response = await fetch(url, {
      method: 'GET',
      signal: abortController.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    isAvailable.value = !!(data.artists && Array.isArray(data.artists) && data.artists.length > 0)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    errorMessage.value = `Failed to check status: ${message}`
    isAvailable.value = false
    console.error(`[${props.serviceKey}] Service health check failed:`, error)
  } finally {
    clearTimeout(timeoutId)
    abortController.abort()
    isLoading.value = false
  }
}

onMounted(() => {
  checkServiceStatus()
})
</script>

<style scoped lang="scss">
// Configuration
$status-badge-padding: 4px 12px;
$status-badge-radius: 12px;
$status-badge-font-size: 0.875rem;
$status-icon-size: 1rem;
$status-gap: 6px;
$loading-section-padding: 12px 16px;
$loading-message-font-size: 0.875rem;
$error-message-font-size: 0.75rem;
$error-margin: 4px;

// Colors & Opacity
$status-color-green: #4abc8b;
$status-color-red: #ef4444;
$status-color-yellow: #eab308;
$status-bg-opacity: 0.1;
$loading-text-opacity: 0.6;
$border-opacity: 0.1;

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

        .service-status {
          display: flex;
          flex-direction: column;
          gap: $status-gap;
          margin-top: $status-gap;

          .status-badge {
            display: inline-flex;
            align-items: center;
            gap: $status-gap;
            padding: $status-badge-padding;
            border-radius: $status-badge-radius;
            font-size: $status-badge-font-size;
            font-weight: 500;
            width: fit-content;

            .status-icon {
              font-size: $status-icon-size;
              line-height: 1;
            }

            &.green {
              background-color: rgba($status-color-green, $status-bg-opacity);
              color: $status-color-green;

              .status-icon {
                color: $status-color-green;
              }
            }

            &.red {
              background-color: rgba($status-color-red, $status-bg-opacity);
              color: $status-color-red;

              .status-icon {
                color: $status-color-red;
              }
            }

            &.yellow {
              background-color: rgba($status-color-yellow, $status-bg-opacity);
              color: $status-color-yellow;

              .status-icon {
                color: $status-color-yellow;
              }
            }
          }

          .status-error {
            display: block;
            font-size: $error-message-font-size;
            color: $status-color-red;
            margin-top: $error-margin;
          }
        }
      }
    }
  }

  .loading-section {
    padding: $loading-section-padding;
    border-top: 1px solid rgba(255, 255, 255, $border-opacity);
    background: rgba(0, 0, 0, $border-opacity);

    .loading-content {
      .loading-message {
        font-size: $loading-message-font-size;
        color: rgba(255, 255, 255, $loading-text-opacity);
        margin: 0;
      }
    }
  }
}
</style>
