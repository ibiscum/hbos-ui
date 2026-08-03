import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { useEditableField, useEditableText } from '@/composables/useEditableField'

describe('useEditableField', () => {
  it('initializes edit value from current value, including falsy values', () => {
    const initialValue = ref<number | null>(0)
    const updateFunction = vi.fn().mockResolvedValue({ status: 'success' as const })

    const editableField = useEditableField(initialValue, updateFunction, {
      defaultValue: 123,
      transformer: (value) => Number(value),
      validator: (value) => Number.isFinite(value),
    })

    editableField.startEditing()

    expect(editableField.editValue.value).toBe('0')
  })

  it('falls back to default value when current value is null, including 0 defaults', () => {
    const initialValue = ref<number | null>(null)
    const updateFunction = vi.fn().mockResolvedValue({ status: 'success' as const })

    const editableField = useEditableField(initialValue, updateFunction, {
      defaultValue: 0,
      transformer: (value) => Number(value),
      validator: (value) => Number.isFinite(value),
    })

    editableField.startEditing()

    expect(editableField.editValue.value).toBe('0')
  })

  it('uses falsy default values when input is empty and saves successfully', async () => {
    const initialValue = ref<number | null>(null)
    const updateFunction = vi.fn().mockResolvedValue({ status: 'success' as const })

    const editableField = useEditableField(initialValue, updateFunction, {
      defaultValue: 0,
      transformer: (value) => Number(value),
      validator: (value) => Number.isFinite(value),
    })

    editableField.startEditing()
    editableField.editValue.value = '   '

    expect(editableField.canSave()).toBe(true)

    const saveResult = await editableField.saveEdit()

    expect(saveResult).toBe(true)
    expect(updateFunction).toHaveBeenCalledWith(0)
    expect(editableField.isEditing.value).toBe(false)
    expect(editableField.editValue.value).toBe('')
  })

  it('returns validation error for empty required values', async () => {
    const initialValue = ref<string | null>(null)
    const updateFunction = vi.fn().mockResolvedValue({ status: 'success' as const })

    const editableField = useEditableField(initialValue, updateFunction, {
      validator: (value) => value.length > 0,
    })

    editableField.startEditing()
    editableField.editValue.value = '   '

    expect(editableField.canSave()).toBe(false)

    const saveResult = await editableField.saveEdit()

    expect(saveResult).toBe(false)
    expect(editableField.editError.value).toBe('Value cannot be empty')
    expect(updateFunction).not.toHaveBeenCalled()
  })

  it('handles transformer failures gracefully', async () => {
    const initialValue = ref<number | null>(10)
    const updateFunction = vi.fn().mockResolvedValue({ status: 'success' as const })

    const editableField = useEditableField<number>(initialValue, updateFunction, {
      transformer: () => {
        throw new Error('Conversion failed')
      },
      validator: (value) => value > 0,
    })

    editableField.startEditing()

    expect(editableField.canSave()).toBe(false)

    const saveResult = await editableField.saveEdit()

    expect(saveResult).toBe(false)
    expect(editableField.editError.value).toBe('Conversion failed')
    expect(updateFunction).not.toHaveBeenCalled()
  })

  it('surfaces update errors and resets saving state', async () => {
    const initialValue = ref('value')
    const updateFunction = vi.fn().mockRejectedValue(new Error('Network error'))
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const editableField = useEditableField(initialValue, updateFunction)

    editableField.startEditing()

    const saveResult = await editableField.saveEdit()

    expect(saveResult).toBe(false)
    expect(editableField.isSaving.value).toBe(false)
    expect(editableField.isEditing.value).toBe(true)
    expect(editableField.editError.value).toBe('Network error')
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error saving edit:', expect.any(Error))

    consoleErrorSpy.mockRestore()
  })

  it('uses fallback error message when update reports failure without message', async () => {
    const initialValue = ref('abc')
    const updateFunction = vi.fn().mockResolvedValue({ status: 'error' as const })

    const editableField = useEditableField(initialValue, updateFunction)

    editableField.startEditing()

    const saveResult = await editableField.saveEdit()

    expect(saveResult).toBe(false)
    expect(editableField.editError.value).toBe('Failed to save changes')
  })
})

describe('useEditableText', () => {
  it('trims input before update and applies length validation', async () => {
    const initialValue = ref('current')
    const updateFunction = vi.fn().mockResolvedValue({ status: 'success' as const })

    const editableText = useEditableText(initialValue, updateFunction, {
      minLength: 2,
      maxLength: 5,
      required: true,
    })

    editableText.startEditing()
    editableText.editValue.value = '  a  '
    expect(editableText.canSave()).toBe(false)

    editableText.editValue.value = '  abc  '
    expect(editableText.canSave()).toBe(true)

    const saveResult = await editableText.saveEdit()

    expect(saveResult).toBe(true)
    expect(updateFunction).toHaveBeenCalledWith('abc')
  })

  it('allows empty values when required is false', async () => {
    const initialValue = ref('value')
    const updateFunction = vi.fn().mockResolvedValue({ status: 'success' as const })

    const editableText = useEditableText(initialValue, updateFunction, {
      required: false,
      minLength: 0,
      maxLength: 10,
    })

    editableText.startEditing()
    editableText.editValue.value = '   '

    expect(editableText.canSave()).toBe(true)

    const saveResult = await editableText.saveEdit()

    expect(saveResult).toBe(true)
    expect(updateFunction).toHaveBeenCalledWith('')
  })
})
