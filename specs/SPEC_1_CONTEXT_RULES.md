# SHITHEAD — Spec Prompt · Partie 1 : Contexte, Règles & Architecture

## Contexte du projet

Jeu de cartes **Shithead** en React, standalone (un seul fichier `.jsx`), sans backend.
- 1 joueur humain + 1 à 3 bots IA
- Interface esthétique "casino underground" (tapis vert feutré, typographie serif, palette or/bordeaux)
- Tout le moteur de jeu est inline dans le même fichier que l'UI

---

## Stack technique

- **React 18** avec hooks (`useState`, `useEffect`, `useRef`, `useLayoutEffect`)
- **Aucune dépendance externe** — pas de Tailwind, pas de lib de cartes, pas de router
- Styles 100% inline (`style={{...}}`)
- CSS keyframes injectés via `document.createElement("style")` au chargement
- Export default : `ShitheadGame`

---

## Structure du fichier unique `shithead-ui.jsx`

```
1. CSS keyframes (injection <style>)
2. Moteur de jeu (fonctions pures)
3. Composants React
4. Export default ShitheadGame
```

---

## Règles du jeu — CRITIQUES à respecter exactement

### Deck
- 52 cartes standard (4 couleurs × 13 valeurs) + 2 Jokers = 54 cartes
- `SUITS = ["♠","♥","♦","♣"]`
- `VALUES = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"]`
- IDs uniques : `"${value}${suit}"` pour les cartes normales, `"joker_0"` et `"joker_1"`

### Distribution (9 cartes par joueur)
- 3 cartes **face-down** (cachées, jamais vues)
- 3 cartes **face-up** (visibles de tous)
- 3 cartes **main** (visible que du joueur)
- Le reste forme la pioche

### Phases de jeu d'un joueur
1. `"hand"` — joue depuis sa main, se réapprovisionne à 3 cartes depuis la pioche
2. `"face_up"` — quand la main est vide, joue les cartes face-up
3. `"face_down"` — quand face-up vides, joue les cartes face-down à l'aveugle

### Cartes spéciales

| Carte | Jouable sur | Effet |
|-------|-------------|-------|
| **2** | N'importe quoi | Reset — remet la valeur à 2 |
| **3** | N'importe quoi | Transparent — la valeur effective est celle en dessous |
| **7** | Doit respecter ≥ valeur du talon | Le joueur suivant doit jouer ≤ 7 |
| **10** | N'importe quoi | Brûle le talon 🔥, rejoue |
| **Joker** | N'importe quoi | Inverse le sens du jeu |
| **4× même valeur** | — | Brûle automatiquement le talon, rejoue |

### Règle générale de jeu
- On doit toujours poser une carte **≥ valeur effective du talon**
- La **valeur effective** = première valeur non-3 et non-Joker en remontant le talon
- Exception : cartes spéciales 2, 3, 10, Joker jouables sur tout
- **Le 7 suit la règle normale ≥** (ce n'est PAS une carte spéciale au sens jouabilité)

### Règle mustPlayLower (effet du 7)
- Après un 7, `mustPlayLower = true`
- Le joueur suivant doit jouer une carte ≤ 7
- Les spéciales 2, 3, 10, Joker restent jouables même sous effet du 7

### Ramassage du talon
- Si le joueur n'a **aucune carte jouable** → obligé de ramasser tout le talon
- Si le talon est vide → pioche 1 carte de la pioche
- Le bouton RAMASSER est actif **seulement** si aucun coup jouable

### Fin de partie
- Un joueur qui n'a plus aucune carte (main + face-up + face-down) **gagne**
- Le dernier joueur restant est le **SHITHEAD** 💩

### Phase face-down — comportement
- Le joueur retourne une carte à l'aveugle (flip animé au clic)
- **Pas de pénalité** si la carte n'est pas jouable — le moteur bloque la sélection en amont
- En phase face-down, `hasAnyPlayable = true` toujours (on peut toujours tenter)

---

## État du jeu — structure complète

```js
{
  status: "setup" | "playing" | "finished",
  direction: 1 | -1,
  currentPlayerIndex: number,
  players: [
    {
      id: "p0" | "p1" | "p2" | "p3",
      name: string,
      handCards: Card[],      // triées par valeur
      faceUpCards: Card[],
      faceDownCards: Card[],
      phase: "hand" | "face_up" | "face_down",
      isShithead: boolean,
      setupConfirmed: boolean,
      isHuman: boolean,        // true uniquement pour players[0]
    }
  ],
  pile: Card[],               // pioche restante
  discard: Card[],            // talon (cartes jouées)
  lastPlayedValue: string|null,
  mustPlayLower: boolean,
  winner: string|null,        // player.id
  shithead: string|null,      // player.id
  log: string[],              // max 20 entrées
  burnedPiles: number,
}
```

```js
// Card
{ suit: "♠"|"♥"|"♦"|"♣"|null, value: string, id: string }
```

---

## Tri des cartes

Ordre numérique : `🃏=1, 2=2, 3=3, ..., 10=10, J=11, Q=12, K=13, A=14`

`sortCards()` trie toujours par `cardNumericValue` croissant.
Appliqué après chaque draw, pickup, swap en setup.

---

## Logique de jouabilité — CRITIQUE

```js
// Valeur effective du talon : ignore 3 ET Joker en remontant
function getEffectiveDiscardValue(discard) {
  for (let i = discard.length-1; i >= 0; i--) {
    const v = discard[i].value;
    if (v !== "3" && v !== "🃏") return v;
  }
  return null;
}

// Carte individuelle jouable ?
function canPlayValue(val, state) {
  if (val === "2" || val === "3" || val === "10" || val === "🃏") return true;
  const eff = getEffectiveDiscardValue(state.discard);
  if (eff === null) return true;
  if (state.mustPlayLower) return cardNumericValue(val) <= 7;
  return cardNumericValue(val) >= cardNumericValue(eff);
}

// Groupe de cartes jouable (tient compte du burn 4-of-a-kind)
function canPlayGroup(cards, state, allZoneCards) {
  if (!cards || cards.length === 0) return false;
  const val = cards[0].value;
  const totalOfValue = allZoneCards.filter(c => c.value === val).length;
  if (totalOfValue >= 4 && cards.length >= 4) return true; // 4 identiques = burn
  return canPlayValue(val, state);
}

// Le joueur a-t-il au moins un coup ?
function hasPlayableMove(zoneCards, state) {
  const groups = {};
  for (const c of zoneCards) {
    if (!groups[c.value]) groups[c.value] = [];
    groups[c.value].push(c);
  }
  return Object.values(groups).some(g => canPlayGroup(g, state, zoneCards));
}
```

---

## IA des bots

```js
function getBotMove(state, playerIndex) {
  // Phase face_down : carte aléatoire
  if (player.phase === "face_down")
    return { type: "play", cards: [zone[random]] };

  // Grouper par valeur, filtrer jouables
  const playable = Object.values(groups).filter(g => canPlayGroup(g, state, zone));
  if (playable.length === 0) return { type: "draw" };

  // Priorité : 10 (burn) > 2 (reset) > groupe le plus grand > valeur la plus haute
  playable.sort(...);
  return { type: "play", cards: playable[0] };
}
```

Délai bot : `900ms + random(600ms)` avant chaque coup.

---

## Positionnement des bots selon nombre de joueurs

| Joueurs | Positions |
|---------|-----------|
| 2 | top |
| 3 | left, right |
| 4 | left, top, right |

Bots latéraux : rotation CSS -90° (gauche) / +90° (droite).
