import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { WHEEL_PRESETS, circumferenceFromDiameter } from '../lib/cadence'

const CASSETTE_PRESETS: { label: string; cogs: number[] }[] = [
  { label: '11v 11-28 (route)', cogs: [11, 12, 13, 14, 15, 17, 19, 21, 23, 25, 28] },
  { label: '11v 11-34 (endurance)', cogs: [11, 13, 15, 17, 19, 21, 23, 25, 27, 30, 34] },
  { label: '12v 10-45 (gravel)', cogs: [10, 11, 12, 13, 15, 17, 19, 21, 24, 28, 33, 45] },
  { label: '12v 10-51 (VTT)', cogs: [10, 12, 14, 16, 18, 21, 24, 28, 33, 39, 45, 51] },
  { label: '8v 11-32', cogs: [11, 13, 15, 18, 21, 24, 28, 32] },
]

function parseTeeth(s: string): number[] {
  return s
    .split(/[^0-9]+/)
    .map((n) => parseInt(n, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b)
}

export default function BikeFormPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { bikes, addBike, updateBike } = useStore()
  const existing = bikes.find((b) => b.id === id)

  const [name, setName] = useState(existing?.name ?? '')
  const [circ, setCirc] = useState(String(existing?.wheelCircumferenceMm ?? 2105))
  const [chainrings, setChainrings] = useState((existing?.chainrings ?? [34, 50]).join(' / '))
  const [cogs, setCogs] = useState(
    (existing?.cogs ?? [11, 12, 13, 14, 15, 17, 19, 21, 23, 25, 28]).join(' / '),
  )
  const [diameter, setDiameter] = useState('')

  const parsedChainrings = parseTeeth(chainrings)
  const parsedCogs = parseTeeth(cogs)
  const circumference = Number(circ)
  const valid =
    name.trim().length > 0 &&
    circumference > 500 &&
    circumference < 3000 &&
    parsedChainrings.length > 0 &&
    parsedCogs.length > 0

  const save = () => {
    if (!valid) return
    const payload = {
      name: name.trim(),
      wheelCircumferenceMm: Math.round(circumference),
      chainrings: parsedChainrings,
      cogs: parsedCogs,
    }
    if (existing) updateBike(existing.id, payload)
    else addBike(payload)
    nav('/bikes')
  }

  return (
    <main className="screen form">
      <header className="topbar">
        <Link to="/bikes" className="back">
          ←
        </Link>
        <h1>{existing ? 'Modifier le vélo' : 'Nouveau vélo'}</h1>
        <span />
      </header>

      <label className="field">
        <span>Nom</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Route, Gravel, VTT…"
          autoFocus={!existing}
        />
      </label>

      <fieldset className="field">
        <legend>Roue — circonférence développée</legend>
        <div className="inline">
          <input
            type="number"
            inputMode="numeric"
            value={circ}
            onChange={(e) => setCirc(e.target.value)}
          />
          <span className="unit">mm</span>
        </div>
        <div className="chips">
          {WHEEL_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className={'chip' + (Number(circ) === p.mm ? ' is-active' : '')}
              onClick={() => setCirc(String(p.mm))}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="inline sub">
          <span>Ou depuis le diamètre hors-tout :</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="670"
            value={diameter}
            onChange={(e) => {
              setDiameter(e.target.value)
              const d = Number(e.target.value)
              if (d > 200) setCirc(String(circumferenceFromDiameter(d)))
            }}
          />
          <span className="unit">mm</span>
        </div>
      </fieldset>

      <label className="field">
        <span>Plateaux — denture, séparée par des espaces</span>
        <input
          value={chainrings}
          onChange={(e) => setChainrings(e.target.value)}
          inputMode="numeric"
          placeholder="34 50"
        />
        <small className="muted">
          {parsedChainrings.length} plateau{parsedChainrings.length > 1 ? 'x' : ''} :{' '}
          {parsedChainrings.join(', ') || '—'}
        </small>
      </label>

      <label className="field">
        <span>Pignons — denture de la cassette</span>
        <input
          value={cogs}
          onChange={(e) => setCogs(e.target.value)}
          inputMode="numeric"
          placeholder="11 12 13 …"
        />
        <small className="muted">
          {parsedCogs.length} vitesse{parsedCogs.length > 1 ? 's' : ''} :{' '}
          {parsedCogs.join(', ') || '—'}
        </small>
        <div className="chips">
          {CASSETTE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="chip"
              onClick={() => setCogs(p.cogs.join(' / '))}
            >
              {p.label}
            </button>
          ))}
        </div>
      </label>

      <div className="form-actions">
        <button type="button" className="btn primary" disabled={!valid} onClick={save}>
          Enregistrer
        </button>
      </div>
    </main>
  )
}
