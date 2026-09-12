import { useCallback, useRef } from 'react'

type Props = {
  rpm: number
  target: number
  onTargetChange: (rpm: number) => void
  /**
   * Bornes de la graduation. La cible partage exactement cette échelle : elle
   * atteint donc les deux butées du cercle, sans zone morte au bout de l'arc.
   */
  min?: number
  max?: number
  active: boolean
}

const R = 120
const STROKE = 14
const SIZE = 300
// Repère : 0° = haut, 90° = droite, 180° = bas. L'arc part du bas-gauche et tourne
// dans le sens horaire, laissant la coupure centrée en bas.
const ARC = 260 // degrés balayés
const START = 230 // degré de départ (bas-gauche)
/** Rayon mort au centre : en deçà, l'angle n'a plus de sens exploitable. */
const DEAD = 24

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function arcPath(from: number, to: number, r = R) {
  const c = SIZE / 2
  const a = polar(c, c, r, from)
  const b = polar(c, c, r, to)
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${b.x} ${b.y}`
}

/** Couleur selon l'écart à la cadence cible. */
function zoneColor(rpm: number, target: number) {
  if (rpm <= 0) return 'var(--dim)'
  const d = Math.abs(rpm - target)
  if (d <= 5) return 'var(--good)'
  if (d <= 15) return 'var(--ok)'
  return rpm < target ? 'var(--low)' : 'var(--high)'
}

export default function CadenceDial({
  rpm,
  target,
  onTargetChange,
  min = 40,
  max = 130,
  active,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)

  /** Cadence → position sur l'arc, 0 au début, 1 à la fin. */
  const ratio = useCallback(
    (v: number) => Math.max(0, Math.min(1, (v - min) / (max - min))),
    [min, max],
  )

  const end = START + ARC * ratio(rpm)
  const targetDeg = START + ARC * ratio(target)
  const color = zoneColor(rpm, target)

  const c = SIZE / 2
  const tOut = polar(c, c, R + STROKE / 2 + 3, targetDeg)
  const tIn = polar(c, c, R - STROKE / 2 - 3, targetDeg)
  const tLabel = polar(c, c, R + 26, targetDeg)

  /** Angle du point sous le doigt, ramené dans la fenêtre [START, START+360). */
  const degFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current
      if (!svg) return null
      const rect = svg.getBoundingClientRect()
      const x = ((clientX - rect.left) / rect.width) * SIZE - c
      const y = ((clientY - rect.top) / rect.height) * SIZE - c
      if (Math.hypot(x, y) < DEAD) return null

      let deg = (Math.atan2(y, x) * 180) / Math.PI + 90
      if (deg < 0) deg += 360
      if (deg < START) deg += 360
      return deg
    },
    [c],
  )

  /**
   * Coordonnées écran → cadence.
   *
   * Le secteur mort du bas n'est pas un raccourci entre les deux butées : on y
   * reste sur celle d'où l'on vient, sinon un débordement sous le cadran ferait
   * sauter la cible du minimum au maximum. La cible ne peut donc parcourir que
   * la partie visible du cercle.
   */
  const valueFromPoint = useCallback(
    (clientX: number, clientY: number, prev: number, constrain: boolean) => {
      const deg = degFromPoint(clientX, clientY)
      if (deg === null) return null

      const stick = prev <= (min + max) / 2 ? min : max
      if (deg > START + ARC) return constrain ? stick : null

      const value = min + ((deg - START) / ARC) * (max - min)
      const v = Math.round(Math.max(min, Math.min(max, value)))
      // Un doigt rapide peut franchir le secteur mort sans qu'aucun point n'y tombe :
      // le saut se reconnaît à son amplitude, et on le rabat sur la butée d'origine.
      if (constrain && Math.abs(v - prev) > (max - min) / 2) return stick
      return v
    },
    [degFromPoint, min, max],
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current
      if (!svg) return
      const deg = degFromPoint(e.clientX, e.clientY)
      // Appui au centre ou dans le secteur mort : rien à saisir, et surtout pas de
      // saut vers une butée arbitraire.
      if (deg === null || deg > START + ARC) return

      // Appui direct : on suit le doigt où qu'il se pose sur l'arc, sans contrainte
      // de continuité — c'est un choix délibéré, pas un glissé.
      const v = valueFromPoint(e.clientX, e.clientY, target, false)
      if (v === null) return
      dragging.current = true
      svg.setPointerCapture(e.pointerId)
      onTargetChange(v)
    },
    [degFromPoint, valueFromPoint, target, onTargetChange],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging.current) return
      const v = valueFromPoint(e.clientX, e.clientY, target, true)
      if (v !== null) onTargetChange(v)
    },
    [valueFromPoint, target, onTargetChange],
  )

  const stop = useCallback(() => {
    dragging.current = false
  }, [])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : 0
      if (!step) return
      e.preventDefault()
      onTargetChange(Math.max(min, Math.min(max, target + step)))
    },
    [target, min, max, onTargetChange],
  )

  return (
    <div className="dial">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stop}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="slider"
        aria-label="Cadence cible"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={target}
        aria-valuetext={`${target} tours par minute`}
      >
        {/* Surface de saisie : les arcs n'ont pas de remplissage, seul leur trait
            reçoit les appuis. Ce disque rend tout le cadran manipulable. */}
        <circle cx={c} cy={c} r={SIZE / 2} fill="transparent" />

        <path d={arcPath(START, START + ARC)} className="dial-track" strokeWidth={STROKE} />
        {/* Zone cible, déplaçable au doigt */}
        <path
          d={arcPath(START + ARC * ratio(target - 5), START + ARC * ratio(target + 5))}
          className="dial-zone"
          strokeWidth={STROKE}
        />
        {rpm >= min && (
          <path
            d={arcPath(START, end)}
            strokeWidth={STROKE}
            style={{ stroke: color }}
            className="dial-value"
          />
        )}

        {/* Poignée : le repère de cible et sa valeur, lisibles d'un coup d'œil */}
        <line x1={tOut.x} y1={tOut.y} x2={tIn.x} y2={tIn.y} className="dial-target" />
        <text x={tLabel.x} y={tLabel.y} className="dial-target-label">
          {target}
        </text>
      </svg>

      <div className="dial-center">
        <div className="rpm" style={{ color }}>
          {active && rpm > 0 ? Math.round(rpm) : '––'}
        </div>
        <div className="rpm-unit">tr/min</div>
      </div>
    </div>
  )
}
