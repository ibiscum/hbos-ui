<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal-content backend-info-modal">
        <div class="modal-header">
          <h2>{{ capabilities?.backendName || 'Backend' }} Information</h2>
          <button type="button" class="close-btn" aria-label="Close backend information" @click="$emit('close')">×</button>
        </div>
        <div v-if="capabilities?.backendDescription" class="modal-body" v-html="capabilities.backendDescription"></div>
        <div v-else class="modal-body empty-description">
          No backend description available.
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { type BackendCapabilities } from '@/stores/filter-connector';

defineProps<{
  open: boolean
  capabilities: BackendCapabilities | null
}>();

defineEmits<{
  close: []
}>();
</script>

<style scoped lang="scss">
@use '@/assets/scss/popup' as *;

.modal-backdrop {
  @include popup-overlay;
}

.modal-content {
  @include popup-container(600px);
}

.modal-header {
  @include popup-header;

  .close-btn {
    @include popup-close-button;
    font-size: 24px;
    line-height: 1;
  }
}

.modal-body {
  @include popup-content;
  color: var(--color-body, #666);
  line-height: 1.6;

  :deep(a) {
    color: var(--primary, #e11e4a);
  }

  :deep(p) {
    margin: 0 0 12px;
  }
}

.empty-description {
  text-align: center;
}
</style>
