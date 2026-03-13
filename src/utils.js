export function cardRotation(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  return ((h % 1400) / 100) - 7;
}

export function cardOffset(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 17 + id.charCodeAt(i)) & 0xffffffff;
  return { x: ((h % 1200) / 100) - 6, y: (((h >> 8) % 1000) / 100) - 5 };
}
