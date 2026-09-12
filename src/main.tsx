import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { StoreProvider } from './lib/store'
import RidePage from './pages/RidePage'
import BikesPage from './pages/BikesPage'
import BikeFormPage from './pages/BikeFormPage'
import './styles.css'

// Routage par hash : GitHub Pages ne sait pas réécrire les URLs vers index.html,
// donc un accès direct à /bikes y renverrait un 404. Avec le hash, tout se joue
// côté client et les liens profonds restent partageables.
const router = createHashRouter([
  { path: '/', element: <RidePage /> },
  { path: '/bikes', element: <BikesPage /> },
  { path: '/bikes/new', element: <BikeFormPage /> },
  { path: '/bikes/:id', element: <BikeFormPage /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <RouterProvider router={router} />
    </StoreProvider>
  </StrictMode>,
)
