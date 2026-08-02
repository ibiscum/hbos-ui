import { defineStore } from 'pinia'
import { toast } from 'vue3-toastify'

const normalizeToastMessage = (message: string): string | null => {
  const normalized = message.trim()
  return normalized ? normalized : null
}

export const useToastStore = defineStore('toast', {
  actions: {
    showSuccessToast(message: string) {
      const normalized = normalizeToastMessage(message)
      if (!normalized) return
      toast.success(normalized)
    },
    showErrorToast(message: string) {
      const normalized = normalizeToastMessage(message)
      if (!normalized) return
      toast.error(normalized)
    },
    showInfoToast(message: string) {
      const normalized = normalizeToastMessage(message)
      if (!normalized) return
      toast.info(normalized)
    },
    // Add more toast types as needed
  },
})
