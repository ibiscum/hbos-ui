/**
 * Filter visualization and graph utilities
 * Contains coordinate conversion, SVG generation, and graph rendering functions
 */

import {
  type Filter,
  type FrequencyResponsePoint,
  calculateFilterGain
} from './filtercalc';

export interface GraphDimensions {
  plotWidth: number;
  plotHeight: number;
  minFreq?: number;
  maxFreq?: number;
  minGain?: number;
  maxGain?: number;
}

export interface GraphData {
  linePath: string;
  areaPath?: string;
}

export interface VisualFrequencyResponsePoint extends FrequencyResponsePoint {
  x: number;
  y: number;
}

/**
 * Default frequency and gain ranges for visualization
 */
export const DEFAULT_FREQ_RANGE = {
  min: 20,
  max: 20000
} as const;

export const DEFAULT_GAIN_RANGE = {
  min: -20,
  max: 20
} as const;

function resolveFreqRange(minFreq: number, maxFreq: number): { min: number; max: number } {
  const min = Number.isFinite(minFreq) && minFreq > 0 ? minFreq : DEFAULT_FREQ_RANGE.min;
  let max = Number.isFinite(maxFreq) && maxFreq > min ? maxFreq : DEFAULT_FREQ_RANGE.max;
  if (max <= min) {
    max = min * 10;
  }
  return { min, max };
}

function resolveGainRange(minGain: number, maxGain: number): { min: number; max: number } {
  const min = Number.isFinite(minGain) ? minGain : DEFAULT_GAIN_RANGE.min;
  let max = Number.isFinite(maxGain) && maxGain !== min ? maxGain : DEFAULT_GAIN_RANGE.max;
  if (max === min) {
    max = min + 1;
  }
  return { min, max };
}

function sanitizePlotSize(size: number): number {
  return Number.isFinite(size) && size > 0 ? size : 1;
}

/**
 * Convert frequency to X coordinate using logarithmic scaling
 */
export function frequencyToX(
  freq: number,
  plotWidth: number,
  minFreq: number = DEFAULT_FREQ_RANGE.min,
  maxFreq: number = DEFAULT_FREQ_RANGE.max
): number {
  const { min, max } = resolveFreqRange(minFreq, maxFreq);
  const clampedFreq = Number.isFinite(freq) ? Math.min(max, Math.max(min, freq)) : min;
  const width = sanitizePlotSize(plotWidth);
  const logMinFreq = Math.log10(min);
  const logMaxFreq = Math.log10(max);
  const logFreq = Math.log10(clampedFreq);
  return ((logFreq - logMinFreq) / (logMaxFreq - logMinFreq)) * width;
}

/**
 * Convert X coordinate to frequency using logarithmic scaling
 */
export function xToFrequency(
  x: number,
  plotWidth: number,
  minFreq: number = DEFAULT_FREQ_RANGE.min,
  maxFreq: number = DEFAULT_FREQ_RANGE.max
): number {
  const { min, max } = resolveFreqRange(minFreq, maxFreq);
  const width = sanitizePlotSize(plotWidth);
  const clampedX = Number.isFinite(x) ? Math.min(width, Math.max(0, x)) : 0;
  const logMinFreq = Math.log10(min);
  const logMaxFreq = Math.log10(max);
  const logFreq = logMinFreq + (clampedX / width) * (logMaxFreq - logMinFreq);
  return Math.pow(10, logFreq);
}

/**
 * Convert gain (dB) to Y coordinate
 */
export function gainToY(
  gain: number,
  plotHeight: number,
  minGain: number = DEFAULT_GAIN_RANGE.min,
  maxGain: number = DEFAULT_GAIN_RANGE.max
): number {
  const { min, max } = resolveGainRange(minGain, maxGain);
  const height = sanitizePlotSize(plotHeight);
  const clampedGain = Number.isFinite(gain) ? Math.min(max, Math.max(min, gain)) : 0;
  return height - ((clampedGain - min) / (max - min)) * height;
}

/**
 * Convert Y coordinate to gain (dB)
 */
