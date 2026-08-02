<template>
  <ContentBox class="card-content">
    <h2>Devices</h2>
    <div class="bluetooth-devices-div">
      <p v-if="loading">Loading devices...</p>
      <p v-if="error" class="error">{{ error }}</p>

      <div v-if="!loading && !error" class="bluetooth-device-list">
        <template v-if="devices.length > 0">
          <BluetoothDeviceEntry
            v-for="device in devices"
            :key="device.address"
            :name="device.name"
            :address="device.address"
            :connected="device.connected"
            :trusted="device.trusted"
            :onUpdate="fetchDevices"
          />
        </template>
        <p v-else>No paired devices found.</p>
      </div>
    </div>
  </ContentBox>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAppConfigStore } from '@/stores/appconfig'
import { apiFetch } from '@/api/http'
import BluetoothDeviceEntry from '@/components/BluetoothDeviceEntry.vue'
import ContentBox from '@/components/ContentBox.vue'

const configStore = useAppConfigStore()
const apiBaseUrl = configStore.getConfigApiBaseUrl()


interface BluetoothDevice {
  address: string
  connected: boolean
  name: string
  trusted: boolean
}

const devices = ref<BluetoothDevice[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const retryCount = ref(0)
const MAX_RETRIES = 3

/**
  * Type guard to validate BluetoothDevice response structure
  */
function isValidDevice(device: unknown): device is BluetoothDevice {
  if (typeof device !== 'object' || device === null) return false
  const obj = device as Record<string, unknown>
  return (
    typeof obj.address === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.connected === 'boolean' &&
    typeof obj.trusted === 'boolean'
  )
}

/**
  * Fetches and validates bluetooth paired devices from the backend.
  * Validates response structure and individual device objects.
  * Retries up to MAX_RETRIES times on failure.
  */
const fetchDevices = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await apiFetch(`${apiBaseUrl}/bluetooth/paired-devices`)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const result = await response.json()

    // Validate response structure
    if (!result || !Array.isArray(result.data)) {
      throw new Error('Invalid response structure: expected data array')
    }

    // Validate each device object
    const validatedDevices = result.data.filter((device: unknown) => {
      if (!isValidDevice(device)) {
        console.warn('Invalid device structure:', device)
        return false
      }
      return true
    })

    devices.value = validatedDevices
    retryCount.value = 0 // Reset retry counter on success
  } catch (err) {
    console.error('Failed to fetch devices:', err)
    error.value = 'Failed to load Bluetooth devices.'

    // Attempt retry for transient errors
    if (retryCount.value < MAX_RETRIES) {
      retryCount.value++
      console.log(`Retrying device fetch (${retryCount.value}/${MAX_RETRIES})...`)
      // Retry after 1 second
      setTimeout(() => {
        fetchDevices()
      }, 1000)
    }
  } finally {
    loading.value = false
  }
}

onMounted(fetchDevices)
</script>

<style scoped lang="scss">
.card-content {
  padding: 20px;
}

.bluetooth-devices-div {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-items: center;
  align-items: center;
}

.bluetooth-device-list {
  width: 95%;
  display: flex;
  flex-direction: column;
  justify-items: center;
  align-items: center;
}

.error {
  color: red;
}
</style>
