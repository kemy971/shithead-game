import { isRed, SPECIAL_INFO } from "../game/constants";

export default function PlayingCard({ card, selected, onClick, onDoubleClick, disabled, hidden, small, facedown, glow, dealIdx }) {
  const dealAnim = dealIdx !== undefined
    ? { animation: `dealCard 0.38s cubic-bezier(0.22,1,0.36,1) ${dealIdx * 65}ms both` }
    : {};

  if (hidden || facedown) {
    return (
      <div
        onClick={disabled ? undefined : onClick}
        style={{
          width: small ? 44 : 70, height: small ? 62 : 98, borderRadius: 8,
          background: "linear-gradient(135deg,#6b1a1a,#3d0f0f 50%,#6b1a1a)",
          border: "2px solid #8b3030", cursor: disabled ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)", position: "relative",
          overflow: "hidden", flexShrink: 0, ...dealAnim,
        }}
      >
        <div style={{
          position: "absolute", inset: 4, border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 5,
          backgroundImage: "repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(255,255,255,0.03) 4px,rgba(255,255,255,0.03) 5px)",
        }} />
        <span style={{ fontSize: small ? 14 : 20, opacity: 0.4 }}>🂠</span>
      </div>
    );
  }

  const red = card.value === "🃏" ? false : isRed(card.suit);
  const special = SPECIAL_INFO[card.value];

  return (
    <div
      onClick={disabled ? undefined : onClick}
      onDoubleClick={disabled ? undefined : onDoubleClick}
      style={{
        width: small ? 44 : 70, height: small ? 62 : 98, borderRadius: 8,
        background: selected ? "linear-gradient(135deg,#fffde0,#fff9c4)" : "linear-gradient(160deg,#fffff8,#f5f0e8)",
        border: selected ? "2.5px solid #d4a017" : "2px solid #c8bfa8",
        cursor: disabled ? "default" : "pointer",
        transform: selected ? "translateY(-12px) scale(1.05)" : "translateY(0)",
        transition: "all 0.18s cubic-bezier(0.34,1.56,0.64,1)",
        boxShadow: selected
          ? "0 12px 28px rgba(212,160,23,0.5),0 2px 6px rgba(0,0,0,0.3)"
          : glow
          ? "0 0 16px rgba(100,220,100,0.6),0 3px 10px rgba(0,0,0,0.4)"
          : "0 3px 10px rgba(0,0,0,0.4)",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: small ? "3px 4px" : "5px 7px",
        position: "relative", flexShrink: 0, userSelect: "none", ...dealAnim,
      }}
    >
      <div style={{ fontSize: small ? 11 : 14, fontWeight: 700, lineHeight: 1, color: red ? "#c0392b" : "#1a1a2e", fontFamily: "'Georgia',serif" }}>
        {card.value}{card.suit && <span style={{ fontSize: small ? 9 : 11 }}>{card.suit}</span>}
      </div>
      <div style={{ textAlign: "center", fontSize: small ? 16 : 26, lineHeight: 1, color: red ? "#c0392b" : "#1a1a2e" }}>
        {card.value === "🃏" ? "🃏" : card.suit}
      </div>
      <div style={{ fontSize: small ? 11 : 14, fontWeight: 700, lineHeight: 1, transform: "rotate(180deg)", color: red ? "#c0392b" : "#1a1a2e", fontFamily: "'Georgia',serif" }}>
        {card.value}{card.suit && <span style={{ fontSize: small ? 9 : 11 }}>{card.suit}</span>}
      </div>
      {special && !small && (
        <div style={{
          position: "absolute", bottom: 3, right: 4, fontSize: 8,
          color: "#8b6914", fontWeight: 700, background: "rgba(255,215,0,0.25)",
          borderRadius: 3, padding: "1px 3px", letterSpacing: 0.3,
        }}>
          {special}
        </div>
      )}
    </div>
  );
}
