import { useState } from "react";

const btnBase = {
  borderRadius: 30, padding: "12px 32px", fontSize: 14, fontWeight: 700,
  cursor: "pointer", letterSpacing: 2, fontFamily: "'Georgia',serif",
  border: "none", transition: "all 0.2s", minHeight: 44, minWidth: 44,
};

const inputStyle = {
  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 12, padding: "10px 16px", fontSize: 15, color: "#fff",
  fontFamily: "'Georgia',serif", outline: "none", width: "100%", boxSizing: "border-box",
  minHeight: 44,
};

export default function OnlineLobby({
  roomId, roomStatus, roomPlayers, maxPlayers, isHost, error,
  onCreateRoom, onJoinRoom, onStartGame, onLeaveRoom,
}) {
  const [pseudo, setPseudo]   = useState("");
  const [code, setCode]       = useState("");
  const [view, setView]       = useState("home"); // "home"|"create"|"join"|"waiting"
  const [max, setMax]         = useState(2);

  const inLobby = roomStatus === "waiting";

  // ── Copy room code ────────────────────────────────────────────────────────
  const copyCode = () => {
    if (roomId) navigator.clipboard?.writeText(roomId).catch(() => {});
  };

  // ── Waiting room ──────────────────────────────────────────────────────────
  if (inLobby && roomId) {
    const players = Object.values(roomPlayers).sort((a, b) => a.slot - b.slot);
    const canStart = isHost && players.length >= 2;

    return (
      <div style={overlay}>
        <div style={card}>
          <div style={title}>SALLE D'ATTENTE</div>
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 3, marginBottom: 6 }}>CODE DE SALLE</div>
            <div
              onClick={copyCode}
              style={{
                display: "inline-block", background: "rgba(212,160,23,0.12)",
                border: "1px solid rgba(212,160,23,0.4)", borderRadius: 12,
                padding: "10px 24px", fontSize: 28, fontWeight: 700, color: "#d4a017",
                letterSpacing: 6, cursor: "pointer", userSelect: "all",
              }}
              title="Cliquer pour copier"
            >
              {roomId}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 4 }}>Cliquez pour copier</div>
          </div>

          <div style={{ width: "100%", marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 3, marginBottom: 8 }}>
              JOUEURS ({players.length}/{maxPlayers})
            </div>
            {Array.from({ length: maxPlayers }).map((_, i) => {
              const p = players[i];
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: p ? "rgba(126,200,160,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${p ? "rgba(126,200,160,0.2)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 10, padding: "10px 14px", marginBottom: 6,
                }}>
                  <div style={{ fontSize: 14, color: p ? "#7ec8a0" : "rgba(255,255,255,0.2)", flex: 1 }}>
                    {p ? p.name : "En attente..."}
                  </div>
                  {p && i === 0 && <div style={{ fontSize: 11, color: "#d4a017", letterSpacing: 2 }}>HÔTE</div>}
                </div>
              );
            })}
          </div>

          {error && <div style={errStyle}>{error}</div>}

          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
            {isHost && (
              <button
                onClick={onStartGame}
                disabled={!canStart}
                style={{
                  ...btnBase,
                  background: canStart ? "linear-gradient(135deg,#d4a017,#a07010)" : "rgba(255,255,255,0.05)",
                  color: canStart ? "#1a0f00" : "rgba(255,255,255,0.2)",
                  cursor: canStart ? "pointer" : "not-allowed",
                  boxShadow: canStart ? "0 4px 16px rgba(212,160,23,0.3)" : "none",
                }}
              >
                DÉMARRER
              </button>
            )}
            {!isHost && (
              <div style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.3)", letterSpacing: 2 }}>
                En attente de l'hôte...
              </div>
            )}
            <button
              onClick={onLeaveRoom}
              style={{ ...btnBase, background: "rgba(200,80,60,0.1)", border: "1px solid rgba(200,80,60,0.3)", color: "#ff9070" }}
            >
              QUITTER
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Create form ───────────────────────────────────────────────────────────
  if (view === "create") {
    return (
      <div style={overlay}>
        <div style={card}>
          <div style={title}>CRÉER UNE SALLE</div>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              style={inputStyle}
              placeholder="Votre pseudo"
              value={pseudo}
              maxLength={16}
              onChange={e => setPseudo(e.target.value)}
              autoFocus
            />
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 3, marginBottom: 8 }}>NOMBRE DE JOUEURS</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[2, 3, 4].map(n => (
                  <button key={n} onClick={() => setMax(n)} style={{
                    ...btnBase, flex: 1, padding: "10px 0",
                    background: max === n ? "rgba(212,160,23,0.2)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${max === n ? "rgba(212,160,23,0.5)" : "rgba(255,255,255,0.08)"}`,
                    color: max === n ? "#d4a017" : "rgba(255,255,255,0.4)",
                  }}>{n}</button>
                ))}
              </div>
            </div>
          </div>
          {error && <div style={errStyle}>{error}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
            <button
              onClick={() => pseudo.trim() && onCreateRoom(pseudo.trim(), max)}
              disabled={!pseudo.trim()}
              style={{
                ...btnBase,
                background: pseudo.trim() ? "linear-gradient(135deg,#d4a017,#a07010)" : "rgba(255,255,255,0.05)",
                color: pseudo.trim() ? "#1a0f00" : "rgba(255,255,255,0.2)",
                cursor: pseudo.trim() ? "pointer" : "not-allowed",
              }}
            >
              CRÉER
            </button>
            <button onClick={() => setView("home")} style={{ ...btnBase, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>
              RETOUR
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Join form ─────────────────────────────────────────────────────────────
  if (view === "join") {
    return (
      <div style={overlay}>
        <div style={card}>
          <div style={title}>REJOINDRE</div>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              style={inputStyle}
              placeholder="Votre pseudo"
              value={pseudo}
              maxLength={16}
              onChange={e => setPseudo(e.target.value)}
              autoFocus
            />
            <input
              style={{ ...inputStyle, textTransform: "uppercase", letterSpacing: 4, fontSize: 18 }}
              placeholder="CODE DE SALLE"
              value={code}
              maxLength={6}
              inputMode="text"
              autoCapitalize="characters"
              onChange={e => setCode(e.target.value.toUpperCase())}
            />
          </div>
          {error && <div style={errStyle}>{error}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
            <button
              onClick={() => pseudo.trim() && code.length === 6 && onJoinRoom(pseudo.trim(), code)}
              disabled={!pseudo.trim() || code.length !== 6}
              style={{
                ...btnBase,
                background: pseudo.trim() && code.length === 6 ? "linear-gradient(135deg,#7ec8a0,#3a8a60)" : "rgba(255,255,255,0.05)",
                color: pseudo.trim() && code.length === 6 ? "#031a0a" : "rgba(255,255,255,0.2)",
                cursor: pseudo.trim() && code.length === 6 ? "pointer" : "not-allowed",
              }}
            >
              REJOINDRE
            </button>
            <button onClick={() => setView("home")} style={{ ...btnBase, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>
              RETOUR
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Home ──────────────────────────────────────────────────────────────────
  return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ fontSize: 48, marginBottom: 4 }}>🌐</div>
        <div style={title}>MULTIJOUEUR</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginBottom: 8 }}>Jouez avec vos amis en ligne</div>
        {error && <div style={errStyle}>{error}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
          <button
            onClick={() => setView("create")}
            style={{ ...btnBase, background: "linear-gradient(135deg,#d4a017,#a07010)", color: "#1a0f00", boxShadow: "0 4px 16px rgba(212,160,23,0.3)" }}
          >
            CRÉER UNE SALLE
          </button>
          <button
            onClick={() => setView("join")}
            style={{ ...btnBase, background: "rgba(126,200,160,0.1)", border: "1px solid rgba(126,200,160,0.3)", color: "#7ec8a0" }}
          >
            REJOINDRE
          </button>
          <button
            onClick={onLeaveRoom}
            style={{ ...btnBase, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
          >
            RETOUR AU MENU
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay = {
  minHeight: "100vh",
  background: "linear-gradient(160deg,#0a1a0d,#050e06)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "'Georgia',serif", padding: 16,
};

const card = {
  background: "rgba(15,40,15,0.95)",
  border: "1px solid rgba(212,160,23,0.2)",
  borderRadius: 20, padding: "32px 28px",
  display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
  width: "100%", maxWidth: 380,
  boxShadow: "0 0 60px rgba(0,0,0,0.6)",
};

const title = {
  fontFamily: "'Palatino Linotype','Book Antiqua',serif",
  fontSize: 24, color: "#d4a017", letterSpacing: 4,
};

const errStyle = {
  background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.3)",
  borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#ff9070",
  width: "100%", boxSizing: "border-box", textAlign: "center",
};
