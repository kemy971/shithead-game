export default function RulesModal({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "linear-gradient(160deg,#0d2410,#061008)",
          border: "1px solid rgba(212,160,23,0.25)",
          borderRadius: 20, padding: "28px 28px 24px",
          width: "100%", maxWidth: 480,
          maxHeight: "85vh", overflowY: "auto",
          fontFamily: "'Georgia',serif",
          boxShadow: "0 0 80px rgba(0,0,0,0.8)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontFamily: "'Palatino Linotype',serif", fontSize: 22, color: "#d4a017", letterSpacing: 3 }}>
            RÈGLES DU JEU
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 20, width: 36, height: 36, color: "rgba(255,255,255,0.5)",
              cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
        </div>

        <Section title="Mise en place">
          Chaque joueur reçoit <b>3 cartes face cachée</b>, <b>3 face visible</b> et <b>3 en main</b>.<br />
          Avant la partie, échangez librement vos cartes de main avec vos cartes face visible.
        </Section>

        <Section title="Déroulement">
          On joue ses cartes dans l'ordre :<br />
          <b>Main → Face visible → Face cachée</b> (aveugle)<br /><br />
          Pour jouer, posez une carte de <b>valeur ≥</b> à la valeur effective du talon.<br />
          Vous pouvez jouer plusieurs cartes de même valeur en même temps.
        </Section>

        <Section title="Cartes spéciales">
          <Row icon="2">Jouable sur tout — remet le seuil à 2</Row>
          <Row icon="3">Transparent — la valeur effective ne change pas</Row>
          <Row icon="7">Le joueur suivant doit jouer ≤ 7</Row>
          <Row icon="10">Brûle le talon 🔥 — rejoue</Row>
          <Row icon="🃏">Joker — inverse le sens du jeu</Row>
        </Section>

        <Section title="Règles spéciales">
          <b>4 cartes identiques d'affilée</b> sur le talon = talon brûlé automatiquement 🔥<br /><br />
          <b>Impossible de jouer ?</b> Ramassez tout le talon dans votre main.
        </Section>

        <Section title="Fin de partie" last>
          Le dernier joueur encore avec des cartes est le <b>💩 SHITHEAD</b>.
        </Section>

        <button
          onClick={onClose}
          style={{
            marginTop: 8, width: "100%",
            background: "linear-gradient(135deg,#d4a017,#a07010)", border: "none",
            borderRadius: 30, padding: "12px 0", fontSize: 13, fontWeight: 700,
            color: "#1a0f00", cursor: "pointer", letterSpacing: 2,
          }}
        >
          COMPRIS !
        </button>
      </div>
    </div>
  );
}

function Section({ title, children, last }) {
  return (
    <div style={{ marginBottom: last ? 20 : 16 }}>
      <div style={{ fontSize: 11, color: "#d4a017", letterSpacing: 2, marginBottom: 6 }}>
        {title.toUpperCase()}
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ icon, children }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 4 }}>
      <div style={{
        background: "rgba(212,160,23,0.12)", border: "1px solid rgba(212,160,23,0.25)",
        borderRadius: 6, padding: "1px 6px", fontSize: 12, fontWeight: 700,
        color: "#d4a017", flexShrink: 0, minWidth: 28, textAlign: "center",
      }}>
        {icon}
      </div>
      <div>{children}</div>
    </div>
  );
}
