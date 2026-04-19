export const CONTEXT_COLORS = [
  '#FF4757', // 1: red
  '#2ED573', // 2: green
  '#1E90FF', // 3: blue
  '#FFA502', // 4: orange
  '#A855F7', // 5: purple
  '#FF6EB4', // 6: pink
  '#00D2D3', // 7: cyan
  '#ECCC68', // 8: yellow
];

export function getContextColor(contextId: number): string {
  return CONTEXT_COLORS[(contextId - 1) % 8];
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export function colorAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
