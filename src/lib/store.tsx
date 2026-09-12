import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import type { Bike, GearState } from './types'
import { useLocalStorage, uid } from './storage'

type Store = {
  bikes: Bike[]
  bike: Bike | null
  selectedId: string | null
  select: (id: string) => void
  addBike: (b: Omit<Bike, 'id' | 'createdAt'>) => Bike
  updateBike: (id: string, patch: Partial<Omit<Bike, 'id' | 'createdAt'>>) => void
  removeBike: (id: string) => void
  gear: GearState
  setGear: (g: GearState | ((g: GearState) => GearState)) => void
  targetRpm: number
  setTargetRpm: (n: number) => void
}

const Ctx = createContext<Store | null>(null)

const DEFAULT_BIKE: Omit<Bike, 'id' | 'createdAt'> = {
  name: 'Mon vélo',
  wheelCircumferenceMm: 2105,
  chainrings: [34, 50],
  cogs: [11, 12, 13, 14, 15, 17, 19, 21, 23, 25, 28],
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [bikes, setBikes] = useLocalStorage<Bike[]>('bicloune.bikes', [])
  const [selectedId, setSelectedId] = useLocalStorage<string | null>('bicloune.selected', null)
  const [gearByBike, setGearByBike] = useLocalStorage<Record<string, GearState>>('bicloune.gear', {})
  const [targetRpm, setTargetRpm] = useLocalStorage<number>('bicloune.targetRpm', 85)
  const seeded = useRef(false)

  // Premier lancement : un vélo d'exemple, modifiable, plutôt qu'un écran vide.
  // La garde est une ref, pas un état : en StrictMode l'effet est rejoué avant que
  // le moindre rendu n'ait committé un état, et un drapeau d'état ne bloquerait rien.
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    if (bikes.length === 0) {
      const b: Bike = { ...DEFAULT_BIKE, id: uid(), createdAt: Date.now() }
      setBikes([b])
      setSelectedId(b.id)
    }
  }, [bikes.length, setBikes, setSelectedId])

  const bike = useMemo(
    () => bikes.find((b) => b.id === selectedId) ?? bikes[0] ?? null,
    [bikes, selectedId],
  )

  const gear = useMemo<GearState>(() => {
    if (!bike) return { front: 0, rear: 0 }
    const g = gearByBike[bike.id]
    const front = Math.min(Math.max(g?.front ?? 0, 0), Math.max(bike.chainrings.length - 1, 0))
    const rear = Math.min(Math.max(g?.rear ?? Math.floor(bike.cogs.length / 2), 0), Math.max(bike.cogs.length - 1, 0))
    return { front, rear }
  }, [bike, gearByBike])

  const value: Store = {
    bikes,
    bike,
    selectedId: bike?.id ?? null,
    select: (id) => setSelectedId(id),
    addBike: (b) => {
      const created: Bike = { ...b, id: uid(), createdAt: Date.now() }
      setBikes((prev) => [...prev, created])
      setSelectedId(created.id)
      return created
    },
    updateBike: (id, patch) =>
      setBikes((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b))),
    removeBike: (id) => {
      setBikes((prev) => prev.filter((b) => b.id !== id))
      setSelectedId((cur) => (cur === id ? null : cur))
    },
    gear,
    setGear: (g) => {
      if (!bike) return
      setGearByBike((prev) => ({
        ...prev,
        [bike.id]: typeof g === 'function' ? g(prev[bike.id] ?? gear) : g,
      }))
    },
    targetRpm,
    setTargetRpm,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore doit être utilisé dans <StoreProvider>')
  return ctx
}
