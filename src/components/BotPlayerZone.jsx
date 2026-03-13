import PlayingCard from "./PlayingCard";

export default function BotPlayerZone({ player, isActive, position }) {
  const isLeft = position === "left", isRight = position === "right";
  const rotate = isLeft ? -90 : isRight ? 90 : 0;
  const total = player.handCards.length + player.faceUpCards.length + player.faceDownCards.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transform: `rotate(${rotate}deg)` }}>
      <div style={{
        background: isActive ? "rgba(212,160,23,0.25)" : "rgba(0,0,0,0.4)",
        border: `1px solid ${isActive ? "#d4a017" : "rgba(255,255,255,0.1)"}`,
        borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700,
        color: isActive ? "#d4a017" : "rgba(255,255,255,0.5)",
        fontFamily: "'Georgia',serif", letterSpacing: 1, whiteSpace: "nowrap",
        transition: "all 0.3s",
        boxShadow: isActive ? "0 0 12px rgba(212,160,23,0.3)" : "none",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        {isActive && <span>▶</span>}{player.name}{player.isShithead && " 💩"}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        {player.handCards.length > 0 && (
          <div style={{
            background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8, padding: "4px 8px", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 2, minWidth: 36, alignSelf: "center",
          }}>
            <span style={{ fontSize: 14 }}>🂠</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", fontFamily: "'Georgia',serif" }}>
              ×{player.handCards.length}
            </span>
          </div>
        )}

        {(player.faceUpCards.length > 0 || player.faceDownCards.length > 0) && (
          <div style={{ display: "flex", gap: 4 }}>
            {Array.from({ length: Math.max(player.faceUpCards.length, player.faceDownCards.length) }).map((_, i) => {
              const fu = player.faceUpCards[i], fd = player.faceDownCards[i];
              return (
                <div key={i} style={{ position: "relative", width: 44, height: 68 }}>
                  {fd && <div style={{ position: "absolute", top: 6, left: 0, zIndex: 1 }}><PlayingCard card={fd} facedown small disabled /></div>}
                  {fu && <div style={{ position: "absolute", top: 0, left: 0, zIndex: 2 }}><PlayingCard card={fu} small disabled /></div>}
                  {!fu && fd && <div style={{ position: "absolute", top: 0, left: 0, zIndex: 2 }}><PlayingCard card={fd} facedown small disabled /></div>}
                </div>
              );
            })}
          </div>
        )}

        {total === 0 && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "'Georgia',serif", alignSelf: "center" }}>—</div>
        )}
      </div>
    </div>
  );
}
