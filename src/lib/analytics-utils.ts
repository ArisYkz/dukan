export function interpolateHsl(low: string, high: string, t: number): string {
  const parse = (s: string) => {
    const [h, sat, l] = s.split(" ").map(Number);
    return { h, s: sat, l };
  };
  const lv = parse(low);
  const hv = parse(high);
  const h = lv.h + (hv.h - lv.h) * t;
  const s = lv.s + (hv.s - lv.s) * t;
  const l = lv.l + (hv.l - lv.l) * t;
  return `hsl(${h.toFixed(1)},${s.toFixed(1)}%,${l.toFixed(1)}%)`;
}
