# SHITHEAD — Spec Prompt · Partie 2 : Design, Composants & Animations

## Palette & typographie

```
Fond principal   : radial-gradient(ellipse, #0d2e12, #061008, #030806)
Tapis vert       : rgba(20,60,20,0.4) + grille très subtile
Or               : #d4a017
Vert joueur      : #7ec8a0
Rouge ramassage  : #ff9070
Texte principal  : rgba(255,255,255,0.9)
Texte secondaire : rgba(255,255,255,0.3-0.5)

Typographie principale : 'Georgia', serif
Typographie titres     : 'Palatino Linotype', 'Book Antiqua', serif
Letterspacing élevé    : 2-6px sur labels et titres
```

---

## CSS Keyframes (injectés une seule fois via id="sh-css")

```css
@keyframes dealCard {
  from { opacity:0; transform:translateY(-80px) scale(0.6) rotate(-10deg); }
  to   { opacity:1; transform:translateY(0) scale(1) rotate(0deg); }
}
@keyframes slideToDiscard {
  0%   { opacity:1; transform:translate(0,0) scale(1) rotate(0deg); }
  45%  { opacity:1; transform:translate(var(--tx),var(--ty)) scale(1.1) rotate(var(--rot)); }
  100% { opacity:0; transform:translate(var(--tx),var(--ty)) scale(0.95) rotate(var(--rot)); }
}
@keyframes landCard {
  0%   { transform:rotate(var(--rot)) translateY(-14px) scale(1.12); }
  100% { transform:rotate(var(--rot)) translateY(0) scale(1); }
}
@keyframes flipCard {
  0%   { transform:rotateY(0deg); }
  49%  { transform:rotateY(90deg); }
  51%  { transform:rotateY(-90deg); }
  100% { transform:rotateY(0deg); }
}
@keyframes burnFlash {
  0%,100% { opacity:1; }
  40%     { opacity:0.1; box-shadow:0 0 40px rgba(255,80,0,0.9); }
}
```

---

## Composants

### `PlayingCard` props
```
card, selected, onClick, disabled, hidden, small, facedown, glow, dealIdx
```

**Taille normale** : 70×98px  
**Taille small** (bots) : 44×62px  

**Dos de carte** (facedown/hidden) :
- Background : `linear-gradient(135deg, #6b1a1a, #3d0f0f 50%, #6b1a1a)`
- Border : `2px solid #8b3030`
- Motif interne : diagonale répétée très subtile
- Icône : 🂠

**Face de carte** :
- Background normal : `linear-gradient(160deg, #fffff8, #f5f0e8)`
- Background selected : `linear-gradient(135deg, #fffde0, #fff9c4)`
- Border selected : `2.5px solid #d4a017`
- Transform selected : `translateY(-12px) scale(1.05)`
- Glow jouable : `box-shadow: 0 0 16px rgba(100,220,100,0.6)`
- Badge spéciale : absolute, bottom-right, fond or translucide, fontSize 8px
- Rouge : ♥ ♦ → `#c0392b` / Noir : ♠ ♣ → `#1a1a2e`

**Animation dealIdx** : si `dealIdx !== undefined` → `dealCard 0.38s` avec délai `dealIdx * 65ms`

---

### `FaceDownCard`

Wrapper autour de `PlayingCard` avec état local `flipping` et `revealed`.

- 1er clic → animation `flipCard 0.5s`, puis affiche la carte face visible
- 2e clic → sélectionne la carte (`onClick`)
- Affiche `glow` si `isPlayable && !selected` une fois révélée

---

### `FlyingCard`

Animation de glissement d'une carte vers le talon au moment du jeu.

- Prend `fromRect` et `toRect` (via `getBoundingClientRect()`)
- Position `fixed`, `zIndex: 600`, `pointerEvents: none`
- Calcule `--tx`, `--ty` = delta centres, `--rot` = rotation déterministe de la carte
- Joue `slideToDiscard 0.44s` via `useLayoutEffect`
- `onDone` appelé après 440ms

---

### `DiscardPile`

- Affiche les 7 dernières cartes du talon en pile désordonnée
- Rotation déterministe par hash de l'id : entre -7° et +7°
- Offset XY déterministe : ±6px X, ±5px Y
- Carte du dessus : opacité 1, pas de filtre — **toujours nette**
- Cartes dessous : `brightness(0.62 + i*0.06)`, opacité dégradée
- Nouvelle carte posée : animation `landCard 0.4s`
- Brûlure : animation `burnFlash 0.45s` sur le container
- Badge indicateur : "Joue ≥ X" ou "Joue ≤ 7" (rouge si mustPlayLower)

```js
// Fonctions hash déterministes
function cardRotation(id) { ... hash*31 ... return ((h%1400)/100)-7; }
function cardOffset(id)   { ... hash*17 ... return {x: ..., y: ...}; }
```

---

### `BotPlayerZone`

- Badge nom avec indicateur ▶ si tour actif, glow or
- Compteur main : badge `🂠 ×N`
- Cartes face-down/face-up empilées : face-down décalée de 6px vers le bas (zIndex:1), face-up par-dessus (zIndex:2)
- Rotation CSS : -90° gauche, +90° droite, 0° haut

