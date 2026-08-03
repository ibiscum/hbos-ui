import { computed, type ComputedRef } from 'vue';
import {
  type BiquadFilterType,
  calculateBiquadBandwidth,
  createBiquadFilter,
  FILTER_TYPES,
} from '@/utils/biquad';
import type { Filter } from '@/utils/filtercalc';

function getBandwidthFilterType(icon: Filter['icon']): BiquadFilterType | null {
  switch (icon) {
    case FILTER_TYPES.PEAKING:
    case FILTER_TYPES.LOWSHELF:
    case FILTER_TYPES.HIGHSHELF:
    case FILTER_TYPES.LOWPASS:
    case FILTER_TYPES.HIGHPASS:
      return icon;
    case FILTER_TYPES.GENERIC_NORMALIZED:
      return null;
    default:
      return FILTER_TYPES.PEAKING;
  }
}

export function useBandwidthLines(currentFilter: ComputedRef<Filter>, sampleRate: number) {
  const activeFilterBandwidth = computed<{ lowerFreq: number; upperFreq: number } | null>(() => {
    const filter = currentFilter.value;
    const biquadType = getBandwidthFilterType(filter.icon);
    if (!biquadType) return null;
    if (typeof filter.Q !== 'number' || filter.Q <= 0 || filter.frequency <= 0) return null;

    const biquadFilter = createBiquadFilter(
      biquadType,
      filter.frequency,
      typeof filter.gain === 'number' ? filter.gain : 0,
      filter.Q,
      sampleRate,
    );

    return calculateBiquadBandwidth(biquadFilter);
  });

  const activeFilterBandwidthStart = computed<number | null>(() => {
    return activeFilterBandwidth.value?.lowerFreq ?? null;
  });

  const activeFilterBandwidthEnd = computed<number | null>(() => {
    return activeFilterBandwidth.value?.upperFreq ?? null;
  });

  return {
    activeFilterBandwidthStart,
    activeFilterBandwidthEnd,
  };
}
