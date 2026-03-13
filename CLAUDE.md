# Shithead — Contexte projet Claude

## Vue d'ensemble

Jeu de cartes **Shithead** en React 19 + Vite. Interface entièrement en inline styles (pas de Tailwind, pas de CSS-in-JS lib). Logique de jeu en JS pur, sans dépendances externes.

## Stack

| Outil | Version |
|-------|---------|
| React | 19 |
| Vite | 8 |
| Node | ESM (`"type": "module"`) |
| Styles | Inline styles + keyframes injectées via `src/styles.js` |

## Structure des fichiers

```
src/
├── main.jsx                   # Point d'entrée, render <ShitheadGame />
├── App.jsx                    # Composant principal, gestion d'état global
├── index.css                  # Reset minimal (box-sizing, margin, padding)
├── styles.js                  # Injection des @keyframes CSS (dealCard, slideToDiscard, landCard, flipCard, burnFlash)
├── utils.js                   # cardRotation(id), cardOffset(id) — hash déterministe visuel
│
├── game/
│   ├── constants.js           # SUITS, VALUES, SPECIAL_INFO, cardNumericValue(), isRed()
│   └── engine.js              # Toute la logique : initGame, applyPlay, applyPickUp, getBotMove, canPlayGroup, …
│
└── components/
    ├── PlayingCard.jsx        # Carte face visible. Props: card, selected, onClick, onDoubleClick, disabled, glow, small, facedown, dealIdx
    ├── FaceDownCard.jsx       # Carte face cachée, révélation en 2 étapes (reveal → select)
    ├── FlyingCard.jsx         # Animation carte volante de la main vers la défausse
    ├── BotPlayerZone.jsx      # Zone d'un joueur bot (top / left / right)
    ├── DiscardPile.jsx        # Défausse centrale avec valeur effective
    ├── GameLog.jsx            # Journal flottant bas-droite (20 dernières actions)
    ├── SetupScreen.jsx        # Écran d'échange de cartes avant la partie
    ├── DealScreen.jsx         # Animation de distribution des cartes
    └── FinishedScreen.jsx     # Écran de fin (gagnant + shithead)
```

## Architecture d'état

Tout l'état du jeu vit dans un seul objet immuable (`state`) géré dans `App.jsx` via `useState`. Les fonctions du moteur (`engine.js`) sont **pures** : elles reçoivent `state`, retournent un nouvel état (`JSON.parse(JSON.stringify(state))` deep clone).

```js
state = {
  status: "setup" | "playing" | "finished",
  direction: 1 | -1,
  currentPlayerIndex: number,
  players: Player[],
  pile: Card[],
  discard: Card[],
  mustPlayLower: boolean,
  winner: string | null,
  shithead: string | null,
  log: string[],           // 20 dernières entrées max
  burnedPiles: number,
}

Player = {
  id, name, isHuman, isShithead,
  handCards: Card[],
  faceUpCards: Card[],
  faceDownCards: Card[],
  phase: "hand" | "face_up" | "face_down",
  setupConfirmed: boolean,
}

Card = { suit: string|null, value: string, id: string }
```

## Règles du jeu (Shithead)

- Chaque joueur reçoit 3 cartes face cachée, 3 face visible, 3 en main
- Phase setup : le joueur humain peut échanger main ↔ face visible avant de confirmer
- On joue dans l'ordre : **main → face visible → face cachée** (aveugle)
- On pose une carte dont la valeur est **≥ valeur effective** de la défausse
- **Cartes spéciales** :
  - `2` — jouable sur tout, remet le seuil à 2
  - `3` — transparent, la valeur effective reste celle d'avant
  - `7` — le joueur suivant doit jouer ≤ 7 (`mustPlayLower`)
  - `10` — brûle le talon (défausse vidée, rejoue)
  - `🃏` (Joker) — inverse le sens du jeu
- 4 cartes identiques d'affilée sur la défausse = talon brûlé automatiquement
- Si on ne peut pas jouer → on ramasse le talon (`applyPickUp`)
- On pioche après chaque coup pour rester à 3 cartes en main (si la pioche n'est pas vide)
- Le dernier joueur avec des cartes = le **SHITHEAD** (perdant)

## Conventions de code

- **Pas de Tailwind**, pas de CSS modules — uniquement des objets style inline
- Les keyframes sont dans `src/styles.js` (injectées une seule fois via `document.createElement("style")`)
- Les fonctions du moteur **ne mutent jamais** `state` — toujours deep clone en entrée
- `cardRefs` dans `App.jsx` : `useRef({})` indexé par `card.id`, utilisé pour les animations de vol (`FlyingCard`)
- Le double-clic sur une carte appelle `handleDoubleClickPlay(card)` qui bypasse `selectedCards` et joue directement
- Les bots jouent avec un délai aléatoire 900–1500ms via `setTimeout` dans un `useEffect`

## Compatibilité desktop & mobile

L'application doit fonctionner sur **desktop et mobile** (téléphones et tablettes). Toute nouvelle UI doit respecter ces contraintes :

- **Taille des cibles tactiles** : boutons et cartes ≥ 44×44px pour être facilement cliquables au doigt
- **Double-clic → double-tap** : sur mobile il n'y a pas de `dblclick` natif ; préférer un appui long (`onTouchStart` + timer) ou un tap rapide double géré manuellement si la fonctionnalité doit marcher tactile
- **Pas de hover-only** : ne jamais afficher d'information critique uniquement au survol (`onMouseEnter`) — tout doit être lisible sans hover
- **Layout fluide** : utiliser `flexWrap`, `maxWidth` en `%`, éviter les largeurs fixes en `px` pour les conteneurs principaux
- **Viewport** : la balise `<meta name="viewport" content="width=device-width, initial-scale=1">` est dans `index.html` — ne pas la supprimer
- **Police et tailles** : privilégier des tailles relatives (`em`, `rem`, `vw`) ou adapter via media queries pour les très petits écrans (< 400px)
- **Pas de scroll** : l'écran de jeu doit tenir en `height: 100dvh` (utiliser `dvh` plutôt que `vh` sur mobile pour éviter les problèmes de barre d'adresse du navigateur)

## Viewport & layout

- Conteneur racine : `height: 100vh` (pas `min-height` pour éviter le scroll)
- `src/index.css` contient uniquement un reset minimal — **ne pas remettre le CSS Vite par défaut** (il brise le layout avec `#root { width: 1126px; min-height: 100svh; display:flex }`)

## Commandes

```bash
npm run dev      # Démarrer le serveur de développement (port 5173)
npm run build    # Build de production
npm run preview  # Prévisualiser le build
```