---

### `SetupScreen` (plein écran, zIndex 100)

- Fond : `rgba(5,20,10,0.97)`
- **Affiche uniquement** : cartes FACE VISIBLE + cartes MAIN
- **Ne pas afficher** les cartes face-down cachées
- Tout centré avec `alignItems: "center"`, `justifyContent: "center"`
- Swap : clic face-up puis clic main (ou inverse)
- Labels dynamiques selon sélection en cours
- Bouton CONFIRMER : or, hover scale(1.05)

---

### `DealScreen`

Écran intermédiaire lors de la distribution.

- Fond sombre radial
- Cartes dos visible qui apparaissent en spirale (angle + rayon progressif)
- Délai 45ms entre chaque carte
- `total = playerCount * 9` cartes
- Appelle `onDone` quand toutes les cartes sont affichées

---

### `GameLog`

- Position `fixed`, bottom-right, zIndex 20
- Toggle bouton 📋 JOURNAL avec chevron
- Panel : `max-height` 0→220px animé
- Point doré pulsant si nouvelle entrée et log fermé
- 14 dernières entrées, dernière en blanc, reste en gris

---

### `FinishedScreen` (plein écran, zIndex 100)

- 🏆 + nom gagnant en or
- 💩 + nom shithead en rouge
- Bouton REJOUER → reset `state = null`

---

## Layout principal (ShitheadGame)

```
┌─────────────────────────────────┐
│         BOT TOP (si 2j/4j)      │
├────────┬────────────┬────────────┤
│ BOT    │   TABLE    │   BOT      │
│ LEFT   │  (centre)  │   RIGHT    │
├────────┴────────────┴────────────┤
│         ZONE JOUEUR HUMAIN       │
└─────────────────────────────────┘
         LOG (fixed, bas-droite)
```

**TABLE (centre)** :
- Barre statut : sens ↻/↺, compteur pioche, "Bot réfléchit..."
- Pioche (dos visible) + Talon (`DiscardPile`)
- Indicateur tour "▶ VOTRE TOUR" / "Tour de X"

**Zone joueur humain** :
- Badge nom + indicateur de phase
- Si phase face_down ou face_up : affiche les deux zones (CACHÉES / VISIBLES)
- Si phase hand : affiche la main complète avec glow sur jouables
- Boutons JOUER (or, actif si sélection jouable) + RAMASSER LE TALON (rouge, actif si aucun coup)

---

## Logique UI critique

### toggleCard
```js
const toggleCard = card => {
  // Bloque si carte injouable (sauf phase face_down)
  if (human.phase !== "face_down") {
    const zone = human.phase === "hand" ? human.handCards : human.faceUpCards;
    const group = zone.filter(c => c.value === card.value);
    if (!canPlayGroup(group, state, zone)) return;
  }
  // Toggle sélection, même valeur uniquement
  setSelectedCards(prev => {
    if (prev.some(c => c.id === card.id)) return prev.filter(c => c.id !== card.id);
    if (prev.length > 0 && prev[0].value !== card.value) return [card];
    return [...prev, card];
  });
};
```

### canPlay
```js
const selectedPlayable = (() => {
  if (selectedCards.length === 0) return false;
  const zone = human.phase === "hand" ? human.handCards
             : human.phase === "face_up" ? human.faceUpCards : human.faceDownCards;
  return canPlayGroup(selectedCards, state, zone);
})();
const canPlay = isMyTurn && selectedPlayable;
```

### canPickUp
```js
const humanActiveZone = human.phase === "hand" ? human.handCards
                      : human.phase === "face_up" ? human.faceUpCards : null;
const hasAnyPlayable = human.phase === "face_down" || hasPlayableMove(humanActiveZone ?? [], state);
const canPickUp = isMyTurn && !hasAnyPlayable;
```

### Flying cards (animation jeu)
```js
const handlePlaySelected = () => {
  const toRect = discardRef.current?.getBoundingClientRect();
  const flies = selectedCards.map(card => ({
    card,
    fromRect: cardRefs.current[card.id]?.getBoundingClientRect() || null,
    toRect: toRect || null,
  }));
  setState(s => applyPlay(s, selectedCards));
  setSelectedCards([]);
  if (toRect) setFlyingCards(prev => [...prev, ...flies]);
};
```

Chaque carte dans `cardRefs.current[card.id]` est stockée via `ref={el => { if(el) cardRefs.current[card.id] = el; }}` sur le wrapper div.

---

## États React dans ShitheadGame

```js
const [state, setState]               // état du jeu
const [pendingCount, setPendingCount] // nb joueurs choisi
const [dealing, setDealing]           // affiche DealScreen
const [selectedCards, setSelectedCards]
const [botThinking, setBotThinking]
const [flyingCards, setFlyingCards]   // [{card, fromRect, toRect}]
const discardRef                      // ref sur le wrapper DiscardPile
const cardRefs                        // ref map: cardId → DOM element
```
