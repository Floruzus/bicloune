import type { Bike } from './types'

/** Circonférence développée (mm) à partir d'un diamètre hors-tout (mm). */
export function circumferenceFromDiameter(diameterMm: number): number {
  return Math.round(Math.PI * diameterMm)
}

/** Presets ETRTO courants : circonférence développée en mm. */
export const WHEEL_PRESETS: { label: string; mm: number }[] = [
  { label: '700x23C (route)', mm: 2096 },
  { label: '700x25C (route)', mm: 2105 },
  { label: '700x28C', mm: 2136 },
  { label: '700x32C (gravel)', mm: 2155 },
  { label: '700x38C (gravel)', mm: 2180 },
  { label: '650b x 47 (VTT/gravel)', mm: 2124 },
  { label: '27.5" x 2.1 (VTT)', mm: 2148 },
  { label: '29" x 2.2 (VTT)', mm: 2298 },
  { label: '26" x 1.95 (VTT)', mm: 2050 },
  { label: '20" (pliant / BMX)', mm: 1596 },
]

/** Tours de roue par minute pour une vitesse en m/s. */
export function wheelRpm(speedMs: number, wheelCircumferenceMm: number): number {
  if (wheelCircumferenceMm <= 0) return 0
  return (speedMs * 60_000) / wheelCircumferenceMm
}

/**
 * Cadence de pédalage (tr/min).
 * Un tour de pédalier = chainring/cog tours de roue.
 */
export function cadenceRpm(
  speedMs: number,
  wheelCircumferenceMm: number,
  chainring: number,
  cog: number,
): number {
  if (!chainring || !cog) return 0
  return wheelRpm(speedMs, wheelCircumferenceMm) * (cog / chainring)
}

/** Développement en mètres : distance parcourue pour un tour de pédalier. */
export function developmentM(
  wheelCircumferenceMm: number,
  chainring: number,
  cog: number,
): number {
  if (!cog) return 0
  return (wheelCircumferenceMm / 1000) * (chainring / cog)
}

/** Ratio de la transmission (plateau / pignon). */
export function gearRatio(chainring: number, cog: number): number {
  return cog ? chainring / cog : 0
}

/** Vitesse (m/s) correspondant à une cadence donnée sur un rapport donné. */
export function speedForCadence(
  rpm: number,
  wheelCircumferenceMm: number,
  chainring: number,
  cog: number,
): number {
  return (rpm * developmentM(wheelCircumferenceMm, chainring, cog)) / 60
}

export type GearOption = { front: number; rear: number; ratio: number; dev: number }

/** Tous les rapports possibles, triés par développement croissant. */
export function allGears(bike: Bike): GearOption[] {
  const out: GearOption[] = []
  bike.chainrings.forEach((c, front) =>
    bike.cogs.forEach((k, rear) => {
      out.push({
        front,
        rear,
        ratio: gearRatio(c, k),
        dev: developmentM(bike.wheelCircumferenceMm, c, k),
      })
    }),
  )
  return out.sort((a, b) => a.dev - b.dev)
}

/** Le rapport qui approche le mieux la cadence cible à la vitesse courante. */
export function bestGearFor(bike: Bike, speedMs: number, targetRpm: number): GearOption | null {
  if (speedMs <= 0) return null
  const gears = allGears(bike)
  if (!gears.length) return null
  let best = gears[0]
  let bestErr = Infinity
  for (const g of gears) {
    const rpm = cadenceRpm(speedMs, bike.wheelCircumferenceMm, bike.chainrings[g.front], bike.cogs[g.rear])
    const err = Math.abs(rpm - targetRpm)
    if (err < bestErr) {
      bestErr = err
      best = g
    }
  }
  return best
}
