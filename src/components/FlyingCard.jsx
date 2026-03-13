import { useRef, useLayoutEffect } from "react";
import PlayingCard from "./PlayingCard";
import { cardRotation } from "../utils";

export default function FlyingCard({ card, fromRect, toRect, onDone }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (!ref.current || !fromRect || !toRect) { setTimeout(onDone, 10); return; }
    const el = ref.current;
    const tx = toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2);
    const ty = toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2);
    const rot = cardRotation(card.id);
    el.style.setProperty("--tx", `${tx}px`);
    el.style.setProperty("--ty", `${ty}px`);
    el.style.setProperty("--rot", `${rot}deg`);
    el.style.animation = "slideToDiscard 0.44s cubic-bezier(0.4,0,0.2,1) forwards";
    const t = setTimeout(onDone, 440);
    return () => clearTimeout(t);
  }, []);

  if (!fromRect) return null;

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: fromRect.left, top: fromRect.top,
        width: fromRect.width, height: fromRect.height,
        zIndex: 600, pointerEvents: "none",
      }}
    >
      <PlayingCard card={card} disabled />
    </div>
  );
}
