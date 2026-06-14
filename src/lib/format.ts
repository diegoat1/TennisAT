import { LADDER } from "../data/classifications";

const MONTHS = [
  "gen", "feb", "mar", "apr", "mag", "giu",
  "lug", "ago", "set", "ott", "nov", "dic",
];

/** "2026-07-11" -> "11 lug 2026". */
export function fmtDate(iso: string): string {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  const mi = Number(m) - 1;
  return `${Number(d)} ${MONTHS[mi] ?? m} ${y}`;
}

/** Intervallo date "11-20 lug 2026" o "27 giu - 5 lug 2026". */
export function fmtRange(start: string, end: string): string {
  if (!start) return "-";
  if (!end || start === end) return fmtDate(start);
  const [ys, ms, ds] = start.split("-");
  const [ye, me, de] = end.split("-");
  if (ys === ye && ms === me) {
    return `${Number(ds)}-${Number(de)} ${MONTHS[Number(ms) - 1]} ${ys}`;
  }
  if (ys === ye) {
    return `${Number(ds)} ${MONTHS[Number(ms) - 1]} - ${Number(de)} ${MONTHS[Number(me) - 1]} ${ys}`;
  }
  return `${fmtDate(start)} - ${fmtDate(end)}`;
}

export function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

/** Opzioni di classifica per i menu a tendina. */
export const CLASS_OPTIONS = LADDER;
