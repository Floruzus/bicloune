import { useCallback, useEffect, useState } from 'react'

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* quota / mode privé : on continue en mémoire */
    }
  }, [key, value])

  return [value, setValue] as const
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

/** Garde l'écran allumé pendant la mesure (best effort). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false

    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {
        /* refusé (batterie faible, onglet caché) */
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !cancelled) void request()
    }

    void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => {})
    }
  }, [active])
}

export function useNow(intervalMs: number, active = true) {
  const [now, setNow] = useState(() => Date.now())
  const tick = useCallback(() => setNow(Date.now()), [])
  useEffect(() => {
    if (!active) return
    const id = setInterval(tick, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, active, tick])
  return now
}
