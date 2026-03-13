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
import OnlineLobby from "./components/OnlineLobby";
import useOnlineGame from "./hooks/useOnlineGame";
import RulesModal from "./components/RulesModal";

// ── Online Game wrapper ───────────────────────────────────────────────────────
function OnlineGame({ onBackToMenu }) {
  const {
    myUid, mySlot, isHost,
    roomId, roomStatus, roomPlayers, maxPlayers,
    state, error, aborted,
    createRoom, joinRoom, startGame, abortGame,
    ackDealDone,
    pushSwap, pushConfirmSetup,
    pushPlay, pushPickUp,
    leaveRoom,
  } = useOnlineGame();

  const [selectedCards, setSelectedCards] = useState([]);
  const [flyingCards, setFlyingCards]     = useState([]);
  const [showRules, setShowRules]         = useState(false);
  const discardRef = useRef(null);
  const cardRefs   = useRef({});

  const handleLeave = async () => {
    await leaveRoom();
    onBackToMenu();
  };

  // ── Lobby ─────────────────────────────────────────────────────────────────
  if (!roomStatus || roomStatus === "waiting") {
    return (
      <OnlineLobby
        roomId={roomId}
        roomStatus={roomStatus}
        roomPlayers={roomPlayers}
        maxPlayers={maxPlayers}
        isHost={isHost}
        error={error}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        onStartGame={startGame}
        onLeaveRoom={handleLeave}
      />
    );
  }

  // ── Dealing ───────────────────────────────────────────────────────────────
  if (roomStatus === "dealing") {
    const playerCount = Object.keys(roomPlayers).length;
    return (
      <DealScreen
        playerCount={playerCount}
        onDone={ackDealDone}
      />
    );
  }

  // ── Playing ───────────────────────────────────────────────────────────────
  if (!state) {
    return (
      <div style={{ minHeight: "100vh", background: "#061008", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Georgia',serif", letterSpacing: 3 }}>Chargement...</div>
      </div>
    );
  }

  // Setup phase
  if (state.status === "setup") {
    const handleSwap = (handId, fuId) => pushSwap(handId, fuId);
    const handleConfirm = () => pushConfirmSetup();
    const myPlayer = state.players[mySlot];
    const alreadyConfirmed = myPlayer?.setupConfirmed;

    return (
      <div style={{ minHeight: "100vh", background: "#061008", position: "relative" }}>
        {!alreadyConfirmed
          ? <SetupScreen state={state} onSwap={handleSwap} onConfirm={handleConfirm} playerIndex={mySlot} />
          : (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
              <div style={{ color: "#7ec8a0", fontFamily: "'Georgia',serif", fontSize: 16, letterSpacing: 3 }}>En attente des autres joueurs...</div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, letterSpacing: 2 }}>
                {state.players.filter(p => p.setupConfirmed).length}/{state.players.length} confirmés
              </div>
            </div>
          )
        }
      </div>
    );
  }

  // Partie abandonnée par l'hôte
  if (aborted) {
    return (
      <div style={{
        minHeight: "100vh", background: "linear-gradient(160deg,#0a1a0d,#050e06)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Georgia',serif",
      }}>
        <div style={{
          background: "rgba(15,40,15,0.95)", border: "1px solid rgba(200,60,60,0.3)",
          borderRadius: 20, padding: "40px 36px", textAlign: "center",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
          maxWidth: 360, width: "90%",
        }}>
          <div style={{ fontSize: 48 }}>🚪</div>
          <div style={{ fontFamily: "'Palatino Linotype',serif", fontSize: 22, color: "#ff9070", letterSpacing: 3 }}>
            PARTIE TERMINÉE
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
            L'hôte a mis fin à la partie.
          </div>
          <button
            onClick={handleLeave}
            style={{
              background: "linear-gradient(135deg,#d4a017,#a07010)", border: "none",
              borderRadius: 30, padding: "13px 40px", fontSize: 14, fontWeight: 700,
              color: "#1a0f00", cursor: "pointer", letterSpacing: 2,
              fontFamily: "'Georgia',serif", boxShadow: "0 4px 16px rgba(212,160,23,0.3)",
              minHeight: 44,
            }}
          >
            RETOUR À L'ACCUEIL
          </button>
        </div>
      </div>
    );
  }

  // Finished
  if (state.status === "finished") {
    return <FinishedScreen state={state} onRestart={handleLeave} />;
  }

  // Main game
  const human    = state.players[mySlot];
  const allPlayers = state.players;
  const otherPlayers = allPlayers.filter((_, i) => i !== mySlot);
  const isMyTurn = state.currentPlayerIndex === mySlot;
  const effectiveVal = getEffectiveDiscardValue(state.discard);
  const flyingCardIds = new Set(flyingCards.map(fc => fc.card.id));

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

  // Build bot positions: all other players in order
  const otherSlots = allPlayers
    .map((p, i) => ({ player: p, index: i }))
    .filter(({ index }) => index !== mySlot)
    .sort((a, b) => a.index - b.index);
  const posList = otherSlots.length === 1 ? ["top"]
    : otherSlots.length === 2 ? ["left", "right"]
    : ["left", "top", "right"];

  const handlePlaySelected = async () => {
    if (selectedCards.length === 0) return;
    const toRect = discardRef.current?.getBoundingClientRect();
    const flies = selectedCards.map(card => {
      const el = cardRefs.current[card.id];
      return { card, fromRect: el?.getBoundingClientRect() || null, toRect: toRect || null };
    });
    try {
      setSelectedCards([]);
      if (toRect) setFlyingCards(prev => [...prev, ...flies]);
      // Attendre la fin de l'animation (440ms) avant de pousser sur Firebase
      await new Promise(r => setTimeout(r, 440));
      await pushPlay(selectedCards);
    } catch (e) { alert(e.message); }
  };

  const handlePickUp = async () => { await pushPickUp(); setSelectedCards([]); };

  const handleDoubleClickPlay = async (card) => {
    if (!isMyTurn) return;
    const zone = human.phase === "hand" ? human.handCards : human.faceUpCards;
    if (!canPlayGroup([card], state, zone)) return;
    const toRect = discardRef.current?.getBoundingClientRect();
    const el = cardRefs.current[card.id];
    const fromRect = el?.getBoundingClientRect() || null;
    try {
      setSelectedCards([]);
      if (toRect) setFlyingCards(prev => [...prev, { card, fromRect, toRect }]);
      // Attendre la fin de l'animation (440ms) avant de pousser sur Firebase
      await new Promise(r => setTimeout(r, 440));
      await pushPlay([card]);
    } catch (e) { alert(e.message); }
  };

  const toggleCard = card => {
    if (human.phase !== "face_down") {
      const zone = human.phase === "hand" ? human.handCards : human.faceUpCards;
      const group = zone.filter(c => c.value === card.value);
      if (!canPlayGroup(group, state, zone)) return;
      if (human.phase === "face_up") {
        // Sélectionner/désélectionner tout le groupe d'un coup
        const ids = new Set(group.map(c => c.id));
        const anySelected = selectedCards.some(c => ids.has(c.id));
        setSelectedCards(anySelected ? [] : group);
        return;
      }
    }
    setSelectedCards(prev => {
      if (prev.some(c => c.id === card.id)) return prev.filter(c => c.id !== card.id);
      if (prev.length > 0 && prev[0].value !== card.value) return [card];
      return [...prev, card];
    });
  };

  return (
    <div style={{
      height: "100vh",
      background: "radial-gradient(ellipse at 50% 40%,#0d2e12,#061008 60%,#030806)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
      padding: "12px 24px 16px", fontFamily: "'Georgia',serif",
      position: "relative", overflow: "hidden", userSelect: "none",
    }}>
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {/* Tapis */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `radial-gradient(circle at 50% 50%,rgba(20,60,20,0.4),transparent 70%),repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.005) 2px,rgba(255,255,255,0.005) 3px),repeating-linear-gradient(90deg,transparent,transparent 2px,rgba(255,255,255,0.005) 2px,rgba(255,255,255,0.005) 3px)`,
      }} />

      {flyingCards.map((fc, i) => (
        <FlyingCard
          key={`fly-${fc.card.id}-${i}`}
          card={fc.card} fromRect={fc.fromRect} toRect={fc.toRect}
          onDone={() => setFlyingCards(prev => prev.filter((_, j) => j !== i))}
        />
      ))}

      {/* Other players top */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center", width: "100%" }}>
        {posList.includes("top") && (() => {
          const idx = posList.indexOf("top");
          const { player, index } = otherSlots[idx];
          return (
            <BotPlayerZone
              player={player}
              isActive={state.currentPlayerIndex === index}
              position="top"
            />
          );
        })()}
      </div>

      {/* Table centrale + latéraux */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 32, width: "100%" }}>
        <div style={{ minWidth: 100, display: "flex", justifyContent: "center" }}>
          {posList.includes("left") && (() => {
            const idx = posList.indexOf("left");
            const { player, index } = otherSlots[idx];
            return (
              <BotPlayerZone
                player={player}
                isActive={state.currentPlayerIndex === index}
                position="left"
              />
            );
          })()}
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
            <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.1)" }} />
            <div style={{ fontSize: 11, color: "#7ec8a0", letterSpacing: 1 }}>EN LIGNE</div>
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
          {posList.includes("right") && (() => {
            const idx = posList.indexOf("right");
            const { player, index } = otherSlots[idx];
            return (
              <BotPlayerZone
                player={player}
                isActive={state.currentPlayerIndex === index}
                position="right"
              />
            );
          })()}
        </div>
      </div>

      {/* Journal */}
      <div style={{ position: "fixed", bottom: 16, right: 16, zIndex: 20 }}>
        <GameLog log={state.log} />
      </div>

      {/* Bouton règles */}
      <div style={{ position: "fixed", top: 12, left: 16, zIndex: 20 }}>
        <button
          onClick={() => setShowRules(true)}
          style={{
            background: "rgba(212,160,23,0.08)", border: "1px solid rgba(212,160,23,0.25)",
            borderRadius: 20, width: 44, height: 44, fontSize: 18, color: "#d4a017",
            cursor: "pointer", fontFamily: "'Georgia',serif", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}
        >?</button>
      </div>

      {/* Bouton hôte : terminer la partie */}
      {isHost && (
        <div style={{ position: "fixed", top: 12, right: 16, zIndex: 20 }}>
          <button
            onClick={() => { if (confirm("Mettre fin à la partie pour tous les joueurs ?")) abortGame(); }}
            style={{
              background: "rgba(200,60,60,0.12)", border: "1px solid rgba(200,60,60,0.3)",
              borderRadius: 20, padding: "7px 16px", fontSize: 11, color: "#ff9070",
              cursor: "pointer", letterSpacing: 2, fontFamily: "'Georgia',serif",
              minHeight: 44,
            }}
          >
            TERMINER
          </button>
        </div>
      )}

      {/* Zone joueur humain */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            background: isMyTurn ? "rgba(126,200,160,0.15)" : "rgba(0,0,0,0.3)",
            border: `1px solid ${isMyTurn ? "rgba(126,200,160,0.4)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 20, padding: "5px 16px", fontSize: 13, fontWeight: 700,
            color: isMyTurn ? "#7ec8a0" : "rgba(255,255,255,0.4)", letterSpacing: 2, transition: "all 0.3s",
          }}>
            {isMyTurn && <span style={{ marginRight: 6 }}>▶</span>}{human.name}{human.isShithead && " 💩"}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: 1 }}>Phase: {humanZoneLabel}</div>
        </div>

        {human.phase !== "hand" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
            {human.faceUpCards.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.2)" }}>VISIBLES</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {human.faceUpCards.filter(c => !flyingCardIds.has(c.id)).map(c => {
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

            {human.faceDownCards.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.2)" }}>CACHÉES</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {human.faceDownCards.filter(c => !flyingCardIds.has(c.id)).map(c => (
                    <div key={c.id} ref={el => { if (el) cardRefs.current[c.id] = el; }}>
                      <FaceDownCard
                        card={c}
                        isPlayable={isMyTurn && canPlayValue(c.value, state)}
                        selected={false}
                        onClick={human.phase === "face_down" && isMyTurn && flyingCards.length === 0 ? () => {
                          const toRect = discardRef.current?.getBoundingClientRect();
                          const el = cardRefs.current[c.id];
                          const fromRect = el?.getBoundingClientRect() || null;
                          if (toRect) setFlyingCards(prev => [...prev, { card: c, fromRect, toRect }]);
                          setTimeout(() => pushPlay([c]), 440);
                        } : undefined}
                        disabled={human.phase !== "face_down" || !isMyTurn || flyingCards.length > 0}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {human.phase === "hand" && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", maxWidth: 600 }}>
            {human.handCards.filter(c => !flyingCardIds.has(c.id)).map(c => {
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

// ── Local Game ────────────────────────────────────────────────────────────────
function LocalGame({ onBackToMenu }) {
  const [state, setState]           = useState(null);
  const [pendingCount, setPendingCount] = useState(null);
  const [dealing, setDealing]       = useState(false);
  const [selectedCards, setSelectedCards] = useState([]);
  const [botThinking, setBotThinking] = useState(false);
  const [flyingCards, setFlyingCards] = useState([]);
  const [showRules, setShowRules]   = useState(false);
  const discardRef = useRef(null);
  const cardRefs   = useRef({});

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
      if (human.phase === "face_up") {
        // Sélectionner/désélectionner tout le groupe d'un coup
        const ids = new Set(group.map(c => c.id));
        const anySelected = selectedCards.some(c => ids.has(c.id));
        setSelectedCards(anySelected ? [] : group);
        return;
      }
    }
    setSelectedCards(prev => {
      if (prev.some(c => c.id === card.id)) return prev.filter(c => c.id !== card.id);
      if (prev.length > 0 && prev[0].value !== card.value) return [card];
      return [...prev, card];
    });
  };

  // ── Menu local ────────────────────────────────────────────────────────────
  if (!state && !dealing) {
    return (
      <div style={{
        minHeight: "100vh", background: "linear-gradient(160deg,#0a1a0d,#050e06)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 40, fontFamily: "'Georgia',serif",
      }}>
        <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "radial-gradient(circle at 50% 50%,rgba(30,80,30,0.3),transparent 70%)", pointerEvents: "none" }} />
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
          <button
            onClick={onBackToMenu}
            style={{
              marginTop: 12,
              background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 30, padding: "10px 40px", fontSize: 13, color: "rgba(255,255,255,0.3)",
              cursor: "pointer", letterSpacing: 2, fontFamily: "'Georgia',serif",
            }}
          >
            RETOUR
          </button>
        </div>
      </div>
    );
  }

  if (dealing) return <DealScreen playerCount={pendingCount} onDone={handleDealDone} />;

  // ── Game local ────────────────────────────────────────────────────────────
  const human = state.players[0];
  const bots  = state.players.slice(1);
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
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `radial-gradient(circle at 50% 50%,rgba(20,60,20,0.4),transparent 70%),repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.005) 2px,rgba(255,255,255,0.005) 3px),repeating-linear-gradient(90deg,transparent,transparent 2px,rgba(255,255,255,0.005) 2px,rgba(255,255,255,0.005) 3px)`,
      }} />

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {state.status === "setup" && <SetupScreen state={state} onSwap={handleSwap} onConfirm={handleConfirmSetup} />}
      {state.status === "finished" && <FinishedScreen state={state} onRestart={() => setState(null)} />}

      {flyingCards.map((fc, i) => (
        <FlyingCard
          key={`fly-${fc.card.id}-${i}`}
          card={fc.card} fromRect={fc.fromRect} toRect={fc.toRect}
          onDone={() => setFlyingCards(prev => prev.filter((_, j) => j !== i))}
        />
      ))}

      <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center", width: "100%" }}>
        {botPositions.includes("top") && (
          <BotPlayerZone
            player={bots[botPositions.indexOf("top")]}
            isActive={state.currentPlayerIndex === 1 + botPositions.indexOf("top")}
            position="top"
          />
        )}
      </div>

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

      <div style={{ position: "fixed", bottom: 16, right: 16, zIndex: 20 }}>
        <GameLog log={state.log} />
      </div>

      <div style={{ position: "fixed", top: 12, left: 16, zIndex: 20 }}>
        <button
          onClick={() => setShowRules(true)}
          style={{
            background: "rgba(212,160,23,0.08)", border: "1px solid rgba(212,160,23,0.25)",
            borderRadius: 20, width: 44, height: 44, fontSize: 18, color: "#d4a017",
            cursor: "pointer", fontFamily: "'Georgia',serif", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}
        >?</button>
      </div>

      <div style={{ position: "fixed", top: 12, right: 16, zIndex: 20 }}>
        <button
          onClick={() => { if (confirm("Quitter la partie ?")) onBackToMenu(); }}
          style={{
            background: "rgba(200,60,60,0.12)", border: "1px solid rgba(200,60,60,0.3)",
            borderRadius: 20, padding: "7px 16px", fontSize: 11, color: "#ff9070",
            cursor: "pointer", letterSpacing: 2, fontFamily: "'Georgia',serif",
            minHeight: 44,
          }}
        >
          QUITTER
        </button>
      </div>

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
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
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

            {human.faceDownCards.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.2)" }}>CACHÉES</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {human.faceDownCards.map(c => (
                    <div key={c.id} ref={el => { if (el) cardRefs.current[c.id] = el; }}>
                      <FaceDownCard
                        card={c}
                        isPlayable={isMyTurn && canPlayValue(c.value, state)}
                        selected={false}
                        onClick={human.phase === "face_down" && isMyTurn && flyingCards.length === 0 ? () => {
                          const toRect = discardRef.current?.getBoundingClientRect();
                          const el = cardRefs.current[c.id];
                          const fromRect = el?.getBoundingClientRect() || null;
                          try {
                            setState(s => applyPlay(s, [c]));
                            if (toRect) setFlyingCards(prev => [...prev, { card: c, fromRect, toRect }]);
                          } catch (e) { alert(e.message); }
                        } : undefined}
                        disabled={human.phase !== "face_down" || !isMyTurn || flyingCards.length > 0}
                      />
                    </div>
                  ))}
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

// ── Root ──────────────────────────────────────────────────────────────────────
export default function ShitheadGame() {
  const [mode, setMode] = useState(null); // null | "local" | "online"
  const [showRules, setShowRules] = useState(false);

  if (mode === "local")  return <LocalGame  onBackToMenu={() => setMode(null)} />;
  if (mode === "online") return <OnlineGame onBackToMenu={() => setMode(null)} />;

  // Main menu
  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(160deg,#0a1a0d,#050e06)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 40, fontFamily: "'Georgia',serif",
    }}>
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "radial-gradient(circle at 50% 50%,rgba(30,80,30,0.3),transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        <div style={{ fontSize: 60, marginBottom: 8 }}>🃏</div>
        <div style={{ fontFamily: "'Palatino Linotype','Book Antiqua',serif", fontSize: 42, color: "#d4a017", letterSpacing: 6, textShadow: "0 0 40px rgba(212,160,23,0.3)" }}>
          SHITHEAD
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", letterSpacing: 4, marginTop: 4 }}>THE CARD GAME</div>
      </div>
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <button
          onClick={() => setMode("local")}
          style={{
            background: "rgba(212,160,23,0.08)", border: "1px solid rgba(212,160,23,0.3)",
            borderRadius: 30, padding: "12px 56px", fontSize: 15, color: "#d4a017",
            cursor: "pointer", letterSpacing: 3, fontFamily: "'Georgia',serif",
            transition: "all 0.2s", width: 260,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,160,23,0.2)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(212,160,23,0.2)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(212,160,23,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
        >
          LOCAL (vs Bots)
        </button>
        <button
          onClick={() => setMode("online")}
          style={{
            background: "rgba(126,200,160,0.08)", border: "1px solid rgba(126,200,160,0.3)",
            borderRadius: 30, padding: "12px 56px", fontSize: 15, color: "#7ec8a0",
            cursor: "pointer", letterSpacing: 3, fontFamily: "'Georgia',serif",
            transition: "all 0.2s", width: 260,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(126,200,160,0.2)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(126,200,160,0.15)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(126,200,160,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
        >
          EN LIGNE
        </button>
        <button
          onClick={() => setShowRules(true)}
          style={{
            background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 30, padding: "10px 40px", fontSize: 13, color: "rgba(255,255,255,0.35)",
            cursor: "pointer", letterSpacing: 2, fontFamily: "'Georgia',serif",
            transition: "all 0.2s", width: 260,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.35)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
        >
          RÈGLES DU JEU
        </button>
      </div>
    </div>
  );
}