export function yToGain(
  y: number,
  plotHeight: number,
  minGain: number = DEFAULT_GAIN_RANGE.min,
  maxGain: number = DEFAULT_GAIN_RANGE.max
): number {
  const { min, max } = resolveGainRange(minGain, maxGain);
  const height = sanitizePlotSize(plotHeight);
  const clampedY = Number.isFinite(y) ? Math.min(height, Math.max(0, y)) : 0;
  return max - (clampedY / height) * (max - min);
}

/**
 * Convert frequency response points to visual points with coordinates
 */
export function addCoordinatesToPoints(
  points: FrequencyResponsePoint[],
  dimensions: GraphDimensions,
  minFreq = DEFAULT_FREQ_RANGE.min,
  maxFreq = DEFAULT_FREQ_RANGE.max
): VisualFrequencyResponsePoint[] {
  return points.map(point => ({
    ...point,
    x: frequencyToX(point.frequency, dimensions.plotWidth, minFreq, maxFreq),
    y: gainToY(point.gain, dimensions.plotHeight, dimensions.minGain ?? DEFAULT_GAIN_RANGE.min, dimensions.maxGain ?? DEFAULT_GAIN_RANGE.max)
  }));
}

/**
 * Generate frequency response points for a single filter with coordinates
 */
export function generateFilterResponse(
  filter: Filter,
  dimensions: GraphDimensions,
  numPoints = 200,
  minFreq = DEFAULT_FREQ_RANGE.min,
  maxFreq = DEFAULT_FREQ_RANGE.max,
  sampleRate = 48000
): VisualFrequencyResponsePoint[] {
  const points: VisualFrequencyResponsePoint[] = [];
  const pointCount = Math.max(1, Math.floor(numPoints));
  const { min, max } = resolveFreqRange(minFreq, maxFreq);

  for (let i = 0; i <= pointCount; i++) {
    const logFreq = Math.log10(min) + (i / pointCount) * (Math.log10(max) - Math.log10(min));
    const frequency = Math.pow(10, logFreq);
    const gain = calculateFilterGain(frequency, filter, sampleRate);
    const x = frequencyToX(frequency, dimensions.plotWidth, min, max);
    const y = gainToY(gain, dimensions.plotHeight, dimensions.minGain ?? DEFAULT_GAIN_RANGE.min, dimensions.maxGain ?? DEFAULT_GAIN_RANGE.max);

    points.push({ frequency, gain, x, y });
  }

  return points;
}

/**
 * Generate combined frequency response for multiple filters with coordinates
 */
export function generateCombinedResponse(
  filters: Filter[],
  dimensions: GraphDimensions,
  numPoints = 200,
  minFreq = DEFAULT_FREQ_RANGE.min,
  maxFreq = DEFAULT_FREQ_RANGE.max,
  sampleRate = 48000
): VisualFrequencyResponsePoint[] {
  const points: VisualFrequencyResponsePoint[] = [];
  const pointCount = Math.max(1, Math.floor(numPoints));
  const { min, max } = resolveFreqRange(minFreq, maxFreq);

  for (let i = 0; i <= pointCount; i++) {
    const logFreq = Math.log10(min) + (i / pointCount) * (Math.log10(max) - Math.log10(min));
    const frequency = Math.pow(10, logFreq);

    // Sum gains from all enabled filters
    let totalGain = 0;
    filters.forEach(filter => {
      if (filter.enabled) {
        totalGain += calculateFilterGain(frequency, filter, sampleRate);
      }
    });

    const x = frequencyToX(frequency, dimensions.plotWidth, min, max);
    const y = gainToY(totalGain, dimensions.plotHeight, dimensions.minGain ?? DEFAULT_GAIN_RANGE.min, dimensions.maxGain ?? DEFAULT_GAIN_RANGE.max);

    points.push({ frequency, gain: totalGain, x, y });
  }

  return points;
}

/**
 * Convert response points to SVG path data
 */
export function pointsToSVGPath(points: VisualFrequencyResponsePoint[]): string {
  if (points.length === 0) return '';

  const linePoints = points.map(p => `${p.x},${p.y}`);
  return `M ${linePoints.join(' L ')}`;
}

/**
 * Convert response points to SVG area path data (includes baseline)
 */
