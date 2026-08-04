<template>
  <ContentBox>
    <div class="custom-search-field-content">
      <input :type="type" :value="modelValue" :required="required" :placeholder="placeholder" @input="onInput" />
      <Icon v-if="!modelValue.length" icon="magnifying-glass-light" />
      <button v-if="modelValue.length" type="button" class="clear-button" @click="onClear">
        <Icon icon="clear" />
      </button>
    </div>
  </ContentBox>
</template>

<script setup lang="ts">
import { watch } from 'vue'

import ContentBox from '@/components/ContentBox.vue'
import { useDebounceFn } from '@vueuse/core'

import Icon from '@/components/Icon.vue'

interface InputProps {
  modelValue: string
  type?: string
  required?: boolean
  debounce?: number
  placeholder?: string
}

const props = withDefaults(defineProps<InputProps>(), {
  modelValue: '',
  type: 'text',
  required: false,
  debounce: 0,
  placeholder: 'Search',
})

const emit = defineEmits(['update:modelValue', 'change'])

const emitValue = (value: string) => {
  emit('update:modelValue', value)
  emit('change', value)
}

let debouncedFn = useDebounceFn((value: string) => {
  emitValue(value)
}, props.debounce)

watch(
  () => props.debounce,
  (newDebounce) => {
    debouncedFn = useDebounceFn((value: string) => {
      emitValue(value)
    }, newDebounce)
  },
)

const onInput = ($event: Event) => {
  const target = $event.target as HTMLInputElement
  const value = target.value

  if (props.debounce) {
    debouncedFn(value)
  } else {
    emitValue(value)
  }
}

const onClear = () => {
  emitValue('')
}
</script>

<style scoped lang="scss">
.custom-search-field-content {
  padding: 5px;
  width: 100%;
  height: 35px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;

  input {
    width: 100%;
    color: var(--body-color);
  }
}
</style>
