import { describe, expect, it } from 'vitest'
import {
  allGears,
  bestGearFor,
  cadenceRpm,
  circumferenceFromDiameter,
  developmentM,
  gearRatio,
  speedForCadence,
  wheelRpm,
} from './cadence'
import type { Bike } from './types'

/** Vélo de route classique : 700x25C, compact 34/50, cassette 11-28 en 11 vitesses. */
const ROUTE: Bike = {
  id: 'test',
  name: 'Route',
  wheelCircumferenceMm: 2105,
  chainrings: [34, 50],
  cogs: [11, 12, 13, 14, 15, 17, 19, 21, 23, 25, 28],
  createdAt: 0,
}

const kmh = (v: number) => v / 3.6

describe('circumferenceFromDiameter', () => {
  it('applique πd', () => {
    expect(circumferenceFromDiameter(670)).toBe(2105)
  })
})

describe('wheelRpm', () => {
  it('compte les tours de roue par minute', () => {
    // 2,105 m par tour, 2,105 m/s => exactement 60 tr/min
    expect(wheelRpm(2.105, 2105)).toBeCloseTo(60, 6)
  })

  it('renvoie 0 pour une circonférence absurde plutôt que l_infini', () => {
    expect(wheelRpm(10, 0)).toBe(0)
  })
})

describe('cadenceRpm', () => {
  it('donne une cadence de route plausible', () => {
    // 30 km/h en 50x15 : autour de 71 tr/min
    expect(cadenceRpm(kmh(30), 2105, 50, 15)).toBeCloseTo(71.3, 1)
  })

  it('monte la cadence quand le pignon grandit', () => {
    const petit = cadenceRpm(kmh(25), 2105, 34, 15)
    const grand = cadenceRpm(kmh(25), 2105, 34, 25)
    expect(grand).toBeGreaterThan(petit)
  })

  it('baisse la cadence quand le plateau grandit', () => {
    expect(cadenceRpm(kmh(25), 2105, 50, 15)).toBeLessThan(cadenceRpm(kmh(25), 2105, 34, 15))
  })

  it("est nulle à l'arrêt", () => {
    expect(cadenceRpm(0, 2105, 50, 15)).toBe(0)
  })

  it('renvoie 0 sur une transmission incomplète au lieu de diviser par zéro', () => {
    expect(cadenceRpm(kmh(30), 2105, 0, 15)).toBe(0)
    expect(cadenceRpm(kmh(30), 2105, 50, 0)).toBe(0)
  })
})

describe('developmentM', () => {
  it('donne la distance parcourue en un tour de pédalier', () => {
    expect(developmentM(2105, 50, 15)).toBeCloseTo(7.017, 3)
  })

  it("s'accorde avec la cadence : développement × cadence = vitesse", () => {
    const speed = kmh(28)
    const rpm = cadenceRpm(speed, 2105, 34, 19)
    const dev = developmentM(2105, 34, 19)
    expect((rpm * dev) / 60).toBeCloseTo(speed, 6)
  })
})

describe('gearRatio', () => {
  it('divise plateau par pignon', () => {
    expect(gearRatio(50, 25)).toBe(2)
  })

  it('encaisse un pignon manquant', () => {
    expect(gearRatio(50, 0)).toBe(0)
  })
})

describe('speedForCadence', () => {
  it("inverse cadenceRpm", () => {
    const speed = speedForCadence(90, 2105, 50, 17)
    expect(cadenceRpm(speed, 2105, 50, 17)).toBeCloseTo(90, 6)
  })
})

describe('allGears', () => {
  it('énumère toutes les combinaisons', () => {
    expect(allGears(ROUTE)).toHaveLength(ROUTE.chainrings.length * ROUTE.cogs.length)
  })

  it('les trie du plus court au plus long développement', () => {
    const devs = allGears(ROUTE).map((g) => g.dev)
    expect(devs).toEqual([...devs].sort((a, b) => a - b))
  })

  it('indexe correctement dans les tableaux du vélo', () => {
    const gears = allGears(ROUTE)
    const plusCourt = gears[0]
    // Le plus petit développement : petit plateau, plus grand pignon.
    expect(ROUTE.chainrings[plusCourt.front]).toBe(34)
    expect(ROUTE.cogs[plusCourt.rear]).toBe(28)

    const plusLong = gears[gears.length - 1]
    expect(ROUTE.chainrings[plusLong.front]).toBe(50)
    expect(ROUTE.cogs[plusLong.rear]).toBe(11)
  })
})

describe('bestGearFor', () => {
  it("propose un rapport qui approche la cadence cible", () => {
    const speed = kmh(30)
    const g = bestGearFor(ROUTE, speed, 90)
    expect(g).not.toBeNull()
    const rpm = cadenceRpm(speed, ROUTE.wheelCircumferenceMm, ROUTE.chainrings[g!.front], ROUTE.cogs[g!.rear])
    expect(Math.abs(rpm - 90)).toBeLessThan(5)
  })

  it('ne fait pas mieux que le meilleur rapport disponible', () => {
    const speed = kmh(22)
    const g = bestGearFor(ROUTE, speed, 85)!
    const best = cadenceRpm(speed, ROUTE.wheelCircumferenceMm, ROUTE.chainrings[g.front], ROUTE.cogs[g.rear])
    for (const other of allGears(ROUTE)) {
      const rpm = cadenceRpm(speed, ROUTE.wheelCircumferenceMm, ROUTE.chainrings[other.front], ROUTE.cogs[other.rear])
      expect(Math.abs(best - 85)).toBeLessThanOrEqual(Math.abs(rpm - 85) + 1e-9)
    }
  })

  it('durcit le rapport quand la vitesse monte à cadence cible constante', () => {
    const lent = bestGearFor(ROUTE, kmh(18), 85)!
    const vite = bestGearFor(ROUTE, kmh(38), 85)!
    expect(vite.dev).toBeGreaterThan(lent.dev)
  })

  it("ne propose rien à l'arrêt, faute de information", () => {
    expect(bestGearFor(ROUTE, 0, 85)).toBeNull()
  })

  it('renvoie null sur un vélo sans transmission', () => {
    expect(bestGearFor({ ...ROUTE, chainrings: [], cogs: [] }, kmh(25), 85)).toBeNull()
  })
})
