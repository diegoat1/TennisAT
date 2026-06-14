import type { Match, PlayerProfile } from "../types";
import { category, classLabel, pointsForWin, rung } from "../data/classifications";

export interface HistoryStats {
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  /** Stima dei punti FITP dalle vittorie (somma dei coefficienti). Indicativa. */
  estimatedPoints: number;
  /** Miglior vittoria (avversario di classifica piu alta battuto). */
  bestWin?: Match;
  /** Record per categoria di avversario. */
  byOpponentClass: { cls: string; label: string; wins: number; losses: number }[];
  /** Ultimi risultati (piu recenti prima), es. ["V","V","S",...]. */
  form: ("V" | "S")[];
  /** Sconfitte contro pari o inferiori (segnale di partite "buttate"). */
  lossesVsLowerOrEqual: number;
}

/** Calcola le statistiche dello storico partite per un giocatore. */
export function computeStats(profile: PlayerProfile, matches: Match[]): HistoryStats {
  const sorted = [...matches].sort((a, b) => b.date.localeCompare(a.date));
  const wins = sorted.filter((m) => m.result === "V");
  const losses = sorted.filter((m) => m.result === "S");

  let estimatedPoints = 0;
  for (const m of wins) estimatedPoints += pointsForWin(m.opponentClass, profile.classification);

  let bestWin: Match | undefined;
  for (const m of wins) {
    if (!bestWin || rung(m.opponentClass) > rung(bestWin.opponentClass)) bestWin = m;
  }

  const byMap = new Map<string, { wins: number; losses: number }>();
  for (const m of sorted) {
    const k = m.opponentClass;
    const cur = byMap.get(k) ?? { wins: 0, losses: 0 };
    if (m.result === "V") cur.wins++;
    else cur.losses++;
    byMap.set(k, cur);
  }
  const byOpponentClass = [...byMap.entries()]
    .map(([cls, v]) => ({ cls, label: classLabel(cls), ...v }))
    .sort((a, b) => rung(b.cls) - rung(a.cls));

  const pRung = rung(profile.classification);
  const lossesVsLowerOrEqual = losses.filter((m) => rung(m.opponentClass) <= pRung).length;

  return {
    total: sorted.length,
    wins: wins.length,
    losses: losses.length,
    winRate: sorted.length ? wins.length / sorted.length : 0,
    estimatedPoints,
    bestWin,
    byOpponentClass,
    form: sorted.slice(0, 8).map((m) => m.result),
    lossesVsLowerOrEqual,
  };
}

/** Categoria principale del giocatore (per badge/colori). */
export function playerCategory(profile: PlayerProfile): number {
  return category(profile.classification);
}
