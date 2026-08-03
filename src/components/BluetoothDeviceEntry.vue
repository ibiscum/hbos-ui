<template>
  <div class="bluetooth-device-entry-div">
    <div class="bluetooth-device-entry-info-div">
      <h3><u>{{ name }}</u></h3>
      <div class="device-metadata">
        <span :class="['status-badge', connected ? 'green' : 'gray']">
          {{ connected ? "Connected" : "Disconnected" }}
        </span>
        <span v-if="!trusted" class="trust-badge untrusted">Untrusted</span>
        <span v-else class="trust-badge trusted">Trusted</span>
      </div>
    </div>
    <div class="bluetooth-device-entry-controls-div">
      <button @click="handleUnpair"
        class="btn-action btn-disconnect"
        :aria-label="`Unpair device ${name}`">Unpair</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppConfigStore } from '@/stores/appconfig'
import { apiFetch } from '@/api/http'
import { useToastStore } from '@/stores/toast'

const configStore = useAppConfigStore()
const apiBaseUrl = configStore.getConfigApiBaseUrl()

const props = defineProps<{
  name: string
  address: string
  connected: boolean
  trusted: boolean
  onUpdate?: () => void
}>()

const handleUnpair = async () => {
  const toastStore = useToastStore()
  try {
    // Encode address to handle special characters safely
    const encodedAddress = encodeURIComponent(props.address)
    const response = await apiFetch(
      `${apiBaseUrl}/bluetooth/unpair?address=${encodedAddress}`,
      { method: "POST" }
    )

    const data = await response.json()

    if (response.ok) {
      toastStore.showSuccessToast(`Device ${props.address} unpaired successfully.`)
      props.onUpdate?.()
    } else {
      const errorMessage = data?.error || 'Unknown error occurred'
      toastStore.showErrorToast(`Failed to unpair: ${errorMessage}`)
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    toastStore.showErrorToast(`Failed to unpair: ${errorMessage}`)
  }
}
</script>

<style scoped lang="scss">
@use '@/assets/scss/service-item' as *;

.bluetooth-device-entry-div {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;

  width: 100%;

  padding: 10px;
  margin: 5px;
  border: 2px solid var(--highlight-color-secondary);
  border-radius: 5px;
  gap: 10px;
}

.bluetooth-device-entry-info-div {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  flex: 1;
  gap: 8px;

  h3 {
    margin: 0;
    padding: 5px;
    word-break: break-word;
  }
}

.device-metadata {
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 0.875rem;
  font-weight: 500;

  &.green {
    background-color: rgba(34, 197, 94, 0.2);
    color: #22c55e;
    border: 1px solid #22c55e;
  }

  &.gray {
    background-color: rgba(156, 163, 175, 0.2);
    color: #6b7280;
    border: 1px solid #9ca3af;
  }
}

.trust-badge {
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;

  &.trusted {
    background-color: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
    border: 1px solid #3b82f6;
  }

  &.untrusted {
    background-color: rgba(239, 68, 68, 0.2);
    color: #ef4444;
    border: 1px solid #ef4444;
  }
}

.bluetooth-device-entry-controls-div {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-end;
}

.btn-action {
  &.btn-connect {
    @include service-button-primary;
  }

  &.btn-disconnect {
    @include service-button-danger;
  }

  &.btn-cancel {
    @include service-button-secondary;
  }
}

</style>
