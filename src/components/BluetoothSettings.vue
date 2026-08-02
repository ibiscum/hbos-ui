<template>
  <ContentBox class="card-content">
    <div class="bluetooth-settings-div">
      <div class="bluetooth-settings-pairs-div">
        <p>Enable pairing</p>
        <div class="toggle-container">
          <span v-if="discoverable && isCountdownActive" @click="resetCountdown" class="countdown"
            title="Click to reset timer">
            {{ discoverableCountdown }}s
          </span>
          <ToggleSwitch :model-value="discoverable" @update:model-value="toggleDiscoverable" />
        </div>
      </div>
      <div class="bluetooth-settings-pairs-div">
        <p>Pairing with password</p>
        <div class="toggle-container">
          <ToggleSwitch :model-value="capability === 'KeyboardOnly'" @update:model-value="togglePairingWithPassword" />
        </div>
      </div>
      <BluetoothSettingsModal v-model:open="modalOpen" />
    </div>
  </ContentBox>
</template>

<script setup lang="ts">
/* IMPORTS */
import { ref, onMounted, onUnmounted } from 'vue'
import { useAppConfigStore } from '@/stores/appconfig'
import { apiFetch } from '@/api/http'
import { useToastStore } from '@/stores/toast'
import ContentBox from '@/components/ContentBox.vue'
import BluetoothSettingsModal from '@/components/BluetoothSettings/BluetoothSettingsModal.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'

/* STORES */
const configStore = useAppConfigStore()
const toastStore = useToastStore()


/* GLOBAL DEFINITIONS */
const apiBaseUrl = configStore.getConfigApiBaseUrl()
const discoverable = ref(false)
const discoverableCountdown = ref(60)
const countdownInterval = ref<number | null>(null)
const isCountdownActive = ref(false)
const modalOpen = ref(false)
const modalShouldRequest = ref(false);
const capability = ref("KeyboardOnly")


/* FUNCTIONS */

/**
  * Callback function called after the component has been mounted.
  * This will get the bluetooth settings from the config-server
  * and adjust the values accordingly.
  */
onMounted(async () => {
  try {
    const response = await apiFetch(`${apiBaseUrl}/bluetooth/settings`)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const data = await response.json()

    // Validate response structure
    if (!data || !data.data || typeof data.data.capability !== 'string' || typeof data.data.discoverable !== 'boolean') {
      throw new Error('Invalid response structure from bluetooth settings API')
    }

    capability.value = data.data.capability
    discoverable.value = data.data.discoverable

    if (discoverable.value) {
      startCountdown()
    }

  } catch (error) {
    console.error('Failed to fetch bluetooth config:', error)
    toastStore.showErrorToast('Failed to fetch bluetooth config.')
  }
})

/**
  * Callback function called after the component has been unmounted.
  * This will stop the interval from continuing after the component
  * is not visible anymore.
  */
onUnmounted(() => {
  stopCountdown();
})

/**
  * Updates a setting in the hbos-bluetooth-service via the config-server.
  * Always returns boolean: true on success, false on failure.
  *
  * @param {string} key - The key of the setting.
  * @param {boolean | number | string} newValue - The new value that should be written into the config-server.
  * @returns {Promise<boolean>} True if update succeeded, false if failed
  */
async function updateSetting(key: string, newValue: boolean | number | string): Promise<boolean> {
  const valueString = typeof newValue === 'boolean' ? String(newValue).toLowerCase() : newValue
  const url = `${apiBaseUrl}/bluetooth/settings?${key}=${valueString}`

  try {
    const response = await apiFetch(url, { method: 'POST' })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    await response.json()
    return true
  } catch (error) {
    console.error('Failed to update setting:', error)
    return false
  }
}

/**
  * Starts the countdown inside the frontend. This will display
  * the countdown and also request the modal backend API each second.
  * If the time has ran out, it will close the modal and set the
  * discoverable value to false. This will also update the setting
  * inside the backend.
  */