export function pointsToSVGAreaPath(
  points: VisualFrequencyResponsePoint[],
  dimensions: GraphDimensions,
  minFreq = DEFAULT_FREQ_RANGE.min,
  maxFreq = DEFAULT_FREQ_RANGE.max
): string {
  if (points.length === 0) return '';

  const { min, max } = resolveFreqRange(minFreq, maxFreq);

  const baselineY = gainToY(0, dimensions.plotHeight, dimensions.minGain ?? DEFAULT_GAIN_RANGE.min, dimensions.maxGain ?? DEFAULT_GAIN_RANGE.max);
  const startX = frequencyToX(min, dimensions.plotWidth, min, max);
  const endX = frequencyToX(max, dimensions.plotWidth, min, max);

  const areaPoints: string[] = [];

  // Start at baseline
  areaPoints.push(`${startX},${baselineY}`);

  // Add all response points
  points.forEach(p => {
    areaPoints.push(`${p.x},${p.y}`);
  });

  // End at baseline
  areaPoints.push(`${endX},${baselineY}`);
  areaPoints.push(`${startX},${baselineY}`);

  return `M ${areaPoints.join(' L ')}`;
}

/**
 * Generate complete graph data for a single filter
 */
export function generateFilterGraphData(
  filter: Filter,
  dimensions: GraphDimensions,
  numPoints = 200
): GraphData | null {
  if (!filter.enabled) return null;

  const points = generateFilterResponse(filter, dimensions, numPoints);

  return {
    linePath: pointsToSVGPath(points),
    areaPath: pointsToSVGAreaPath(points, dimensions)
  };
}

/**
 * Generate complete graph data for combined filters
 */
export function generateCombinedGraphData(
  filters: Filter[],
  dimensions: GraphDimensions,
  numPoints = 200
): GraphData | null {
  const enabledFilters = filters.filter(f => f.enabled);
  if (enabledFilters.length === 0) return null;

  const points = generateCombinedResponse(filters, dimensions, numPoints);

  return {
    linePath: pointsToSVGPath(points)
  };
}

/**
 * Generate frequency grid lines for logarithmic display
 */
export function generateFrequencyGridLines(
  minFreq = DEFAULT_FREQ_RANGE.min,
  maxFreq = DEFAULT_FREQ_RANGE.max
): number[] {
  const lines: Set<number> = new Set();

  // Major grid lines (powers of 10)
  for (let i = 100; i <= maxFreq; i *= 10) {
    if (i >= minFreq) {
      lines.add(i);
    }
  }

  // Minor grid lines (2x, 3x, 4x, 5x, 6x, 7x, 8x, 9x multipliers)
  const multipliers = [2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = 10; i < maxFreq * 2; i *= 10) {
    for (const mult of multipliers) {
      const freq = i * mult;
      if (freq >= minFreq && freq <= maxFreq) {
        lines.add(freq);
      }
    }
  }

  return Array.from(lines)
    .filter(f => f >= minFreq && f <= maxFreq)
    .sort((a, b) => a - b);
}

/**
 * Generate frequency labels (excludes 40, 400, 4k to reduce clutter)
 */
export function generateFrequencyLabels(
  minFreq = DEFAULT_FREQ_RANGE.min,
  maxFreq = DEFAULT_FREQ_RANGE.max
): number[] {
  const lines: Set<number> = new Set();

  // Major grid lines (powers of 10)
  for (let i = 100; i <= maxFreq; i *= 10) {
    if (i >= minFreq) {
      lines.add(i);
    }
  }

  // Minor grid lines (2x, and 5x multipliers - excluding 3x, 4x, 6x, 7x, 8x, 9x from labels)
  const multipliers = [2, 5];
  for (let i = 10; i < maxFreq * 2; i *= 10) {
    for (const mult of multipliers) {
      const freq = i * mult;
      if (freq >= minFreq && freq <= maxFreq) {
        lines.add(freq);
      }
    }
  }

  return Array.from(lines)
    .filter(f => f >= minFreq && f <= maxFreq)
    .sort((a, b) => a - b);
}

/**
 * Generate gain grid lines for linear dB display
 */
export function generateGainGridLines(
  minGain = DEFAULT_GAIN_RANGE.min,
  maxGain = DEFAULT_GAIN_RANGE.max,
  step = 5
): number[] {
  const lines: number[] = [];

  for (let gain = minGain; gain <= maxGain; gain += step) {
    lines.push(gain);
  }

  return lines;
}
