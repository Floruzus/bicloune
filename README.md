# Bicloune

PWA de cadence de pédalage. Elle lit la vitesse GPS du téléphone et la convertit en
tours de pédalier par minute à partir de la circonférence de roue et du rapport engagé.

```
cadence (tr/min) = vitesse (m/s) × 60 / circonférence (m) × pignon / plateau
```

## Démarrer

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # calculs de transmission
npm run build && npm run preview
```

Le GPS exige un contexte sécurisé : `localhost` en dev, HTTPS en production. Pour tester
depuis le téléphone sur le réseau local, servir le build derrière HTTPS (tunnel ou
certificat local) — sinon `navigator.geolocation` refusera.

## Déploiement

GitHub Pages, via `.github/workflows/deploy.yml` : chaque poussée sur `main` lance les
tests puis publie `dist/`. À activer une fois dans **Settings → Pages → Source →
GitHub Actions**.

Le nom du dépôt est en dur dans `vite.config.ts` (`BASE = '/bicloune/'`) — Pages sert un
dépôt de projet sous `https://<compte>.github.io/<dépôt>/`, et tous les chemins d'assets
en dépendent. À changer là si le dépôt porte un autre nom, ou à mettre `'/'` pour un
dépôt `<compte>.github.io`.

Le routage est en `createHashRouter` (URLs en `/#/bikes`) parce que Pages ne sait pas
réécrire les URLs inconnues vers `index.html` : un accès direct à `/bikes` y renverrait
une vraie page 404. Le hash garde les liens profonds fonctionnels sans bricolage.

## Écrans

- `/` — mesure : cadran RPM, vitesse, développement, distance, pavés de rapport.
  La cadence cible se règle en glissant le doigt sur la couronne du cadran : la zone
  verte suit, et sa valeur s'affiche à côté du repère. Le centre reste inerte.
- `/bikes` — liste des vélos, sélection de celui utilisé.
- `/bikes/new`, `/bikes/:id` — roue (presets ou diamètre), dentures plateaux et pignons.

## Changement de vitesse

Deux pavés tactiles visibles en bas de l'écran, **Plateau** à gauche et **Pignon** à
droite. La zone dit quel dérailleur, le sens du geste dit quoi en faire :

| Geste dans un pavé | Effet |
| --- | --- |
| Glissé vers le haut | plus dur |
| Glissé vers le bas | plus facile |
| Doigt maintenu après le geste | enchaîne les vitesses, de plus en plus vite |
| Tap sur une barre | sélection directe de cette dent |

Un geste = un changement : la direction se verrouille dès le seuil franchi et ne se
relâche qu'au décollement du doigt, donc un mouvement long ou hésitant ne peut pas
sauter plusieurs vitesses. Seuil de 44 px, contrainte de dominance d'axe pour ignorer
les diagonales ambiguës, anti-rebond de 220 ms. Tout est paramétrable en tête de
`src/lib/useGearGesture.ts`.

Retour haptique différent pour un changement de plateau et de pignon, pour piloter à
l'aveugle. L'écran reste allumé pendant la mesure (Wake Lock).

## Structure

- `src/lib/cadence.ts` — toute la trigonométrie de transmission (cadence, développement,
  ratio, meilleur rapport pour une cadence cible). Pur, testable.
- `src/lib/useSpeed.ts` — `watchPosition`, utilise `coords.speed` quand le device la
  fournit, sinon dérive la vitesse de deux positions (haversine). Lissage exponentiel,
  seuil de bruit à l'arrêt, retour à zéro si le signal se perd. Les points au-delà de
  `maxAccuracyM` (25 m par défaut) sont rejetés : une vitesse dérivée d'un point flou
  est fausse, et le lissage la traînerait ensuite plusieurs secondes. L'en-tête affiche
  alors « Signal faible » plutôt que de figer un chiffre sans explication.
- `src/lib/store.tsx` — vélos, vélo courant, rapport engagé, cadence cible, en
  `localStorage`.

## Ensuite

Le routeur est déjà en place pour les écrans carte / historique de balades : `useSpeed`
accumule déjà distance et vitesse max, il reste à enregistrer la trace des positions.
