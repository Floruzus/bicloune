import { useCallback, useEffect, useRef, useState } from 'react'

export type SpeedStatus = 'idle' | 'requesting' | 'tracking' | 'denied' | 'error' | 'unsupported'

export type SpeedReading = {
  /** Vitesse lissée, en m/s. */
  speedMs: number
  /** Vitesse brute du dernier point, en m/s (null si indisponible). */
  rawMs: number | null
  /** Précision horizontale du dernier point GPS, en m. */
  accuracy: number | null
  status: SpeedStatus
  error: string | null
  /** Timestamp du dernier point reçu. */
  updatedAt: number | null
  distanceM: number
  maxSpeedMs: number
  /** Le dernier point était trop imprécis pour être exploité. */
  weakSignal: boolean
}

const EARTH_R = 6_371_000

function haversine(a: GeolocationCoordinates, b: GeolocationCoordinates): number {
  const φ1 = (a.latitude * Math.PI) / 180
  const φ2 = (b.latitude * Math.PI) / 180
  const dφ = φ2 - φ1
  const dλ = ((b.longitude - a.longitude) * Math.PI) / 180
  const h = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Vitesse via le GPS. Utilise coords.speed quand le device la fournit,
 * sinon la dérive de deux positions successives. Lissage exponentiel pour
 * éviter que l'affichage RPM ne saute dans tous les sens.
 */
export function useSpeed(
  options: { smoothing?: number; staleAfterMs?: number; maxAccuracyM?: number } = {},
) {
  const { smoothing = 0.35, staleAfterMs = 6000, maxAccuracyM = 25 } = options

  const [reading, setReading] = useState<SpeedReading>({
    speedMs: 0,
    rawMs: null,
    accuracy: null,
    status: 'idle',
    error: null,
    updatedAt: null,
    distanceM: 0,
    maxSpeedMs: 0,
    weakSignal: false,
  })

  const watchId = useRef<number | null>(null)
  const prev = useRef<GeolocationPosition | null>(null)
  const smoothed = useRef(0)

  const stop = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
    prev.current = null
    smoothed.current = 0
    setReading((r) => ({
      ...r,
      speedMs: 0,
      rawMs: null,
      status: 'idle',
      error: null,
      weakSignal: false,
    }))
  }, [])

  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setReading((r) => ({ ...r, status: 'unsupported', error: 'Géolocalisation non supportée' }))
      return
    }
    if (watchId.current !== null) return

    setReading((r) => ({ ...r, status: 'requesting', error: null }))

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        // Un point imprécis produit une vitesse dérivée fantaisiste, que le lissage
        // traînerait ensuite plusieurs secondes. Mieux vaut le jeter et laisser la
        // péremption ramener l'affichage à zéro si le signal ne revient pas.
        if (typeof pos.coords.accuracy === 'number' && pos.coords.accuracy > maxAccuracyM) {
          setReading((r) => ({ ...r, accuracy: pos.coords.accuracy, weakSignal: true }))
          return
        }

        let raw: number | null =
          typeof pos.coords.speed === 'number' && !Number.isNaN(pos.coords.speed)
            ? Math.max(0, pos.coords.speed)
            : null

        let stepDistance = 0
        const last = prev.current
        if (last) {
          const dt = (pos.timestamp - last.timestamp) / 1000
          if (dt > 0.2 && dt < 30) {
            stepDistance = haversine(last.coords, pos.coords)
            // Ignore le bruit GPS à l'arrêt.
            if (stepDistance < (pos.coords.accuracy || 10) * 0.5) stepDistance = 0
            if (raw === null) raw = stepDistance / dt
          }
        }
        prev.current = pos

        const value = raw ?? 0
        smoothed.current = smoothed.current === 0 && value === 0
          ? 0
          : smoothed.current + smoothing * (value - smoothed.current)

        const speedMs = smoothed.current < 0.3 ? 0 : smoothed.current
        setReading((r) => ({
          speedMs,
          rawMs: raw,
          accuracy: pos.coords.accuracy ?? null,
          status: 'tracking',
          error: null,
          updatedAt: pos.timestamp,
          distanceM: r.distanceM + stepDistance,
          maxSpeedMs: Math.max(r.maxSpeedMs, speedMs),
          weakSignal: false,
        }))
      },
      (err) => {
        setReading((r) => ({
          ...r,
          speedMs: 0,
          status: err.code === err.PERMISSION_DENIED ? 'denied' : 'error',
          error:
            err.code === err.PERMISSION_DENIED
              ? "Accès à la position refusé. Autorise la localisation pour mesurer la vitesse."
              : err.code === err.POSITION_UNAVAILABLE
                ? 'Signal GPS indisponible.'
                : err.message,
        }))
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
    )
  }, [smoothing, maxAccuracyM])

  const resetTrip = useCallback(() => {
    setReading((r) => ({ ...r, distanceM: 0, maxSpeedMs: 0 }))
  }, [])

  // Retombe à zéro si plus aucun point n'arrive (tunnel, GPS perdu).
  useEffect(() => {
    if (reading.status !== 'tracking') return
    const id = setInterval(() => {
      setReading((r) => {
        if (!r.updatedAt || Date.now() - r.updatedAt < staleAfterMs || r.speedMs === 0) return r
        smoothed.current = 0
        return { ...r, speedMs: 0, rawMs: null }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [reading.status, staleAfterMs])

  useEffect(() => () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
  }, [])

  return { ...reading, start, stop, resetTrip }
}
