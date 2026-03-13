import { useState, useEffect } from "react";
import PlayingCard from "./PlayingCard";

export default function DealScreen({ playerCount, onDone }) {
  const [step, setStep] = useState(0);
  const total = playerCount * 9;

  useEffect(() => {
    if (step >= total) {
      const t = setTimeout(onDone, 300);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep(s => s + 1), 55);
    return () => clearTimeout(t);
  }, [step, total, onDone]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 40%,#0d2e12,#061008 60%,#030806)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 24,
    }}>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", letterSpacing: 4, fontFamily: "'Georgia',serif" }}>
        DISTRIBUTION DES CARTES
      </div>
      <div style={{ position: "relative", width: 200, height: 200 }}>
        {Array.from({ length: step }).map((_, i) => {
          const angle = (i / total) * 360;
          const r = 55 + (i % 9) * 12;
          const x = Math.cos((angle * Math.PI) / 180) * r;
          const y = Math.sin((angle * Math.PI) / 180) * r * 0.65;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `calc(50% + ${x}px - 35px)`,
                top: `calc(50% + ${y}px - 49px)`,
                animation: `dealCard 0.32s cubic-bezier(0.22,1,0.36,1) ${i * 45}ms both`,
              }}
            >
              <PlayingCard card={{ suit: null, value: "" }} facedown />
            </div>
          );
        })}
      </div>
    </div>
  );
}
