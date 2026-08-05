<template>
  <Teleport to="body">
    <div v-if="open" class="modal">
      <ContentBox>
        <div class="modal-content">
          <h1>Enter Passkey</h1>

          <input
            v-model="passkey"
            maxlength="6"
            inputmode="numeric"
            aria-label="Bluetooth passkey"
            @input="sanitizePasskey"
          />

          <div class="modal-buttons-div">
            <button type="button" @click="close()">Close</button>
            <button type="button" :disabled="passkey.length !== 6" @click="sendPasskey()">
              Enter
            </button>
          </div>
        </div>
      </ContentBox>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/* IMPORTS */
import { ref } from 'vue'
import { useAppConfigStore } from '@/stores/appconfig'
import { apiFetch } from '@/api/http'
import ContentBox from '@/components/ContentBox.vue'


/* PROPS */
const { open } = defineProps({
  open: { type: Boolean, required: true }
})


/* GLOBAL DEFINITIONS */
const configStore = useAppConfigStore()
const apiBaseUrl = configStore.getConfigApiBaseUrl()
const emit = defineEmits(['update:open'])
const passkey = ref('')


/* FUNCTIONS */

/**
  * This function will be run when the "close" button is clicked.
  * It is not used anywhere else and is just here, so the code is
  * not directly inside of the button.
  */
function close() {
  passkey.value = ''
  emit('update:open', false)
}

/**
  * Keep passkey numeric and limited to 6 digits.
  */
function sanitizePasskey() {
  passkey.value = passkey.value.replace(/\D/g, '').slice(0, 6)
}

/**
  * Sends the passkey to the config-server.
  * This function is called when the "send" button is pressed.
  */
async function sendPasskey() {
  if (passkey.value.length !== 6) {
    return
  }

  try {
    const response = await apiFetch(`${apiBaseUrl}/bluetooth/passkey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passkey: passkey.value })
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    await response.json()
    close()
  } catch (error) {
    console.error('Failed to send passkey:', error)
  }
}
</script>

<style scoped>
button {
  color: var(--color-body);
  transition: all 0.25s;
}

button:disabled, button:disabled:hover {
  color: var(--color-body);
  opacity: 0.5;
  cursor: not-allowed;
}

button:hover {
  color: var(--primary);
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.modal-content > * {
  margin: 10px;
}

.modal-buttons-div {
  display: flex;
  flex-direction: row;
  width: 100%;
  justify-content: space-between;
}
</style>
