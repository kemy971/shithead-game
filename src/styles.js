const CSS = `
@keyframes dealCard {
  from { opacity:0; transform:translateY(-80px) scale(0.6) rotate(-10deg); }
  to   { opacity:1; transform:translateY(0)     scale(1)   rotate(0deg);   }
}
@keyframes slideToDiscard {
  0%   { opacity:1; transform:translate(0,0) scale(1) rotate(0deg); }
  45%  { opacity:1; transform:translate(var(--tx),var(--ty)) scale(1.1) rotate(var(--rot)); }
  100% { opacity:0; transform:translate(var(--tx),var(--ty)) scale(0.95) rotate(var(--rot)); }
}
@keyframes landCard {
  0%   { transform:rotate(var(--rot)) translateY(-14px) scale(1.12); }
  100% { transform:rotate(var(--rot)) translateY(0)     scale(1);    }
}
@keyframes flipCard {
  0%   { transform:rotateY(0deg);    }
  49%  { transform:rotateY(90deg);   }
  51%  { transform:rotateY(-90deg);  }
  100% { transform:rotateY(0deg);    }
}
@keyframes burnFlash {
  0%,100% { opacity:1; }
  40%      { opacity:0.1; box-shadow:0 0 40px rgba(255,80,0,0.9); }
}
`;

if (typeof document !== "undefined" && !document.getElementById("sh-css")) {
  const s = document.createElement("style");
  s.id = "sh-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}
