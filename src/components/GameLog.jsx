import { useState, useEffect, useRef } from "react";

export default function GameLog({ log }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [log, open]);

  const lastEntry = log[log.length - 1];
  const prevEntry = useRef(lastEntry);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (lastEntry !== prevEntry.current) {
      prevEntry.current = lastEntry;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1200);
      return () => clearTimeout(t);
    }
  }, [lastEntry]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: flash && !open ? "rgba(212,160,23,0.25)" : "rgba(0,0,0,0.5)",
          border: `1px solid ${flash && !open ? "rgba(212,160,23,0.5)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: open ? "10px 10px 0 0" : 10,
          padding: "6px 14px", fontSize: 11, letterSpacing: 2,
          color: flash && !open ? "#d4a017" : "rgba(255,255,255,0.4)",
          cursor: "pointer", fontFamily: "'Georgia',serif", transition: "all 0.25s",
          display: "flex", alignItems: "center", gap: 7, backdropFilter: "blur(8px)",
        }}
      >
        <span style={{ fontSize: 13 }}>📋</span>JOURNAL
        <span style={{ fontSize: 10, opacity: 0.6, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.25s", display: "inline-block" }}>▲</span>
        {!open && flash && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#d4a017", boxShadow: "0 0 6px #d4a017", display: "inline-block" }} />}
      </button>

      <div style={{ overflow: "hidden", maxHeight: open ? 220 : 0, transition: "max-height 0.3s cubic-bezier(0.4,0,0.2,1)", width: 240 }}>
        <div
          ref={ref}
          style={{
            background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.07)",
            borderTop: "none", borderRadius: "0 0 10px 10px",
            padding: "10px 12px", maxHeight: 200, overflowY: "auto", backdropFilter: "blur(8px)",
          }}
        >
          {log.slice(-14).map((entry, i, arr) => (
            <div
              key={i}
              style={{
                fontSize: 11,
                color: i === arr.length - 1 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)",
                marginBottom: 5, lineHeight: 1.4, fontFamily: "'Georgia',serif",
              }}
            >
              {entry}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
