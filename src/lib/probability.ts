import type { Classification } from "../types";
import { rung } from "../data/classifications";

// Modello logistico della probabilita di vittoria in funzione della differenza
// di gradini fra giocatore e avversario. A parita di classifica -> 50%.
// k controlla quanto pesa ogni gradino di differenza.
const K = 0.62;

/**
 * Probabilita che il giocatore batta un avversario.
 * diff = gradino(avversario) - gradino(giocatore); >0 = avversario piu forte.
 */
export function winProbability(player: Classification, opponent: Classification): number {
  const diff = rung(opponent) - rung(player);
  return 1 / (1 + Math.exp(K * diff));
}

/** Probabilita di vittoria dato direttamente il delta di gradini. */
export function winProbabilityByDelta(delta: number): number {
  return 1 / (1 + Math.exp(K * delta));
}
