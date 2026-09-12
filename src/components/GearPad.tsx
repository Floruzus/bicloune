import type { HTMLAttributes } from 'react'

type Props = {
  label: string
  /** Dentures telles que stockées, du plus petit au plus grand. */
  teeth: number[]
  index: number
  /**
   * Pas d'index qui durcit le rapport : +1 pour un plateau (plus grand = plus dur),
   * -1 pour un pignon (plus petit = plus dur). C'est ce qui réconcilie les deux
   * rangées avec le geste unique « vers le haut = plus dur ».
   */
  harderDelta: 1 | -1
  onSelect: (i: number) => void
  /** Handlers de geste fournis par useSwipe, propres à ce pavé. */
  swipe: HTMLAttributes<HTMLDivElement>
}

/**
 * Zone tactile dédiée à un dérailleur : swipe vertical n'importe où dedans,
 * ou tap direct sur une barre. Vers le haut = plus dur.
 *
 * La jauge est toujours ordonnée du plus facile au plus dur, de gauche à droite,
 * quel que soit le dérailleur : un geste vers le haut déplace le curseur vers la
 * droite dans les deux pavés.
 */
export default function GearPad({
  label,
  teeth,
  index,
  harderDelta,
  onSelect,
  swipe,
}: Props) {
  const current = teeth[index]
  const canHarder = index + harderDelta >= 0 && index + harderDelta < teeth.length
  const canEasier = index - harderDelta >= 0 && index - harderDelta < teeth.length

  // Ordre d'affichage : facile → dur. Pour une cassette, c'est l'ordre décroissant.
  const display = harderDelta === 1 ? teeth.map((t, i) => [t, i] as const) : teeth.map((t, i) => [t, i] as const).reverse()
  const rank = display.findIndex(([, i]) => i === index)

  return (
    <div className="pad" {...swipe}>
      <div className="pad-head">
        <span className="pad-label">{label}</span>
        <span className="pad-count">
          {rank + 1}/{teeth.length}
        </span>
      </div>

      <div className="pad-value">
        <span className={'pad-arrow' + (canHarder ? '' : ' is-off')} aria-hidden="true">
          ▲
        </span>
        <span className="pad-teeth">{current ?? '—'}</span>
        <span className={'pad-arrow' + (canEasier ? '' : ' is-off')} aria-hidden="true">
          ▼
        </span>
      </div>

      <div className="pad-track" role="group" aria-label={label}>
        {display.map(([t, real], pos) => (
          <button
            key={`${t}-${real}`}
            type="button"
            className={'tooth' + (real === index ? ' is-active' : '')}
            style={
              {
                // La hauteur suit la denture réelle, pas le rang : la jauge reste
                // une image de la cassette.
                '--h': `${34 + (t / Math.max(...teeth)) * 44}%`,
              } as React.CSSProperties
            }
            onClick={() => onSelect(real)}
            aria-label={`${label} ${t} dents`}
            aria-pressed={real === index}
            data-pos={pos}
          >
            <span>{t}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
