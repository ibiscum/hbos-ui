import { check_dsp_toolkit, getMetadata, readMemory, writeMemory } from '@/api/dsptoolkit'

export interface TOSLinkStatus {
  available: boolean
  enabled: boolean
  signalDetected: boolean
  allowChange: boolean
  error?: string
  requiresDSP: boolean
  sensitivity?: 'low' | 'medium' | 'high'
}

export interface TOSLinkConfig {
  displayName: string
  providedBy: string
  icon: string
  registers: {
    enable: string
    signalDetection: string
    sensitivity: string
  }
}

export interface TOSLinkRegisters {
  enableSPDIFRegister: string
  readSPDIFOnRegister: string
  sensitivitySPDIFRegister: string
}

// Default configuration for TOSLink service
const TOSLINK_CONFIG: TOSLinkConfig = {
  displayName: 'TOSLink',
  providedBy: 'DSP',
  icon: 'toslink',
  registers: {
    enable: 'enableSPDIFRegister', // Metadata property name for enable memory address
    signalDetection: 'readSPDIFOnRegister', // Metadata property name for signal detection memory address
    sensitivity: 'sensitivitySPDIFRegister' // Metadata property name for sensitivity memory address
  }
}

// Sensitivity level mapping to float values
const SENSITIVITY_LEVELS = {
  low: 0.01,      // Low sensitivity
  medium: 0.001,  // Medium sensitivity (default)
  high: 0.00005   // High sensitivity
} as const;

// Reverse mapping from float values to sensitivity levels (sorted by value descending for matching)
const SENSITIVITY_VALUES = [
  { value: 0.01, level: 'low' },
  { value: 0.001, level: 'medium' },
  { value: 0.00005, level: 'high' }
] as const

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const asErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const getRegisterAddress = (metadata: Record<string, unknown>, key: keyof TOSLinkRegisters): string | null => {
  const value = metadata[key]
  return isNonEmptyString(value) ? value : null
}

const parseNumericMemoryValue = (rawValue: unknown): number | null => {
  if (typeof rawValue === 'number') {
    return Number.isFinite(rawValue) ? rawValue : null
  }

  if (!isNonEmptyString(rawValue)) {
    return null
  }

  const trimmed = rawValue.trim()
  const parsed = /^0x/i.test(trimmed)
    ? Number.parseInt(trimmed, 16)
    : Number.parseFloat(trimmed)

  return Number.isFinite(parsed) ? parsed : null
}

async function readBooleanMemory(address: string): Promise<boolean> {
  const response = await readMemory(address)
  const rawValue = response?.values?.[0]
  const parsed = parseNumericMemoryValue(rawValue)
  return parsed !== null && parsed > 0
}

function resolveSensitivityFromValue(rawValue: unknown): 'low' | 'medium' | 'high' {
  const floatValue = parseNumericMemoryValue(rawValue)
  if (floatValue === null) {
    return 'medium'
  }

  let closestLevel: 'low' | 'medium' | 'high' = 'medium'
  let smallestDifference = Infinity

  for (const { value, level } of SENSITIVITY_VALUES) {
    const difference = Math.abs(floatValue - value)
    if (difference < smallestDifference) {
      smallestDifference = difference
      closestLevel = level
    }
  }

  return closestLevel
}

async function getSensitivityForAddress(address: string): Promise<'low' | 'medium' | 'high'> {
  const response = await readMemory(address, undefined, 'float')
  return resolveSensitivityFromValue(response?.values?.[0])
}

/**
 * Check DSP availability
 */
export async function checkDSPAvailability(): Promise<boolean> {
  try {
    const response = await check_dsp_toolkit()
    return response === 'yes'
  } catch (error) {
    console.error('Failed to check DSP availability:', error)
    return false
  }
}

/**
 * Check if the TOSLink hardware is available through DSP metadata
 */
export async function checkTOSLinkAvailable(): Promise<boolean> {
  try {
    const dspAvailable = await checkDSPAvailability()
    if (!dspAvailable) {
      return false
    }

    // Get metadata to check if SPDIF registers are defined
    const metadata = await getMetadata() as Record<string, unknown>

    // Check if the SPDIF register names exist in metadata
    return !!(
      getRegisterAddress(metadata, 'enableSPDIFRegister')
      && getRegisterAddress(metadata, 'readSPDIFOnRegister')
      && getRegisterAddress(metadata, 'sensitivitySPDIFRegister')
    )
  } catch (error) {
    console.error('Failed to check TOSLink availability:', error)
    return false
  }
}

/**
 * Get comprehensive TOSLink status
 */
