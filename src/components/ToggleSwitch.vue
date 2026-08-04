<template>
  <label class="toggle-switch" :class="[attrs.class, { disabled: isDisabled }]" :style="attrs.style">
    <input
      v-bind="inputAttrs"
      type="checkbox"
      :checked="modelValue"
      :disabled="isDisabled"
      @change="onChange"
    >
    <span class="toggle-slider" :class="{ loading }"></span>
  </label>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  modelValue: boolean
  disabled?: boolean
  loading?: boolean
}>(), {
  disabled: false,
  loading: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const attrs = useAttrs()

const isDisabled = computed(() => props.disabled || props.loading)

const inputAttrs = computed(() => {
  // Keep presentation attributes on the wrapper label while forwarding functional attrs to the input.
  return Object.fromEntries(
    Object.entries(attrs).filter(([key]) => key !== 'class' && key !== 'style'),
  )
})

const onChange = (event: Event) => {
  if (isDisabled.value) {
    return
  }

  emit('update:modelValue', (event.target as HTMLInputElement).checked)
}
</script>

<style scoped lang="scss">
@use '@/assets/scss/service-item' as *;

.toggle-switch {
  @include toggle-switch;
}
</style>
