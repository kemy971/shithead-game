import { useState, useEffect, useRef } from "react";
import PlayingCard from "./PlayingCard";
import { cardRotation, cardOffset } from "../utils";

export default function DiscardPile({ discard, effectiveValue, mustPlayLower }) {
  const prevRef = useRef(discard.length);
  const [landingId, setLandingId] = useState(null);
  const [burned, setBurned] = useState(false);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev > 0 && discard.length === 0) {
      setBurned(true);
      setTimeout(() => setBurned(false), 450);
    }
    if (discard.length > prev && discard.length > 0) {
      const top = discard[discard.length - 1];
      setLandingId(top.id);
      setTimeout(() => setLandingId(null), 440);
    }
    prevRef.current = discard.length;
  }, [discard]);

  const visible = discard.slice(-7);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,0.35)", fontFamily: "'Georgia',serif", textTransform: "uppercase" }}>
        Talon {discard.length > 0 && <span style={{ color: "rgba(255,255,255,0.2)" }}>({discard.length})</span>}
      </div>

      <div style={{ position: "relative", width: 70, height: 98, animation: burned ? "burnFlash 0.45s ease-out" : "none" }}>
        {discard.length === 0
          ? <div style={{ width: 70, height: 98, borderRadius: 8, border: "2px dashed rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.15)", fontSize: 11 }}>vide</div>
          : visible.map((c, i) => {
            const isTop = i === visible.length - 1;
            const rot = cardRotation(c.id);
            const off = cardOffset(c.id);
            const isLanding = c.id === landingId;
            return (
              <div
                key={c.id}
                style={{
                  position: "absolute", top: off.y, left: off.x, zIndex: i,
                  opacity: isTop ? 1 : Math.max(0.5, 0.5 + i * 0.08),
                  filter: isTop ? "none" : `brightness(${0.62 + i * 0.06})`,
                  ["--rot"]: `${rot}deg`,
                  transform: `rotate(${rot}deg)`,
                  animation: isLanding ? "landCard 0.4s cubic-bezier(0.22,1,0.36,1) forwards" : "none",
                  boxShadow: isTop ? "0 6px 20px rgba(0,0,0,0.6)" : "none",
                }}
              >
                <PlayingCard card={c} disabled />
              </div>
            );
          })
        }
      </div>

      {effectiveValue && (
        <div style={{
          background: mustPlayLower ? "rgba(220,80,40,0.3)" : "rgba(0,0,0,0.3)",
          border: `1px solid ${mustPlayLower ? "#e05020" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 12, padding: "3px 10px", fontSize: 11,
          color: mustPlayLower ? "#ff9070" : "rgba(255,255,255,0.5)",
          fontFamily: "'Georgia',serif",
        }}>
          {mustPlayLower ? "Joue ≤ 7" : `Joue ≥ ${effectiveValue}`}
        </div>
      )}
    </div>
  );
}
