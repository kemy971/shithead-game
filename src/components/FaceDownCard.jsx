import { useState } from "react";
import PlayingCard from "./PlayingCard";

export default function FaceDownCard({ card, isPlayable, selected, onClick, disabled }) {
  const [flipping, setFlipping] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    if (!revealed && !flipping) {
      setFlipping(true);
      setTimeout(() => { setRevealed(true); setFlipping(false); }, 260);
    } else if (revealed) {
      onClick && onClick();
    }
  };

  return (
    <div style={{ animation: flipping ? "flipCard 0.5s ease-in-out forwards" : "none", display: "inline-block" }}>
      {revealed
        ? <PlayingCard card={card} selected={selected} onClick={handleClick} disabled={disabled} glow={isPlayable && !selected} />
        : <PlayingCard card={card} facedown selected={selected} onClick={handleClick} disabled={disabled} />}
    </div>
  );
}
