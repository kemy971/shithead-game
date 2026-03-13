import { useState } from "react";
import PlayingCard from "./PlayingCard";

export default function SetupScreen({ state, onSwap, onConfirm, playerIndex = 0 }) {
  const [selHand, setSelHand] = useState(null);
  const [selFU, setSelFU] = useState(null);
  const player = state.players[playerIndex];

  const onHand = c => {
    if (selFU) { onSwap(c.id, selFU.id); setSelHand(null); setSelFU(null); }
    else { setSelHand(selHand?.id === c.id ? null : c); setSelFU(null); }
  };

  const onFU = c => {
    if (selHand) { onSwap(selHand.id, c.id); setSelHand(null); setSelFU(null); }
    else { setSelFU(selFU?.id === c.id ? null : c); setSelHand(null); }
  };

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 100, background: "rgba(5,20,10,0.97)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 36,
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Palatino Linotype',serif", fontSize: 28, color: "#d4a017", letterSpacing: 3, marginBottom: 8 }}>
          PRÉPAREZ VOS CARTES
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", letterSpacing: 1 }}>
          Échangez vos cartes de main avec vos cartes face visible
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 28, alignItems: "center", width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 11, color: "#d4a017", letterSpacing: 2 }}>
            {selFU ? "FACE VISIBLE — cliquez sur une carte en main pour échanger" : "FACE VISIBLE — cliquez pour sélectionner"}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            {player.faceUpCards.map((c, i) => (
              <PlayingCard key={c.id} card={c} selected={selFU?.id === c.id} onClick={() => onFU(c)} glow={!!selHand} dealIdx={i} />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 11, color: "#7ec8a0", letterSpacing: 2 }}>
            {selHand ? "MAIN — cliquez sur une carte visible pour échanger" : "MAIN — cliquez pour sélectionner"}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            {player.handCards.map((c, i) => (
              <PlayingCard key={c.id} card={c} selected={selHand?.id === c.id} onClick={() => onHand(c)} glow={!!selFU} dealIdx={i + 3} />
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onConfirm}
        style={{
          background: "linear-gradient(135deg,#d4a017,#a07010)", border: "none",
          borderRadius: 30, padding: "14px 48px", fontSize: 14, fontWeight: 700,
          color: "#1a0f00", cursor: "pointer", letterSpacing: 2,
          fontFamily: "'Georgia',serif", boxShadow: "0 4px 20px rgba(212,160,23,0.4)",
          transition: "transform 0.15s,box-shadow 0.15s",
        }}
        onMouseEnter={e => { e.target.style.transform = "scale(1.05)"; e.target.style.boxShadow = "0 6px 24px rgba(212,160,23,0.6)"; }}
        onMouseLeave={e => { e.target.style.transform = "scale(1)"; e.target.style.boxShadow = "0 4px 20px rgba(212,160,23,0.4)"; }}
      >
        ✓ CONFIRMER
      </button>
    </div>
  );
}
