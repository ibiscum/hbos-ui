<template>
  <div v-if="isVisible" class="radio-edit-popup-overlay" @click="closePopup">
    <div class="radio-edit-popup" @click.stop>
      <div class="popup-header">
        <h3>Edit Radio Station</h3>
        <button type="button" class="close-btn" aria-label="Close edit popup" @click="closePopup">
          <Icon icon="clear" />
        </button>
      </div>

      <form @submit.prevent="saveChanges" class="popup-form">
        <!-- Image Upload Section -->
        <div class="form-group image-upload-group">
          <label>Station Image</label>
          <div class="image-upload-container">
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              style="display: none"
              @change="handleImageUpload"
            />
            <div class="image-preview" @click="fileInput?.click()">
              <img
                v-if="editData.img"
                :src="editData.img"
                :alt="editData.title || 'Station image'"
                class="preview-image"
              />
              <div v-else class="preview-placeholder">
                <Icon icon="plus" />
                <span>Click to upload image</span>
              </div>
              <div class="image-overlay">
                <Icon icon="plus" />
              </div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="station-name">Station Name</label>
          <input
            id="station-name"
            v-model="editData.title"
            type="text"
            placeholder="Enter station name"
            required
          />
        </div>

        <div class="form-group">
          <label for="station-country">Country</label>
          <input
            id="station-country"
            v-model="editData.country"
            type="text"
            placeholder="Enter country"
          />
        </div>

        <div class="form-group">
          <label for="station-tags">Tags</label>
          <input
            id="station-tags"
            v-model="editData.tags"
            type="text"
            placeholder="Enter tags separated by commas"
          />
        </div>

        <div class="form-group">
          <label for="station-url">Stream URL</label>
          <input
            id="station-url"
            v-model="editData.url"
            type="url"
            placeholder="Enter stream URL"
            required
          />
        </div>

        <div class="form-actions">
          <button type="button" class="btn-cancel" @click="closePopup">
            Cancel
          </button>
          <button type="submit" class="btn-save">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Icon from '@/components/Icon.vue'
import type { RadioFavorite } from '@/stores/radio'
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()

interface Props {
  isVisible: boolean
  station: RadioFavorite | null
}

interface Emits {
  (e: 'close'): void
  (e: 'save', editedStation: RadioFavorite): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const fileInput = ref<HTMLInputElement | null>(null)

const createEmptyEditData = () => ({
  id: '',
  title: '',
  country: '',
  tags: '',
  url: '',
  img: ''
})

const getStationImage = (station: RadioFavorite) => {
  if (typeof station.metadata?.logo_url === 'string' && station.metadata.logo_url.trim()) {
    return station.metadata.logo_url
  }

  if (typeof station.metadata?.coverart_url === 'string' && station.metadata.coverart_url.trim()) {
    return station.metadata.coverart_url
  }

  return station.img || ''
}

const toEditData = (station: RadioFavorite) => ({
  id: station.id,
  title: station.title || '',
  country: station.metadata?.country || station.country || '',
  tags: station.metadata?.tags || station.tags || '',
  url: station.url || '',
  img: getStationImage(station)
})

const editData = ref(createEmptyEditData())

// Watch for station changes to populate the form
watch([() => props.station, () => props.isVisible], ([newStation, isVisible]) => {
  if (!isVisible || !newStation) {
    editData.value = createEmptyEditData()
    return
  }

  editData.value = toEditData(newStation)
}, { immediate: true })

const closePopup = () => {
  emit('close')
}

const saveChanges = () => {
  const trimmedTitle = editData.value.title.trim()
  const trimmedUrl = editData.value.url.trim()

  if (!trimmedTitle || !trimmedUrl) {
    toastStore.showErrorToast('Station name and stream URL are required.')
    return
  }

  const editedStation: RadioFavorite = {
    id: editData.value.id,
    title: trimmedTitle,
    url: trimmedUrl,
    metadata: {
      title: trimmedTitle,
      logo_url: editData.value.img || undefined,
      coverart_url: editData.value.img || undefined,
      country: editData.value.country.trim() || undefined,
      tags: editData.value.tags.trim() || undefined
    },
    // Legacy fields for backward compatibility
    img: editData.value.img || undefined,
    country: editData.value.country.trim() || undefined,
    tags: editData.value.tags.trim() || undefined
  }

  emit('save', editedStation)
}

const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) {
    return
  }

  // Check file size (limit to 5MB)
  if (file.size > 5 * 1024 * 1024) {
    target.value = ''
    toastStore.showErrorToast('Image size must be less than 5MB.')
    return
  }

  // Check file type
  if (!file.type.startsWith('image/')) {
    target.value = ''
    toastStore.showErrorToast('Please select a valid image file.')
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    editData.value.img = e.target?.result as string
  }
  reader.readAsDataURL(file)
}
</script>

<style scoped lang="scss">
@use '@/assets/scss/popup' as *;

.radio-edit-popup-overlay {
  @include popup-overlay;
}

.radio-edit-popup {
  @include popup-container(480px);
}

.popup-header {
  @include popup-header;

  .close-btn {
    @include popup-close-button;
  }
}

.popup-form {
  @include popup-content;
}

.form-group {
  @include popup-form-group;

  &.image-upload-group {
    .image-upload-container {
      display: flex;
      justify-content: center;

      .image-preview {
        width: 120px;
        height: 120px;
        border-radius: 8px;
        overflow: hidden;
        border: 2px solid var(--color-border);
        background: var(--cover-placeholder-bg);
        cursor: pointer;
        position: relative;
        transition: all 0.2s ease;

        &:hover {
          border-color: var(--color-primary);
          transform: scale(1.02);

          .image-overlay {
            opacity: 1;
          }
        }

        .preview-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .preview-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--color-body-secondary);
          font-size: 0.875rem;
          text-align: center;
          padding: 12px;

          svg {
            width: 32px;
            height: 32px;
            margin-bottom: 8px;
            opacity: 0.6;
          }

          span {
            line-height: 1.3;
          }
        }

        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;

          svg {
            width: 24px;
            height: 24px;
            color: white;
          }
        }
      }
    }
  }
}

.form-actions {
  @include popup-actions;

  .btn-cancel {
    @include popup-button-cancel;
  }

  .btn-save {
    @include popup-button-primary;
  }
}
</style>
