export const SUITS = ["♠", "♥", "♦", "♣"];
export const VALUES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
export const SPECIAL_INFO = {
  "2": "Reset",
  "3": "Transparent",
  "7": "≤7",
  "10": "Burn 🔥",
  "🃏": "Inverse ↺",
};

export function cardNumericValue(v) {
  const o = { "🃏": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14 };
  return o[v] ?? 0;
}

export function isRed(s) {
  return s === "♥" || s === "♦";
}
