/**
 * Composable for managing filter bank bypass (A/B comparison).
 * Supports momentary bypass via mouse/touch or spacebar.
 *
 * Accepts a getBanksToBypass function that returns the bank addresses
 * to bypass based on current channel/mode state.
 */

import { ref, type Ref } from 'vue';
import {
  setFilterBankBypassState,
  type FilterBypassSetResponse
} from '@/api/dsptoolkit';

/**
 * Generic bypass composable.
 * @param getBanksToBypass - Returns list of bank addresses to bypass
 * @param isDragging - Ref indicating if user is dragging a filter (suppresses bypass)
 */
export function useBypass(
  getBanksToBypass: () => string[],
  isDragging: Ref<boolean>
) {
  const isBypassed = ref(false);
  const bypassedBanks = ref<string[]>([]);

  function getUniqueBanks(): string[] {
    const banks = getBanksToBypass().filter((bank): bank is string => Boolean(bank));
    return [...new Set(banks)];
  }

  async function startBypass() {
    if (isBypassed.value || isDragging.value) return;

    const successfullyBypassed: string[] = [];

    try {
      const banksToBypass = getUniqueBanks();
      if (banksToBypass.length === 0) return;

      isBypassed.value = true;

      for (const bankName of banksToBypass) {
        try {
          await setFilterBankBypassState(bankName, true);
          successfullyBypassed.push(bankName);
        } catch (error) {
          console.error(`Failed to bypass filter bank ${bankName}:`, error);
          throw error;
        }
      }

      bypassedBanks.value = [...successfullyBypassed];
    } catch (error) {
      console.error('Failed to start bypass:', error);

      if (successfullyBypassed.length > 0) {
        try {
          await Promise.all(
            successfullyBypassed.map(bankName =>
              setFilterBankBypassState(bankName, false).catch((rollbackError: Error) => {
                console.error(`Failed to rollback filter bank ${bankName}:`, rollbackError);
                throw rollbackError;
              })
            )
          );
        } catch (rollbackError) {
          console.error('Failed to rollback bypass state after start error:', rollbackError);
        }
      }

      bypassedBanks.value = [];
      isBypassed.value = false;
    }
  }

  async function endBypass() {
    if (!isBypassed.value) return;

    if (bypassedBanks.value.length === 0) {
      isBypassed.value = false;
      return;
    }

    try {
      const restorePromises: Promise<FilterBypassSetResponse>[] = bypassedBanks.value.map(bankName =>
        setFilterBankBypassState(bankName, false).catch((error: Error) => {
          console.error(`Failed to restore filter bank ${bankName}:`, error);
          throw error;
        })
      );

      await Promise.all(restorePromises);
      bypassedBanks.value = [];
      isBypassed.value = false;
    } catch (error) {
      console.error('Failed to end bypass:', error);
    }
  }

  return {
    isBypassed,
    startBypass,
    endBypass,
  };
}
