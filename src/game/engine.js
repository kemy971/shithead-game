import { SUITS, VALUES, cardNumericValue } from "./constants";

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createDeck() {
  const d = [];
  for (const s of SUITS)
    for (const v of VALUES)
      d.push({ suit: s, value: v, id: `${v}${s}` });
  d.push(
    { suit: null, value: "🃏", id: "joker_0" },
    { suit: null, value: "🃏", id: "joker_1" }
  );
  return shuffle(d);
}

export function sortCards(cards) {
  return [...cards].sort((a, b) => cardNumericValue(a.value) - cardNumericValue(b.value));
}

export function getEffectiveDiscardValue(discard) {
  for (let i = discard.length - 1; i >= 0; i--) {
    const v = discard[i].value;
    if (v !== "3" && v !== "🃏") return v;
  }
  return null;
}

export function hasFourOfAKind(d) {
  if (d.length < 4) return false;
  const t = d.slice(-4);
  return t.every(c => c.value === t[0].value);
}

export function isPlayerFinished(p) {
  return p.handCards.length === 0 && p.faceUpCards.length === 0 && p.faceDownCards.length === 0;
}

export function nextIdx(cur, players, dir) {
  const n = players.length;
  let next = (cur + dir + n) % n, s = 0;
  while (isPlayerFinished(players[next]) && s++ < n) next = (next + dir + n) % n;
  return next;
}

export function canPlayValue(val, state) {
  if (val === "2" || val === "3" || val === "10" || val === "🃏") return true;
  const eff = getEffectiveDiscardValue(state.discard);
  if (eff === null) return true;
  if (state.mustPlayLower) return cardNumericValue(val) <= 7;
  return cardNumericValue(val) >= cardNumericValue(eff);
}

export function canPlayGroup(cards, state, allZoneCards) {
  if (!cards || cards.length === 0) return false;
  const val = cards[0].value;
  const totalOfValue = allZoneCards.filter(c => c.value === val).length;
  if (totalOfValue >= 4 && cards.length >= 4) return true;
  return canPlayValue(val, state);
}

export function hasPlayableMove(zoneCards, state) {
  const groups = {};
  for (const c of zoneCards) {
    if (!groups[c.value]) groups[c.value] = [];
    groups[c.value].push(c);
  }
  return Object.values(groups).some(g => canPlayGroup(g, state, zoneCards));
}

export function initGame(playerNames) {
  const deck = createDeck();
  const players = [];
  let di = 0;
  for (let i = 0; i < playerNames.length; i++) {
    players.push({
      id: `p${i}`,
      name: playerNames[i],
      handCards: sortCards(deck.slice(di + 6, di + 9)),
      faceUpCards: deck.slice(di + 3, di + 6),
      faceDownCards: deck.slice(di, di + 3),
      phase: "hand",
      isShithead: false,
      setupConfirmed: i !== 0,
      isHuman: i === 0,
    });
    di += 9;
  }
  return {
    status: "setup",
    direction: 1,
    currentPlayerIndex: 0,
    players,
    pile: deck.slice(di),
    discard: [],
    lastPlayedValue: null,
    mustPlayLower: false,
    winner: null,
    shithead: null,
    log: ["La partie commence ! Échangez vos cartes puis confirmez."],
    burnedPiles: 0,
  };
}

