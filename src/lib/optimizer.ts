import type {
  OptimizerSettings,
  PlayerProfile,
  RoundProjection,
  Tournament,
  TournamentEvaluation,
} from "../types";
import {
  LADDER,
  category,
  nextClass,
  nextThreshold,
  rung,
} from "../data/classifications";
import { winProbabilityByDelta } from "./probability";
import { distanceFromHome } from "./geo";

// Tabella del valore di un incontro vinto, in funzione del delta di gradini
// (avversario - giocatore). Stessi valori del coefficiente FITP.
function pointsForWinDelta(delta: number): number {
  if (delta >= 2) return 120;
  if (delta === 1) return 90;
  if (delta === 0) return 60;
  if (delta === -1) return 30;
  if (delta === -2) return 20;
  if (delta === -3) return 15;
  return 0;
}

/** Numero di turni del tabellone in base al grado del torneo. */
function roundsForTournament(t: Tournament): number {
  const g = (t.grade ?? "").toLowerCase();
  if (g.includes("rodeo")) return 4; // tabelloni rapidi, ~16
  if (g.includes("super")) return 6; // ~64
  return 5; // Open standard ~32
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Proietta il percorso del giocatore nel tabellone: per ogni turno stima la
 * classifica tipica dell'avversario, la probabilita di vincere quel turno e
 * i punti che ne deriverebbero.
 */
function projectRounds(player: PlayerProfile, t: Tournament): RoundProjection[] {
  const R = roundsForTournament(t);
  const playerRung = rung(player.classification);
  const limitRung = clamp(rung(t.limit), 0, LADDER.length - 1);
  // L'avversario del primo turno e di norma intorno o sotto il giocatore;
  // salendo nel tabellone ci si avvicina al limite (i piu forti del field).
  const lowBaseline = clamp(Math.min(playerRung, limitRung) - 1, 0, limitRung);

  const labels = roundLabels(R);
  let reachProb = 1; // prob. di arrivare a giocare il turno corrente
  const rounds: RoundProjection[] = [];

  for (let r = 1; r <= R; r++) {
    const frac = R === 1 ? 1 : (r - 1) / (R - 1);
    const oppRung = Math.round(lowBaseline + (limitRung - lowBaseline) * frac);
    const delta = oppRung - playerRung;
    const matchWin = winProbabilityByDelta(delta);
    const winChance = reachProb * matchWin; // prob. di vincere proprio questo turno
    rounds.push({
      label: labels[r - 1],
      opponentClass: LADDER[clamp(oppRung, 0, LADDER.length - 1)],
      winChance,
      pointsIfWin: pointsForWinDelta(delta),
    });
    reachProb = winChance; // per vincere il prossimo turno bisogna aver vinto questo
  }
  return rounds;
}

function roundLabels(R: number): string[] {
  const tail = ["F", "SF", "QF", "Ottavi", "Sedicesimi", "Trentaduesimi"];
  const out: string[] = [];
  for (let i = R; i >= 1; i--) out.push(tail[i - 1] ?? `Turno ${i}`);
  return out;
}

/** Valuta un singolo torneo per uno specifico giocatore. */
export function evaluateTournament(
  player: PlayerProfile,
  t: Tournament,
  settings: OptimizerSettings,
): TournamentEvaluation {
  const playerRung = rung(player.classification);
  const limitRung = rung(t.limit);
  const minRung = t.minLimit ? rung(t.minLimit) : 0;
  const eligible = playerRung <= limitRung && playerRung >= minRung;

  const rounds = projectRounds(player, t);
  const expectedPoints = rounds.reduce((s, r) => s + r.winChance * r.pointsIfWin, 0);
  const expectedWins = rounds.reduce((s, r) => s + r.winChance, 0);
  const winProbability = rounds.length ? rounds[rounds.length - 1].winChance : 0;
  // Piccolo bonus atteso per il titolo (vittorie supplementari da torneo vinto).
  const titleBonus = winProbability * 30;
  const totalExpected = expectedPoints + titleBonus;

  const distanceKm = distanceFromHome(player.homeCity, t);
  const travelPenalty = distanceKm * settings.travelWeight;
  const score = (eligible ? totalExpected : -1000) - travelPenalty;

  const threshold = nextThreshold(player.classification);
  const remaining = threshold != null ? Math.max(1, threshold - player.points) : null;
  const promotionProgress = remaining ? totalExpected / remaining : 0;

  const reasons = buildReasons(player, t, {
    eligible,
    expectedWins,
    winProbability,
    totalExpected,
    distanceKm,
    promotionProgress,
    limitRung,
    playerRung,
  });

  return {
    tournament: t,
    expectedPoints: round1(totalExpected),
    winProbability,
    expectedWins: round1(expectedWins),
    distanceKm,
    travelPenalty: round1(travelPenalty),
    score: round1(score),
    promotionProgress,
    reasons,
    rounds,
    eligible,
  };
}

function buildReasons(
  player: PlayerProfile,
  t: Tournament,
  ctx: {
    eligible: boolean;
    expectedWins: number;
    winProbability: number;
    totalExpected: number;
    distanceKm: number;
    promotionProgress: number;
    limitRung: number;
    playerRung: number;
  },
): string[] {
  const r: string[] = [];
  if (!ctx.eligible) {
    if (ctx.playerRung > ctx.limitRung) {
      r.push(`Non ammesso: la tua classifica e superiore al limite del tabellone (${t.limit}).`);
    } else {
      r.push(`Non ammesso: tabellone riservato a classifiche piu alte (min ${t.minLimit}).`);
    }
    return r;
  }
  r.push(
    `Tabellone alla tua portata: ~${ctx.expectedWins.toFixed(1)} vittorie attese e ${(ctx.winProbability * 100).toFixed(0)}% di vincere il torneo.`,
  );
  const gap = ctx.limitRung - ctx.playerRung;
  if (gap >= 2) {
    r.push(
      `Ci sono avversari fino a ${t.limit}: batterli vale 90-120 punti l'uno (ottimo per salire in fretta).`,
    );
  } else if (gap === 1) {
    r.push(`Presenza di giocatori un gradino sopra di te: vittoria da 90 punti possibile.`);
  } else {
    r.push(`Field a tua misura: punti solidi ma niente grandi colpi (avversari pari o inferiori).`);
  }
  r.push(`Resa attesa: ~${ctx.totalExpected.toFixed(0)} punti FITP.`);
  if (ctx.promotionProgress > 0) {
    r.push(
      `Copre circa il ${(ctx.promotionProgress * 100).toFixed(0)}% dei punti che ti mancano per la promozione.`,
    );
  }
  if (ctx.distanceKm <= 25) r.push(`Vicino a casa (${ctx.distanceKm} km): basso costo di trasferta.`);
  else if (ctx.distanceKm <= 60) r.push(`Distanza media: ${ctx.distanceKm} km da ${player.homeCity}.`);
  else r.push(`Trasferta lunga: ${ctx.distanceKm} km da ${player.homeCity}.`);
  return r;
}

export interface OptimizationResult {
  evaluations: TournamentEvaluation[]; // tutti, ordinati per convenienza
  plan: TournamentEvaluation[]; // calendario ottimale senza sovrapposizioni
  projectedPoints: number; // punti attesi sommando il piano
  startingPoints: number;
  threshold: number | null;
  nextCategory: string | null;
  reachesPromotion: boolean;
}

/**
 * Valuta tutti i tornei e costruisce il calendario ottimale: seleziona in modo
 * greedy i tornei piu convenienti che non si sovrappongono nelle date, fino a
 * raggiungere la soglia della prossima promozione o l'orizzonte temporale.
 */
export function optimize(
  player: PlayerProfile,
  tournaments: Tournament[],
  settings: OptimizerSettings,
): OptimizationResult {
  const today = new Date().toISOString().slice(0, 10);
  const evaluations = tournaments
    .filter((t) => t.startDate >= today && t.startDate <= settings.horizonDate)
    .filter((t) => (settings.matchGender ? t.gender === player.gender : true))
    .map((t) => evaluateTournament(player, t, settings))
    .filter((e) => e.distanceKm <= settings.maxDistanceKm)
    .sort((a, b) => b.score - a.score);

  const eligibleSorted = evaluations.filter((e) => e.eligible && e.score > 0);

  const threshold = nextThreshold(player.classification);
  const remaining = threshold != null ? threshold - player.points : null;

  const plan: TournamentEvaluation[] = [];
  let projected = player.points;
  for (const e of eligibleSorted) {
    if (overlapsAny(e, plan)) continue;
    plan.push(e);
    projected += e.expectedPoints;
    if (remaining != null && projected >= threshold!) break;
  }
  plan.sort((a, b) => a.tournament.startDate.localeCompare(b.tournament.startDate));

  return {
    evaluations,
    plan,
    projectedPoints: round1(projected),
    startingPoints: player.points,
    threshold,
    nextCategory: nextClass(player.classification),
    reachesPromotion: threshold != null && projected >= threshold,
  };
}

function overlapsAny(e: TournamentEvaluation, plan: TournamentEvaluation[]): boolean {
  return plan.some((p) => datesOverlap(e.tournament, p.tournament));
}

function datesOverlap(a: Tournament, b: Tournament): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Bonus informativo: categoria della classifica (per badge UI). */
export function categoryOf(c: string): number {
  return category(c);
}
