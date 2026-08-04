<template>
  <PageContent>
    <div class="page-header">
      <BackRouter :to="{name: 'services'}">
        Display Settings
      </BackRouter>
    </div>

    <div class="display-content">
      <div class="info-card">
        <div class="card-header">
          <Icon icon="monitor" class="card-icon" />
          <h2>Display Configuration</h2>
        </div>
        <p>Configure display settings for your system.</p>
      </div>
      <div class="info-card">
        <div class="toggle-row">
          <div class="toggle-label">
            <h2>Dark mode</h2>
            <p id="dark-mode-description" class="toggle-description">System appearance preference</p>
          </div>
          <ToggleSwitch
            v-model="isDark"
            :disabled="isLoadingDarkMode"
            :loading="isLoadingDarkMode"
            aria-label="Toggle dark mode"
            aria-describedby="dark-mode-description"
          />
        </div>
      </div>
      <Transition name="slide-fade">
        <div v-if="showVuMeterToggle" class="info-card">
          <div class="toggle-row">
            <div class="toggle-label">
              <h2>VU meter</h2>
              <p id="vu-meter-description" class="toggle-description">Audio level visualization (Pi 5+)</p>
            </div>
            <ToggleSwitch
              :modelValue="vuMeterState"
              :disabled="isLoadingVuMeter || !settingsStore.loaded"
              :loading="isLoadingVuMeter"
              @update:modelValue="handleVuMeterToggle"
              aria-label="Toggle VU meter"
              aria-describedby="vu-meter-description"
            />
          </div>
        </div>
      </Transition>
    </div>
  </PageContent>
</template>

<script setup lang="ts">
import { useDark } from '@vueuse/core'
import { ref, computed } from 'vue'
import BackRouter from '@/components/BackRouter.vue'
import Icon from '@/components/Icon.vue'
import PageContent from '@/components/PageContent.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import { useSettingsStore } from '@/stores/settings'
import { useToastStore } from '@/stores/toast'

const isDark = useDark()
const settingsStore = useSettingsStore()
const toastStore = useToastStore()

// Loading states
const isLoadingDarkMode = ref(false)
const isLoadingVuMeter = ref(false)

// VU meter state with validation
const vuMeterState = computed(() => {
  // Validate that getVuMeterEnabled exists and is a boolean
  if (settingsStore.getVuMeterEnabled === undefined || settingsStore.getVuMeterEnabled === null) {
    return false
  }
  return Boolean(settingsStore.getVuMeterEnabled)
})

// Conditional rendering with guard
const showVuMeterToggle = computed(() => {
  // Guard against missing computed property
  if (settingsStore.isPi5OrHigher === undefined || settingsStore.isPi5OrHigher === null) {
    return false
  }
  return Boolean(settingsStore.isPi5OrHigher)
})

/**
 * Handle VU meter toggle with error handling and user feedback
 * @param value - The new toggle state
 */
const handleVuMeterToggle = async (value: boolean) => {
  isLoadingVuMeter.value = true

  try {
    await settingsStore.updateVuMeterEnabled(value)
    toastStore.showSuccessToast(`VU meter ${value ? 'enabled' : 'disabled'}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update VU meter'
    console.error('[display.vue] VU meter toggle error:', error)
    toastStore.showErrorToast(errorMessage)
  } finally {
    isLoadingVuMeter.value = false
  }
}
</script>

<style scoped lang="scss">
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;

  h1 {
    margin: 0;
    color: var(--color-head);
  }
}

.display-content {
  display: grid;
  gap: 24px;

  .info-card {
    background: var(--background-card);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 24px;

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;

      .card-icon {
        width: 20px;
        height: 20px;
        color: var(--color-primary);
      }

      h2 {
        margin: 0;
        color: var(--color-head);
        font-size: 1.25rem;
        font-weight: 600;
      }
    }

    p {
      margin: 0;
      color: var(--color-body-secondary);
      line-height: 1.6;
    }
  }
}

.toggle-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;

  .toggle-label {
    flex: 1;
    min-width: 150px;

    h2 {
      margin: 0 0 4px 0;
      color: var(--color-head);
      font-size: 1rem;
      font-weight: 600;
    }

    .toggle-description {
      margin: 0;
      color: var(--color-body-secondary);
      font-size: 0.875rem;
      line-height: 1.4;
    }
  }
}

/* Smooth transition for conditional VU meter visibility */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  transform: translateX(-10px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(-10px);
  opacity: 0;
}

/* Responsive design for small screens */
@media (max-width: 640px) {
  .toggle-row {
    flex-direction: column;
    align-items: stretch;

    .toggle-label {
      min-width: auto;
      margin-bottom: 8px;
    }
  }

  .display-content {
    gap: 16px;

    .info-card {
      padding: 16px;
    }
  }
}
</style>
