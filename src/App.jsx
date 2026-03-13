import { useState, useEffect, useRef } from "react";
import "./styles";
import {
  initGame, applyPlay, applyPickUp, getBotMove,
  getEffectiveDiscardValue, canPlayGroup, hasPlayableMove, canPlayValue, sortCards,
} from "./game/engine";
import PlayingCard from "./components/PlayingCard";
import FaceDownCard from "./components/FaceDownCard";
import FlyingCard from "./components/FlyingCard";
import BotPlayerZone from "./components/BotPlayerZone";
import DiscardPile from "./components/DiscardPile";
import GameLog from "./components/GameLog";
import SetupScreen from "./components/SetupScreen";
import FinishedScreen from "./components/FinishedScreen";
import DealScreen from "./components/DealScreen";

export default function ShitheadGame() {
  const [state, setState] = useState(null);
  const [pendingCount, setPendingCount] = useState(null);
  const [dealing, setDealing] = useState(false);
  const [selectedCards, setSelectedCards] = useState([]);
  const [botThinking, setBotThinking] = useState(false);
  const [flyingCards, setFlyingCards] = useState([]);
  const discardRef = useRef(null);
  const cardRefs = useRef({});

  const startGame = count => { setPendingCount(count); setDealing(true); };

  const handleDealDone = () => {
    const names = ["Vous", "Bot Alpha", "Bot Beta", "Bot Gamma"].slice(0, pendingCount);
    setState(initGame(names));
    setSelectedCards([]);
    setDealing(false);
  };

  useEffect(() => {
    if (!state || state.status !== "playing") return;
    const cur = state.players[state.currentPlayerIndex];
    if (cur.isHuman) return;
    setBotThinking(true);
    const delay = 900 + Math.random() * 600;
    const timer = setTimeout(() => {
      const move = getBotMove(state, state.currentPlayerIndex);
      if (move.type === "play") setState(s => applyPlay(s, move.cards));
      else setState(s => applyPickUp(s));
      setBotThinking(false);
    }, delay);
    return () => clearTimeout(timer);
  }, [state]);

  const handleSwap = (handId, fuId) => {
    setState(s => {
      const ns = JSON.parse(JSON.stringify(s));
      const p = ns.players[0];
      const hi = p.handCards.findIndex(c => c.id === handId);
      const fi = p.faceUpCards.findIndex(c => c.id === fuId);
      if (hi !== -1 && fi !== -1) {
        [p.handCards[hi], p.faceUpCards[fi]] = [p.faceUpCards[fi], p.handCards[hi]];
        p.handCards = sortCards(p.handCards);
      }
      return ns;
    });
  };

  const handleConfirmSetup = () => {
    setState(s => ({ ...s, status: "playing", log: [...s.log, "C'est parti !"] }));
  };

  const handlePlaySelected = () => {
    if (selectedCards.length === 0) return;
    const toRect = discardRef.current?.getBoundingClientRect();
    const flies = selectedCards.map(card => {
      const el = cardRefs.current[card.id];
      return { card, fromRect: el?.getBoundingClientRect() || null, toRect: toRect || null };
    });
    try {
      setState(s => applyPlay(s, selectedCards));
      setSelectedCards([]);
      if (toRect) setFlyingCards(prev => [...prev, ...flies]);
    } catch (e) { alert(e.message); }
  };

  const handlePickUp = () => { setState(s => applyPickUp(s)); setSelectedCards([]); };

  const handleDoubleClickPlay = (card) => {
    if (!isMyTurn) return;
    const zone = human.phase === "hand" ? human.handCards : human.faceUpCards;
    if (!canPlayGroup([card], state, zone)) return;
    const toRect = discardRef.current?.getBoundingClientRect();
    const el = cardRefs.current[card.id];
    const fromRect = el?.getBoundingClientRect() || null;
    try {
      setState(s => applyPlay(s, [card]));
      setSelectedCards([]);
      if (toRect) setFlyingCards(prev => [...prev, { card, fromRect, toRect }]);
    } catch (e) { alert(e.message); }
  };

  const toggleCard = card => {
    if (human.phase !== "face_down") {
      const zone = human.phase === "hand" ? human.handCards : human.faceUpCards;
      const group = zone.filter(c => c.value === card.value);
      if (!canPlayGroup(group, state, zone)) return;
    }
    setSelectedCards(prev => {
      if (prev.some(c => c.id === card.id)) return prev.filter(c => c.id !== card.id);
      if (prev.length > 0 && prev[0].value !== card.value) return [card];
      return [...prev, card];
    });
  };

  // ── Menu ──────────────────────────────────────────────────────────────────
  if (!state && !dealing) {
    return (
      <div style={{
        minHeight: "100vh", background: "linear-gradient(160deg,#0a1a0d,#050e06)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 40, fontFamily: "'Georgia',serif",
      }}>
        <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "radial-gradient(circle at 50% 50%,rgba(30,80,30,0.3),transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 60, marginBottom: 8 }}>🃏</div>
          <div style={{ fontFamily: "'Palatino Linotype','Book Antiqua',serif", fontSize: 42, color: "#d4a017", letterSpacing: 6, textShadow: "0 0 40px rgba(212,160,23,0.3)" }}>
            SHITHEAD
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", letterSpacing: 4, marginTop: 4 }}>THE CARD GAME</div>
        </div>
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", letterSpacing: 3, marginBottom: 8 }}>NOMBRE DE JOUEURS</div>
          {[2, 3, 4].map(n => (
            <button
              key={n}
              onClick={() => startGame(n)}
              style={{
                background: "rgba(212,160,23,0.08)", border: "1px solid rgba(212,160,23,0.3)",
                borderRadius: 30, padding: "12px 56px", fontSize: 15, color: "#d4a017",
                cursor: "pointer", letterSpacing: 3, fontFamily: "'Georgia',serif",
                transition: "all 0.2s", width: 220,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,160,23,0.2)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(212,160,23,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(212,160,23,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              {n} Joueurs
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (dealing) return <DealScreen playerCount={pendingCount} onDone={handleDealDone} />;

  // ── Game ──────────────────────────────────────────────────────────────────
  const human = state.players[0];
  const bots = state.players.slice(1);
  const isMyTurn = state.status === "playing" && state.currentPlayerIndex === 0;
  const effectiveVal = getEffectiveDiscardValue(state.discard);

  const selectedPlayable = (() => {
    if (selectedCards.length === 0) return false;
    const zone = human.phase === "hand" ? human.handCards
      : human.phase === "face_up" ? human.faceUpCards
      : human.faceDownCards;
    return canPlayGroup(selectedCards, state, zone);
  })();

  const canPlay = isMyTurn && selectedPlayable;
  const humanActiveZone = human.phase === "hand" ? human.handCards
    : human.phase === "face_up" ? human.faceUpCards : null;
  const hasAnyPlayable = human.phase === "face_down" || hasPlayableMove(humanActiveZone ?? [], state);
  const canPickUp = isMyTurn && !hasAnyPlayable;
  const humanZoneLabel = human.phase === "hand" ? "VOTRE MAIN"
    : human.phase === "face_up" ? "CARTES FACE VISIBLE"
    : "CARTES FACE CACHÉE — Bonne chance 🙏";
  const botPositions = bots.length === 1 ? ["top"] : bots.length === 2 ? ["left", "right"] : ["left", "top", "right"];

  return (
    <div style={{
      height: "100vh",
      background: "radial-gradient(ellipse at 50% 40%,#0d2e12,#061008 60%,#030806)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
      padding: "12px 24px 16px", fontFamily: "'Georgia',serif",
      position: "relative", overflow: "hidden", userSelect: "none",
    }}>
      {/* Tapis */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `radial-gradient(circle at 50% 50%,rgba(20,60,20,0.4),transparent 70%),repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.005) 2px,rgba(255,255,255,0.005) 3px),repeating-linear-gradient(90deg,transparent,transparent 2px,rgba(255,255,255,0.005) 2px,rgba(255,255,255,0.005) 3px)`,
      }} />

      {state.status === "setup" && <SetupScreen state={state} onSwap={handleSwap} onConfirm={handleConfirmSetup} />}
      {state.status === "finished" && <FinishedScreen state={state} onRestart={() => setState(null)} />}

      {flyingCards.map((fc, i) => (
        <FlyingCard
          key={`fly-${fc.card.id}-${i}`}
          card={fc.card} fromRect={fc.fromRect} toRect={fc.toRect}
          onDone={() => setFlyingCards(prev => prev.filter((_, j) => j !== i))}
        />
      ))}

      {/* Bot top */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center", width: "100%" }}>
        {botPositions.includes("top") && (
          <BotPlayerZone
            player={bots[botPositions.indexOf("top")]}
            isActive={state.currentPlayerIndex === 1 + botPositions.indexOf("top")}
            position="top"
          />
        )}
      </div>

      {/* Table centrale + bots latéraux */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 32, width: "100%" }}>
        <div style={{ minWidth: 100, display: "flex", justifyContent: "center" }}>
          {botPositions.includes("left") && (
            <BotPlayerZone
              player={bots[botPositions.indexOf("left")]}
              isActive={state.currentPlayerIndex === 1 + botPositions.indexOf("left")}
              position="left"
            />
          )}
        </div>

        {/* Table */}
        <div style={{
          background: "radial-gradient(ellipse at center,rgba(15,50,15,0.9),rgba(8,30,8,0.95))",
          border: "3px solid rgba(212,160,23,0.2)", borderRadius: 24, padding: "24px 32px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
          boxShadow: "0 0 60px rgba(0,0,0,0.7),inset 0 0 40px rgba(0,0,0,0.3)", minWidth: 300,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(0,0,0,0.3)", borderRadius: 20, padding: "6px 16px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 2 }}>SENS {state.direction === 1 ? "↻" : "↺"}</div>
            <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.1)" }} />
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>
              Pioche: <span style={{ color: "rgba(255,255,255,0.6)" }}>{state.pile.length}</span>
            </div>
            {botThinking && (
              <>
                <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.1)" }} />
                <div style={{ fontSize: 11, color: "#d4a017", letterSpacing: 1 }}>Bot réfléchit...</div>
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>Pioche</div>
              {state.pile.length > 0
                ? <PlayingCard card={state.pile[0]} facedown disabled />
                : <div style={{ width: 70, height: 98, borderRadius: 8, border: "2px dashed rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.1)", fontSize: 11 }}>vide</div>}
            </div>
            <div ref={discardRef}>
              <DiscardPile discard={state.discard} effectiveValue={effectiveVal} mustPlayLower={state.mustPlayLower} />
            </div>
          </div>

          <div style={{ fontSize: 12, letterSpacing: 2, color: isMyTurn ? "#7ec8a0" : "rgba(255,255,255,0.3)", transition: "color 0.3s" }}>
            {isMyTurn ? "▶ VOTRE TOUR" : `Tour de ${state.players[state.currentPlayerIndex]?.name}`}
          </div>
        </div>

        <div style={{ minWidth: 100, display: "flex", justifyContent: "center" }}>
          {botPositions.includes("right") && (
            <BotPlayerZone
              player={bots[botPositions.indexOf("right")]}
              isActive={state.currentPlayerIndex === 1 + botPositions.indexOf("right")}
              position="right"
            />
          )}
        </div>
      </div>

      {/* Journal */}
      <div style={{ position: "fixed", bottom: 16, right: 16, zIndex: 20 }}>
        <GameLog log={state.log} />
      </div>

      {/* Zone joueur humain */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            background: isMyTurn ? "rgba(126,200,160,0.15)" : "rgba(0,0,0,0.3)",
            border: `1px solid ${isMyTurn ? "rgba(126,200,160,0.4)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 20, padding: "5px 16px", fontSize: 13, fontWeight: 700,
            color: isMyTurn ? "#7ec8a0" : "rgba(255,255,255,0.4)", letterSpacing: 2, transition: "all 0.3s",
          }}>
            {isMyTurn && <span style={{ marginRight: 6 }}>▶</span>}VOUS{human.isShithead && " 💩"}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: 1 }}>Phase: {humanZoneLabel}</div>
        </div>

        {human.phase !== "hand" && (
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
            {human.faceDownCards.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.2)" }}>CACHÉES</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {human.faceDownCards.map(c => (
                    <div key={c.id} ref={el => { if (el) cardRefs.current[c.id] = el; }}>
                      <FaceDownCard
                        card={c}
                        isPlayable={isMyTurn && canPlayValue(c.value, state)}
                        selected={selectedCards.some(s => s.id === c.id)}
                        onClick={human.phase === "face_down" && isMyTurn ? () => toggleCard(c) : undefined}
                        disabled={human.phase !== "face_down" || !isMyTurn}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {human.faceUpCards.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.2)" }}>VISIBLES</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {human.faceUpCards.map(c => {
                    const fuGroup = human.faceUpCards.filter(x => x.value === c.value);
                    const fuPlayable = isMyTurn && human.phase === "face_up" && canPlayGroup(fuGroup, state, human.faceUpCards);
                    const fuSel = selectedCards.some(s => s.id === c.id);
                    return (
                      <div key={c.id} ref={el => { if (el) cardRefs.current[c.id] = el; }}>
                        <PlayingCard
                          card={c} selected={fuSel} glow={fuPlayable && !fuSel}
                          onClick={human.phase === "face_up" && isMyTurn ? () => toggleCard(c) : undefined}
                          onDoubleClick={fuPlayable ? () => handleDoubleClickPlay(c) : undefined}
                          disabled={human.phase !== "face_up" || !isMyTurn || !fuPlayable}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {human.phase === "hand" && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", maxWidth: 600 }}>
            {human.handCards.map(c => {
              const handGroup = human.handCards.filter(x => x.value === c.value);
              const playable = isMyTurn && canPlayGroup(handGroup, state, human.handCards);
              const sel = selectedCards.some(s => s.id === c.id);
              return (
                <div key={c.id} ref={el => { if (el) cardRefs.current[c.id] = el; }}>
                  <PlayingCard
                    card={c} selected={sel}
                    onClick={isMyTurn ? () => toggleCard(c) : undefined}
                    onDoubleClick={playable ? () => handleDoubleClickPlay(c) : undefined}
                    disabled={!isMyTurn}
                    glow={playable && !sel && isMyTurn}
                  />
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
          <button
            onClick={handlePlaySelected}
            disabled={!canPlay || !isMyTurn}
            style={{
              background: canPlay && isMyTurn ? "linear-gradient(135deg,#d4a017,#a07010)" : "rgba(255,255,255,0.05)",
              border: canPlay && isMyTurn ? "none" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 30, padding: "11px 32px", fontSize: 13, fontWeight: 700,
              color: canPlay && isMyTurn ? "#1a0f00" : "rgba(255,255,255,0.2)",
              cursor: canPlay && isMyTurn ? "pointer" : "not-allowed",
              letterSpacing: 2, fontFamily: "'Georgia',serif", transition: "all 0.2s",
              boxShadow: canPlay && isMyTurn ? "0 4px 16px rgba(212,160,23,0.3)" : "none",
            }}
          >
            JOUER {selectedCards.length > 0 ? `(${selectedCards.length})` : ""}
          </button>
          <button
            onClick={handlePickUp}
            disabled={!canPickUp}
            style={{
              background: canPickUp ? "rgba(200,80,60,0.15)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${canPickUp ? "rgba(200,80,60,0.4)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 30, padding: "11px 28px", fontSize: 13,
              color: canPickUp ? "#ff9070" : "rgba(255,255,255,0.15)",
              cursor: canPickUp ? "pointer" : "not-allowed",
              letterSpacing: 2, fontFamily: "'Georgia',serif", transition: "all 0.2s",
            }}
          >
            RAMASSER LE TALON
          </button>
        </div>
      </div>
    </div>
  );
}
