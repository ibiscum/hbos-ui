import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePlayerChangesStore } from '../player-changes'

describe('Player Changes Store - Regression Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('does not log when player did not change', () => {
    const store = usePlayerChangesStore()
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    store.player_changed('mpd', 'mpd')

    expect(logSpy).not.toHaveBeenCalled()
  })

  it('does not log when both old and new player are null', () => {
    const store = usePlayerChangesStore()
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    store.player_changed(null, null)

    expect(logSpy).not.toHaveBeenCalled()
  })

  it('logs structured payload when player actually changes', () => {
    const store = usePlayerChangesStore()
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    store.player_changed('mpd', 'spotify')

    expect(logSpy).toHaveBeenCalledWith('Player changed:', { from: 'mpd', to: 'spotify' })
  })
})
