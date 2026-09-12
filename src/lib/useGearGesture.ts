import { useCallback, useEffect, useRef } from 'react'

export type Dir = 'up' | 'down' | 'left' | 'right'

type Options = {
  /** Déplacement minimal pour valider un geste. */
  threshold?: number
  /** L'axe dominant doit dépasser l'autre d'au moins ce facteur, sinon le geste est ambigu. */
  dominance?: number
  /** Délai minimal entre deux changements, anti-rebond. */
  cooldownMs?: number
  /** Attente avant que le maintien du doigt n'enchaîne les vitesses. */
  holdDelayMs?: number
  /** Intervalle de répétition initial, puis accéléré. */
  repeatMs?: number
  repeatMinMs?: number
}

type Gesture = {
  id: number
  x: number
  y: number
  /** Direction validée, null tant que le geste n'a pas franchi le seuil. */
  dir: Dir | null
}

/**
 * Gestes de changement de vitesse, pensés pour le pouce en roulant.
 *
 * L'axe seul porte le sens — n'importe où sur l'écran, aucune zone à viser :
 * vertical pour les pignons, horizontal pour les plateaux. Dans les deux cas,
 * haut et droite vont vers le plus dur.
 *
 * Un geste = un changement : le rapport passe dès que le seuil est franchi, puis
 * la direction est verrouillée jusqu'au relâchement — impossible d'en sauter
 * plusieurs d'un seul mouvement, même long ou hésitant. Garder le doigt appuyé
 * après le geste enchaîne les vitesses, de plus en plus vite.
 */
export function useSwipe(onShift: (dir: Dir) => void, options: Options = {}) {
  const {
    threshold = 44,
    dominance = 1.4,
    cooldownMs = 220,
    holdDelayMs = 500,
    repeatMs = 260,
    repeatMinMs = 130,
  } = options

  const g = useRef<Gesture | null>(null)
  /** Dernier changement, tous gestes confondus : filtre les rebonds d'un doigt qui redécolle. */
  const lastFire = useRef(0)
  const timer = useRef<number | null>(null)
  const cb = useRef(onShift)
  cb.current = onShift

  const stopRepeat = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const end = useCallback(() => {
    g.current = null
    stopRepeat()
  }, [stopRepeat])

  useEffect(() => stopRepeat, [stopRepeat])

  /** Enchaîne tant que le doigt reste posé, avec une cadence qui s'accélère. */
  const scheduleRepeat = useCallback(
    (count: number) => {
      stopRepeat()
      const delay =
        count === 0 ? holdDelayMs : Math.max(repeatMinMs, repeatMs - (count - 1) * 30)
      timer.current = window.setTimeout(() => {
        const cur = g.current
        if (!cur?.dir) return
        cb.current(cur.dir)
        lastFire.current = performance.now()
        scheduleRepeat(count + 1)
      }, delay)
    },
    [holdDelayMs, repeatMs, repeatMinMs, stopRepeat],
  )

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Les contrôles à geste propre (slider, liens) gardent la main. Les dents, elles,
    // sont dans la zone de swipe : un tap les sélectionne, un glissé change de vitesse.
    if ((e.target as HTMLElement).closest('input, a, [role="button"]')) return
    // Un seul doigt à la fois : un deuxième contact ne doit pas ouvrir un second geste.
    if (g.current) return

    g.current = { id: e.pointerId, x: e.clientX, y: e.clientY, dir: null }
    // Garde les événements même si le doigt sort de l'élément.
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* capture refusée : les événements remonteront quand même dans la majorité des cas */
    }
  }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const cur = g.current
      if (!cur || cur.id !== e.pointerId) return
      // Direction déjà verrouillée : le reste du mouvement est ignoré, seul le
      // maintien (géré par le timer) peut enchaîner.
      if (cur.dir) return

      const dx = e.clientX - cur.x
      const dy = e.clientY - cur.y
      const ax = Math.abs(dx)
      const ay = Math.abs(dy)
      if (Math.max(ax, ay) < threshold) return
      // Geste en diagonale : on attend que l'intention se précise plutôt que de trancher.
      if (Math.max(ax, ay) < Math.min(ax, ay) * dominance) return
      if (performance.now() - lastFire.current < cooldownMs) return

      cur.dir = ay > ax ? (dy < 0 ? 'up' : 'down') : dx < 0 ? 'left' : 'right'
      lastFire.current = performance.now()
      cb.current(cur.dir)
      scheduleRepeat(0)
    },
    [threshold, dominance, cooldownMs, scheduleRepeat],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (g.current && g.current.id !== e.pointerId) return
      end()
    },
    [end],
  )

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onLostPointerCapture: onPointerUp,
  }
}

export function haptic(pattern: number | number[] = 12) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* pas de vibreur */
  }
}