export async function getTOSLinkStatus(): Promise<TOSLinkStatus> {
  const status: TOSLinkStatus = {
    available: false,
    enabled: false,
    signalDetected: false,
    allowChange: false,
    requiresDSP: true
  }

  try {
    // First check if DSP hardware is available
    const dspAvailable = await checkDSPAvailability()

    if (!dspAvailable) {
      status.error = 'DSP sound card with TOSLink input required'
      return status
    }

    // Get DSP metadata to find the SPDIF register names
    const metadata = await getMetadata() as Record<string, unknown>
    const enableAddress = getRegisterAddress(metadata, 'enableSPDIFRegister')
    const signalAddress = getRegisterAddress(metadata, 'readSPDIFOnRegister')
    const sensitivityAddress = getRegisterAddress(metadata, 'sensitivitySPDIFRegister')

    if (!enableAddress || !signalAddress || !sensitivityAddress) {
      status.error = 'TOSLink memory addresses not available in DSP metadata'
      return status
    }

    status.available = true
    status.allowChange = true

    // Check if SPDIF is enabled by reading the enable memory address
    try {
      status.enabled = await readBooleanMemory(enableAddress)
    } catch (error) {
      console.warn('Failed to read SPDIF enable memory address:', error)
      status.enabled = false
    }

    // Check if signal is detected by reading the signal detection memory address
    try {
      status.signalDetected = await readBooleanMemory(signalAddress)
    } catch (error) {
      console.warn('Failed to read SPDIF signal detection memory address:', error)
      status.signalDetected = false
    }

    // Check current sensitivity level by reading the sensitivity memory address
    try {
      status.sensitivity = await getSensitivityForAddress(sensitivityAddress)
    } catch (error) {
      console.warn('Failed to read SPDIF sensitivity memory address:', error)
      status.sensitivity = 'medium' // Default to medium if read fails
    }

  } catch (error) {
    console.error('Failed to get TOSLink status:', error)
    status.error = 'Failed to check TOSLink status'
    status.available = false
    status.allowChange = false
  }

  return status
}

/**
 * Enable TOSLink input
 */
export async function enableTOSLink(): Promise<void> {
  const status = await getTOSLinkStatus()

  if (!status.available) {
    throw new Error(status.error || 'TOSLink is not available')
  }

  if (!status.allowChange) {
    throw new Error('Not allowed to change TOSLink state')
  }

  try {
    const metadata = await getMetadata() as Record<string, unknown>
    const enableAddress = getRegisterAddress(metadata, 'enableSPDIFRegister')
    if (!enableAddress) {
      throw new Error('Enable SPDIF memory address not found in metadata')
    }

    const writeRequest = {
      address: enableAddress,
      value: 1,
      store: true // Store this memory setting for auto-loading on startup
    }

    await writeMemory(writeRequest)
  } catch (error) {
    console.error('Failed to enable TOSLink:', error)
    throw new Error(`Failed to enable TOSLink: ${asErrorMessage(error)}`)
  }
}

/**
 * Disable TOSLink input
 */
export async function disableTOSLink(): Promise<void> {
  const status = await getTOSLinkStatus()

  if (!status.available) {
    throw new Error(status.error || 'TOSLink is not available')
  }

  if (!status.allowChange) {
    throw new Error('Not allowed to change TOSLink state')
  }

  try {
    const metadata = await getMetadata() as Record<string, unknown>
    const enableAddress = getRegisterAddress(metadata, 'enableSPDIFRegister')
    if (!enableAddress) {
      throw new Error('Enable SPDIF memory address not found in metadata')
    }

    const writeRequest = {
      address: enableAddress,
      value: 0,
      store: true // Store this memory setting for auto-loading on startup
    }

    await writeMemory(writeRequest)
  } catch (error) {
    console.error('Failed to disable TOSLink:', error)
    throw new Error(`Failed to disable TOSLink: ${asErrorMessage(error)}`)
  }
}

/**
 * Get current TOSLink input sensitivity level
 */
export async function getTOSLinkSensitivity(): Promise<'low' | 'medium' | 'high'> {
  try {
    const metadata = await getMetadata() as Record<string, unknown>
    const sensitivityAddress = getRegisterAddress(metadata, 'sensitivitySPDIFRegister')
    if (!sensitivityAddress) {
      throw new Error('Sensitivity SPDIF memory address not found in metadata')
    }

    return await getSensitivityForAddress(sensitivityAddress)
  } catch (error) {
    console.error('Failed to get TOSLink sensitivity:', error)
    return 'medium' // Default fallback
  }
}

/**
 * Set TOSLink input sensitivity level
 */
export async function setTOSLinkSensitivity(sensitivity: 'low' | 'medium' | 'high'): Promise<void> {
  const status = await getTOSLinkStatus()

  if (!status.available) {
    throw new Error(status.error || 'TOSLink is not available')
  }

  if (!status.allowChange) {
    throw new Error('Not allowed to change TOSLink state')
  }

  try {
    const metadata = await getMetadata() as Record<string, unknown>
    const sensitivityAddress = getRegisterAddress(metadata, 'sensitivitySPDIFRegister')
    if (!sensitivityAddress) {
      throw new Error('Sensitivity SPDIF memory address not found in metadata')
    }

    const sensitivityValue = SENSITIVITY_LEVELS[sensitivity]

    const writeRequest = {
      address: sensitivityAddress,
      value: sensitivityValue, // Float value (0.01, 0.001, or 0.00005)
      store: true // Store this memory setting for auto-loading on startup
    }

    await writeMemory(writeRequest)
  } catch (error) {
    console.error('Failed to set TOSLink sensitivity:', error)
    throw new Error(`Failed to set TOSLink sensitivity: ${asErrorMessage(error)}`)
  }
}

export { TOSLINK_CONFIG }
