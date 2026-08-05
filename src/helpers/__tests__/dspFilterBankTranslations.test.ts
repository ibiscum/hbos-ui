import { describe, expect, it } from 'vitest'

import {
  filterBankTranslations,
  getAllFilterBankTranslations,
  getFilterBankDescription,
  getFilterBankDisplayName,
  hasFilterBankTranslation,
} from '../dspFilterBankTranslations'

describe('dspFilterBankTranslations', () => {
  describe('getFilterBankDisplayName', () => {
    it('returns translated display names for known banks', () => {
      expect(getFilterBankDisplayName('left')).toBe('Left')
      expect(getFilterBankDisplayName('iir_a')).toBe('Xover A')
      expect(getFilterBankDisplayName('subwoofer')).toBe('Subwoofer')
    })

    it('matches names case-insensitively', () => {
      expect(getFilterBankDisplayName('LEFT')).toBe('Left')
      expect(getFilterBankDisplayName('IiR_Z')).toBe('Xover Z')
    })

    it('falls back to the original name when no translation exists', () => {
      expect(getFilterBankDisplayName('custom-bank')).toBe('custom-bank')
      expect(getFilterBankDisplayName('CuStOm-BaNk')).toBe('CuStOm-BaNk')
    })
  })

  describe('getFilterBankDescription', () => {
    it('returns descriptions for known banks', () => {
      expect(getFilterBankDescription('right')).toBe('Right channel filters')
      expect(getFilterBankDescription('IIR_B')).toBe('IIR Crossover Filter B')
    })

    it('returns undefined when no translation exists', () => {
      expect(getFilterBankDescription('custom-bank')).toBeUndefined()
    })
  })

  describe('hasFilterBankTranslation', () => {
    it('returns true for known banks regardless of case', () => {
      expect(hasFilterBankTranslation('both')).toBe(true)
      expect(hasFilterBankTranslation('MaStEr')).toBe(true)
    })

    it('returns false for unknown banks', () => {
      expect(hasFilterBankTranslation('custom-bank')).toBe(false)
    })
  })

  describe('getAllFilterBankTranslations', () => {
    it('returns the translation map instance', () => {
      const allTranslations = getAllFilterBankTranslations()

      expect(allTranslations).toBe(filterBankTranslations)
      expect(allTranslations.iir_m.displayName).toBe('Xover M')
      expect(allTranslations.output.description).toBe('Output filters')
    })
  })
})
