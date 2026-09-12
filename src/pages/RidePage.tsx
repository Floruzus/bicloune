import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { useSpeed } from '../lib/useSpeed'
import { useSwipe, haptic } from '../lib/useGearGesture'
import { useWakeLock } from '../lib/storage'
import { bestGearFor, cadenceRpm, developmentM } from '../lib/cadence'
import CadenceDial from '../components/CadenceDial'
import GearPad from '../components/GearPad'

export default function RidePage() {
  const { bike, gear, setGear, targetRpm, setTargetRpm } = useStore()
  const speed = useSpeed()
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  const tracking = speed.status === 'tracking' || speed.status === 'requesting'
  useWakeLock(tracking)

  const flash = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 1100)
  }, [])

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  const chainring = bike?.chainrings[gear.front] ?? 0
  const cog = bike?.cogs[gear.rear] ?? 0

  const rpm = bike ? cadenceRpm(speed.speedMs, bike.wheelCircumferenceMm, chainring, cog) : 0
  const dev = bike ? developmentM(bike.wheelCircumferenceMm, chainring, cog) : 0
  const kmh = speed.speedMs * 3.6

  const shiftRear = useCallback(
    (delta: number) => {
      if (!bike) return
      const rear = Math.min(Math.max(gear.rear + delta, 0), bike.cogs.length - 1)
      if (rear === gear.rear) return
      haptic(12)
      setGear({ ...gear, rear })
    },
    [bike, gear, setGear],
  )

  const shiftFront = useCallback(
    (delta: number) => {
      if (!bike) return
      const front = Math.min(Math.max(gear.front + delta, 0), bike.chainrings.length - 1)
      if (front === gear.front) return
      haptic([10, 30, 10])
      setGear({ ...gear, front })
    },
    [bike, gear, setGear],
  )

  // Un geste par pavé : la zone dit quel dérailleur, le sens dit quoi en faire.
  // Vers le haut = plus dur, dans les deux pavés.
  const frontSwipe = useSwipe((dir) => {
    if (dir === 'up') shiftFront(1)
    else if (dir === 'down') shiftFront(-1)
  })

  const rearSwipe = useSwipe((dir) => {
    if (dir === 'up') shiftRear(-1)
    else if (dir === 'down') shiftRear(1)
  })

  const suggestion = bike ? bestGearFor(bike, speed.speedMs, targetRpm) : null
  const suggestBetter =
    suggestion && (suggestion.front !== gear.front || suggestion.rear !== gear.rear)

  if (!bike) {
    return (
      <main className="screen empty">
        <h1>Bicloune</h1>
        <p>Ajoute un vélo pour commencer.</p>
        <Link className="btn primary" to="/bikes/new">
          Ajouter un vélo
        </Link>
      </main>
    )
  }

  return (
    <main className="screen ride">
      <header className="topbar">
        <Link to="/bikes" className="bike-pill">
          <span className="bike-name">{bike.name}</span>
          <span className="chev">▾</span>
        </Link>
        <div className={`gps gps-${speed.weakSignal ? 'weak' : speed.status}`}>
          <span className="dot" />
          {speed.status === 'tracking'
            ? speed.weakSignal
              ? `Signal faible ±${Math.round(speed.accuracy ?? 0)} m`
              : `GPS ±${Math.round(speed.accuracy ?? 0)} m`
            : speed.status === 'requesting'
              ? 'Recherche GPS…'
              : speed.status === 'denied'
                ? 'Position refusée'
                : speed.status === 'error'
                  ? 'Erreur GPS'
                  : 'GPS arrêté'}
        </div>
      </header>

      <CadenceDial
        rpm={rpm}
        target={targetRpm}
        onTargetChange={setTargetRpm}
        active={speed.status === 'tracking'}
      />

      <div className="stats">
        <div className="stat">
          <span className="v">{kmh > 0 ? kmh.toFixed(1) : '0.0'}</span>
          <span className="k">km/h</span>
        </div>
        <div className="stat">
          <span className="v">{dev.toFixed(2)}</span>
          <span className="k">m / tour</span>
        </div>
        <div className="stat">
          <span className="v">{(speed.distanceM / 1000).toFixed(2)}</span>
          <span className="k">km</span>
        </div>
      </div>

      <section className="gears">
        <GearPad
          label="Plateau"
          teeth={bike.chainrings}
          index={gear.front}
          harderDelta={1}
          swipe={frontSwipe}
          onSelect={(i) => {
            haptic([10, 30, 10])
            setGear({ ...gear, front: i })
          }}
        />
        <GearPad
          label="Pignon"
          teeth={bike.cogs}
          index={gear.rear}
          harderDelta={-1}
          swipe={rearSwipe}
          onSelect={(i) => {
            haptic(12)
            setGear({ ...gear, rear: i })
          }}
        />
      </section>

      <div className="hint">
        Glisse le pouce dans une zone · haut = plus dur
        <span className="hint-sub">Reste appuyé pour enchaîner les vitesses</span>
        {suggestBetter && suggestion && (
          <button
            type="button"
            className="suggest"
            onClick={() => {
              setGear({ front: suggestion.front, rear: suggestion.rear })
              haptic(20)
              flash(
                `${bike.chainrings[suggestion.front]} × ${bike.cogs[suggestion.rear]} pour ${targetRpm} tr/min`,
              )
            }}
          >
            Rapport idéal : {bike.chainrings[suggestion.front]} × {bike.cogs[suggestion.rear]}
          </button>
        )}
      </div>

      <footer className="bottombar">
        <button
          type="button"
          className={'btn primary ' + (tracking ? 'stop' : '')}
          onClick={() => {
            if (tracking) speed.stop()
            else {
              speed.resetTrip()
              speed.start()
            }
            haptic(18)
          }}
        >
          {tracking ? 'Arrêter' : 'Démarrer'}
        </button>
      </footer>

      {speed.error && <div className="banner error">{speed.error}</div>}
      {toast && <div className="toast">{toast}</div>}
    </main>
  )
}