function startCountdown() {
  isCountdownActive.value = true
  discoverableCountdown.value = 60
  updateSetting('discoverable_timeout', 60)
  modalShouldRequest.value = true

  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
  }

  countdownInterval.value = window.setInterval(() => {
    if (discoverableCountdown.value > 0) {
      discoverableCountdown.value--
      // Poll modal state every second only while countdown is active
      if (modalShouldRequest.value === true && isCountdownActive.value) {
        showModalIfTrue()
      }
    } else {
      // Countdown reached zero - stop discovery and clean up
      stopCountdown()
      discoverable.value = false
      updateSetting('discoverable', false)
      modalOpen.value = false
    }
  }, 1000)
}

/**
  * Request the backend modal API. Show the modal if it returns true/"true".
  * On error, continue polling but don't show error toast (avoid spam).
  */
async function showModalIfTrue() {
  try {
    const response = await apiFetch(`${apiBaseUrl}/bluetooth/modal`)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const data = await response.json()

    // Handle both boolean and string "true" responses from backend
    const shouldShowModal = data.modal === true || data.modal === 'true'
    if (shouldShowModal) {
      modalOpen.value = true
      modalShouldRequest.value = false
    }
  } catch (error) {
    console.error('Failed to fetch bluetooth modal:', error)
    // Don't show error toast to avoid spam during countdown polling
    // Continue polling to retry next second
  }
}

/**
  * Stops the countdown inside the frontend.
  */
function stopCountdown() {
  isCountdownActive.value = false
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
  }
}

/**
  * Toggles the discoverable mode (pairing mode).
  * Updates backend first, then UI state only on success.
  * If the pairing mode is set to false, also stops the countdown.
  */
async function toggleDiscoverable() {
  const newState = !discoverable.value

  try {
    const success = await updateSetting('discoverable', newState)
    if (!success) {
      toastStore.showErrorToast('Failed to toggle discoverable state.')
      return
    }

    discoverable.value = newState
    if (newState) startCountdown()
    else stopCountdown()
  } catch (error) {
    console.error('Failed to toggle discoverable state:', error)
    toastStore.showErrorToast('Failed to toggle discoverable state.')
  }
}

/**
  * Update the capability (pairing with password) in the backend.
  * It can either be `"NoInputNoOutput"` or `"KeyboardOnly"`.
  * `"KeyboardOnly"` enables passkey pairing.
  * `"NoInputNoOutput"` disables passkey pairing.
  * Updates backend first, then UI state only on success.
  *
  * Please look at the [hbos-bluetooth-service](https://github.com/arcathrax/hbos-bluetooth-service)
  * for all the available options.
  */
async function togglePairingWithPassword() {
  try {
    // Validate current state before toggling
    const validCapabilities = ['NoInputNoOutput', 'KeyboardOnly']
    if (!validCapabilities.includes(capability.value)) {
      console.error(`Invalid capability value: ${capability.value}`)
      toastStore.showErrorToast('Invalid pairing capability setting.')
      return
    }

    const newCapability = capability.value === 'NoInputNoOutput' ? 'KeyboardOnly' : 'NoInputNoOutput'
    const success = await updateSetting('capability', newCapability)
    if (!success) {
      toastStore.showErrorToast('Failed to toggle pairing with password.')
      return
    }

    capability.value = newCapability
  } catch (error) {
    console.error('Failed to toggle pairing with password:', error)
    toastStore.showErrorToast('Failed to toggle pairing with password.')
  }
}

/**
  * Resets the countdown. This is called when the user clicks the countdown.
  * Only works while countdown is active. Resets to 60 seconds.
  * This will update the UI and send the setting to the backend.
  */
function resetCountdown() {
  // Guard: only allow reset if countdown is active and discoverable is enabled
  if (!isCountdownActive.value || !discoverable.value) {
    return
  }
  discoverableCountdown.value = 60
  updateSetting('discoverable_timeout', 60)
}
</script>

<style scoped lang="scss">
@use '@/assets/scss/service-item' as *;

.card-content {
  padding: 20px;
  @include service-item-base;
}

.bluetooth-settings-pairs-div {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 15px;
}

.bluetooth-settings-pairs-div p:nth-child(odd) {
  font-weight: bold;
}

.toggle-container {
  display: flex;
  align-items: center;
  gap: 16px;
}

.countdown {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-body-secondary);
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: var(--primary);
  }
}

</style>
