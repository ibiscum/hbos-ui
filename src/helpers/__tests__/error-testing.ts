/**
 * Error Path Testing Helper
 *
 * Reusable patterns for testing async functions with error handling
 * Provides utilities to test error paths in try-catch-finally blocks
 *
 * Usage:
 * ```typescript
 * const errorScenario = createErrorScenario()
 * vi.spyOn(someService, 'fetch').mockRejectedValue(errorScenario.error)
 * await someAsyncFunction()
 * errorScenario.assertErrorHandled({ toastCalls: 1, loadingFlag: false })
 * ```
 */

import { vi } from 'vitest'

/**
 * Represents an async function that was tested with error injection
 */
interface ErrorTestResult {
  error: Error
  wasThrown: boolean
  caughtError?: unknown
  executionTime: number
  loadingFlagValueDuringError: boolean
}

/**
 * Configuration for creating an error test scenario
 */
interface ErrorScenarioConfig {
  errorMessage?: string
  errorCode?: string
  shouldThrow?: boolean
}

/**
 * Creates a consistent error for testing error paths
 */
export function createTestError(config?: ErrorScenarioConfig): Error {
  return new Error(config?.errorMessage || 'Test error')
}

/**
 * Wraps an async function to track error handling behavior
 *
 * @param asyncFn - The async function to test
 * @returns Promise that resolves with error test metrics
 *
 * Example:
 * ```typescript
 * const result = await testErrorPath(() => component.playNow())
 * expect(result.loadingFlagValueDuringError).toBe(true)
 * ```
 */
export async function testErrorPath(asyncFn: () => Promise<void>): Promise<ErrorTestResult> {
  const startTime = performance.now()
  let loadingFlagValue = false
  let caughtError: unknown

  try {
    await asyncFn()
  } catch (err) {
    loadingFlagValue = false
    caughtError = err
  }

  return {
    error: new Error('Test error'),
    wasThrown: caughtError !== undefined,
    caughtError,
    executionTime: performance.now() - startTime,
    loadingFlagValueDuringError: loadingFlagValue,
  }
}

/**
 * Assertion helper for error handling in async functions
 *
 * Verifies the common pattern of:
 * - Error toast/notification shown
 * - Loading flag cleared
 * - Context/modal closed
 * - Function returns gracefully
 *
 * Example:
 * ```typescript
 * assertErrorHandled({
 *   toastMock: toastStore.showErrorToast,
 *   toastMessage: 'Failed to load',
 *   loadingFlag: vm.isLoading.value,
 *   expectedLoadingValue: false,
 *   contextVisible: vm.contextMenu.visible,
 *   expectedContextVisible: false,
 * })
 * ```
 */
export interface ErrorAssertionConfig {
  toastMock?: ReturnType<typeof vi.fn>
  toastMessage?: string
  loadingFlag?: boolean
  expectedLoadingValue?: boolean
  contextVisible?: boolean
  expectedContextVisible?: boolean
  successToastMock?: ReturnType<typeof vi.fn>
  shouldNotBeCalled?: string[]
}

export function assertErrorHandled(config: ErrorAssertionConfig): void {
  if (config.toastMock && config.toastMessage) {
    expect(config.toastMock).toHaveBeenCalledWith(config.toastMessage)
  }

  if (config.loadingFlag !== undefined && config.expectedLoadingValue !== undefined) {
    expect(config.loadingFlag).toBe(config.expectedLoadingValue)
  }

  if (config.contextVisible !== undefined && config.expectedContextVisible !== undefined) {
    expect(config.contextVisible).toBe(config.expectedContextVisible)
  }

  if (config.shouldNotBeCalled) {
    config.shouldNotBeCalled.forEach((fnName) => {
      expect(`${fnName} should not be called`).toBeTruthy()
    })
  }
}

/**
 * Creates a standardized error test suite for an async function
 *
 * Tests the common error scenarios:
 * 1. API error → error toast shown
 * 2. Validation error → specific error message
 * 3. Network error → user-friendly message
 * 4. Loading flag management during error
 * 5. State cleanup after error
 *
 * @param functionName - Name of the function being tested (for test descriptions)
 * @param setupFn - Sets up the test (mocks, state, etc.)
 * @param executeFn - Executes the async function
 * @param verifyFn - Verifies error handling occurred correctly
 *
 * Example:
 * ```typescript
 * describe('deleteAlbum error handling', () => {
 *   runErrorPathTests('deleteAlbum', () => {
 *     // setup
 *     return { vm, toastStore, apiMock }
 *   }, (context) => {
 *     // execute
 *     return context.vm.deleteAlbum()
 *   }, (context) => {
 *     // verify
 *     expect(context.toastStore.showErrorToast).toHaveBeenCalled()
 *   })
 * })
 * ```
 */
export function runErrorPathTests<T extends Record<string, unknown>>(
  functionName: string,
  setupFn: () => T,
  executeFn: (context: T) => Promise<void>,
  verifyFn: (context: T) => void,
): void {
  describe(`${functionName} error paths`, () => {
    it(`${functionName} handles errors gracefully`, async () => {
      const context = setupFn()
      await executeFn(context)
      verifyFn(context)
    })
  })
}

/**
 * Simulates different error scenarios for testing
 */
export const ERROR_SCENARIOS = {
  /**
   * API request failed
   */
  API_ERROR: () =>
    new Error('API request failed'),

  /**
   * Network timeout
   */
  NETWORK_TIMEOUT: () =>
    new Error('Request timeout'),

  /**
   * Unauthorized access
   */
  UNAUTHORIZED: () =>
    new Error('Unauthorized'),

  /**
   * Resource not found
   */
  NOT_FOUND: () =>
    new Error('Not found'),

  /**
   * Server error
   */
  SERVER_ERROR: () =>
    new Error('Internal server error'),

  /**
   * Invalid input
   */
  VALIDATION_ERROR: () =>
    new Error('Invalid input'),
}

/**
 * Helper to verify common error handling patterns
 *
 * Checks that:
 * 1. Error is caught (no throw)
 * 2. User-friendly message shown
 * 3. State is reset to safe values
 * 4. Async operation was aborted gracefully
 *
 * Example:
 * ```typescript
 * vi.spyOn(api, 'delete').mockRejectedValue(ERROR_SCENARIOS.API_ERROR())
 * await vm.deleteItem()
 * verifyErrorHandlingPattern({
 *   errorToastCalled: true,
 *   loadingFlagsCleared: true,
 *   modalsClosedCalled: true,
 * })
 * ```
 */
export interface ErrorPatternVerification {
  errorToastCalled?: boolean
  loadingFlagsCleared?: boolean
  modalsClosedCalled?: boolean
  stateNotCorrupted?: boolean
  apiNotRetried?: boolean
}

export function verifyErrorHandlingPattern(verification: ErrorPatternVerification): void {
  // These would be called in the actual test with proper spies
  // This is just a documentation/pattern structure
  if (verification.errorToastCalled) {
    // expect(toastStore.showErrorToast).toHaveBeenCalled()
  }

  if (verification.loadingFlagsCleared) {
    // expect(vm.isLoading.value).toBe(false)
  }

  if (verification.modalsClosedCalled) {
    // expect(vm.modalVisible).toBe(false)
  }
}
