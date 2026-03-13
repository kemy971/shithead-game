export default function FinishedScreen({ state, onRestart }) {
  const winner = state.players.find(p => p.id === state.winner);
  const shithead = state.players.find(p => p.id === state.shithead);

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 100, background: "rgba(5,15,8,0.97)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24,
    }}>
      <div style={{ fontSize: 64 }}>🏆</div>
      <div style={{ fontFamily: "'Palatino Linotype',serif", fontSize: 32, color: "#d4a017", letterSpacing: 3 }}>
        {winner?.name} GAGNE !
      </div>
      <div style={{ fontSize: 48 }}>💩</div>
      <div style={{ fontFamily: "'Palatino Linotype',serif", fontSize: 22, color: "#8b4040", letterSpacing: 2 }}>
        {shithead?.name} est le SHITHEAD
      </div>
      <button
        onClick={onRestart}
        style={{
          marginTop: 16, background: "linear-gradient(135deg,#d4a017,#a07010)",
          border: "none", borderRadius: 30, padding: "14px 48px",
          fontSize: 14, fontWeight: 700, color: "#1a0f00", cursor: "pointer",
          letterSpacing: 2, fontFamily: "'Georgia',serif",
          boxShadow: "0 4px 20px rgba(212,160,23,0.4)",
        }}
      >
        REJOUER
      </button>
    </div>
  );
}
