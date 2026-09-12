import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'

export default function BikesPage() {
  const { bikes, selectedId, select, removeBike } = useStore()
  const nav = useNavigate()

  return (
    <main className="screen list">
      <header className="topbar">
        <Link to="/" className="back">
          ←
        </Link>
        <h1>Mes vélos</h1>
        <Link to="/bikes/new" className="add" aria-label="Ajouter un vélo">
          +
        </Link>
      </header>

      <ul className="bikes">
        {bikes.map((b) => (
          <li key={b.id} className={b.id === selectedId ? 'is-active' : ''}>
            <button
              type="button"
              className="bike-row"
              onClick={() => {
                select(b.id)
                nav('/')
              }}
            >
              <span className="bike-name">{b.name}</span>
              <span className="bike-meta">
                {b.chainrings.join('/')} × {b.cogs.length}v · {b.wheelCircumferenceMm} mm
              </span>
            </button>
            <div className="row-actions">
              <Link to={`/bikes/${b.id}`} className="btn ghost">
                Modifier
              </Link>
              <button
                type="button"
                className="btn ghost danger"
                onClick={() => {
                  if (confirm(`Supprimer « ${b.name} » ?`)) removeBike(b.id)
                }}
              >
                Supprimer
              </button>
            </div>
          </li>
        ))}
      </ul>

      {bikes.length === 0 && <p className="muted">Aucun vélo enregistré.</p>}
    </main>
  )
}