export function applyPlay(state, cards) {
  const s = JSON.parse(JSON.stringify(state));
  const pi = s.currentPlayerIndex;
  const player = s.players[pi];
  const val = cards[0].value;
  const ids = new Set(cards.map(c => c.id));
  const src = player.handCards.some(c => ids.has(c.id))
    ? "hand"
    : player.faceUpCards.some(c => ids.has(c.id))
    ? "faceUp"
    : "faceDown";
  if (src === "hand") player.handCards = player.handCards.filter(c => !ids.has(c.id));
  else if (src === "faceUp") player.faceUpCards = player.faceUpCards.filter(c => !ids.has(c.id));
  else player.faceDownCards = player.faceDownCards.filter(c => !ids.has(c.id));
  s.discard.push(...cards);
  let burned = false;
  let logMsg = `${player.name} joue ${cards.map(c => c.value === "🃏" ? "🃏" : `${c.value}${c.suit}`).join(" ")}`;
  s.mustPlayLower = false;
  if (val === "10") { s.discard = []; burned = true; s.burnedPiles++; logMsg += " — Talon brûlé 🔥"; }
  else if (val === "🃏") { s.direction *= -1; logMsg += ` — Sens inversé ${s.direction === 1 ? "↻" : "↺"}`; }
  else if (val === "7") { s.mustPlayLower = true; logMsg += " — Joue ≤ 7 !"; }
  if (!burned && hasFourOfAKind(s.discard)) { s.discard = []; burned = true; s.burnedPiles++; logMsg += " — 4 identiques ! 🔥"; }
  if (!player.handCards.length && player.faceUpCards.length) player.phase = "face_up";
  else if (!player.handCards.length && !player.faceUpCards.length) player.phase = "face_down";
  else player.phase = "hand";
  while (player.handCards.length < 3 && s.pile.length > 0 && player.phase === "hand")
    player.handCards.push(s.pile.shift());
  player.handCards = sortCards(player.handCards);
  s.lastPlayedValue = val;
  s.log = [...s.log.slice(-19), logMsg];
  const finished = isPlayerFinished(player);
  if (finished) {
    const rem = s.players.filter(p => !isPlayerFinished(p));
    if (rem.length === 1) {
      rem[0].isShithead = true;
      s.status = "finished";
      s.winner = player.id;
      s.shithead = rem[0].id;
      s.log = [...s.log, `🏆 ${player.name} gagne ! 💩 ${rem[0].name} est le SHITHEAD !`];
    }
  }
  s.currentPlayerIndex = burned ? pi : nextIdx(pi, s.players, s.direction);
  return s;
}

export function applyPickUp(state) {
  const s = JSON.parse(JSON.stringify(state));
  const pi = s.currentPlayerIndex;
  const player = s.players[pi];
  let logMsg;
  if (s.discard.length > 0) {
    const count = s.discard.length;
    player.handCards = sortCards([...player.handCards, ...s.discard]);
    s.discard = [];
    player.phase = "hand";
    logMsg = `${player.name} ramasse le talon (${count} cartes) 😬`;
  } else if (s.pile.length > 0) {
    player.handCards = sortCards([...player.handCards, s.pile.shift()]);
    player.phase = "hand";
    logMsg = `${player.name} pioche (talon vide).`;
  } else {
    return state;
  }
  s.log = [...s.log.slice(-19), logMsg];
  s.currentPlayerIndex = nextIdx(pi, s.players, s.direction);
  s.mustPlayLower = false;
  return s;
}

export function getBotMove(state, playerIndex) {
  const player = state.players[playerIndex];
  const zone = player.phase === "hand" ? player.handCards
    : player.phase === "face_up" ? player.faceUpCards
    : player.faceDownCards;
  if (player.phase === "face_down")
    return { type: "play", cards: [zone[Math.floor(Math.random() * zone.length)]] };
  const groups = {};
  for (const c of zone) {
    if (!groups[c.value]) groups[c.value] = [];
    groups[c.value].push(c);
  }
  const playable = Object.values(groups).filter(g => canPlayGroup(g, state, zone));
  if (playable.length === 0) return { type: "draw" };
  playable.sort((a, b) => {
    const aV = a[0].value, bV = b[0].value;
    if (aV === "10") return -1; if (bV === "10") return 1;
    if (aV === "2") return -1; if (bV === "2") return 1;
    if (b.length !== a.length) return b.length - a.length;
    return cardNumericValue(bV) - cardNumericValue(aV);
  });
  return { type: "play", cards: playable[0] };
}
